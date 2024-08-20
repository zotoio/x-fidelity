import express from 'express';
import https from 'https';
import fs from 'fs';
import { RuleProperties } from 'json-rules-engine';
import { logger, setLogPrefix } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';
import { ConfigManager } from '../utils/configManager';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { RuleConfig, StartServerParams } from '../types/typeDefs';
import { validateUrlInput, validateTelemetryData } from '../utils/inputValidation';
import { getCachedData, setCachedData, clearCache, getCacheContent, setRuleListCache, getRuleListCache } from './cacheManager';

const SHARED_SECRET = process.env.XFI_SHARED_SECRET;
const maskedSecret = SHARED_SECRET ? `${SHARED_SECRET.substring(0, 4)}****${SHARED_SECRET.substring(SHARED_SECRET.length - 4)}` : 'not set';
logger.info(`Shared secret is ${maskedSecret}`);

const app = express();

// Add security headers
app.use(helmet());

// Create a rate limiter
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 10000 // limit each IP to 10000 requests per windowMs
});

// Apply rate limiter to all routes
app.use(limiter);

const port = options.port || process.env.XFI_LISTEN_PORT || 8888;

// Middleware to check for shared secret
const checkSharedSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientSecret = req.headers['x-shared-secret'];
    if (SHARED_SECRET && clientSecret !== SHARED_SECRET) {
        logger.error(`Unauthorized access attempt with incorrect shared secret: ${maskedSecret}`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

const DEFAULT_TTL = parseInt(options.jsonTTL) * 60 * 1000; // Convert CLI option to milliseconds

app.use(express.json());
app.use(expressLogger);

app.get('/archetypes/:archetype', async (req, res) => {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype)) {
        logger.error(`invalid archetype name: ${archetype}`);
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    const cacheKey = `archetype:${archetype}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.info(`serving cached archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const archetypeConfig = config.archetype;
        logger.debug(`found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);

        if (!validateArchetype(archetypeConfig)) {
            logger.error(`invalid archetype configuration for ${archetype}`);
            return res.status(400).json({ error: 'invalid archetype requested' });
        }

        setCachedData(cacheKey, archetypeConfig);
        logger.info(`serving fresh archetype ${archetype}`);
        res.json(archetypeConfig);
    } catch (error) {
        logger.error(`error fetching archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'internal server error' });
    }
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype)) {
        logger.error(`invalid archetype name: ${archetype}`);
        return res.status(400).json({ error: 'invalid archetype' });
    }
    const cachedRules = getRuleListCache(archetype);
    if (cachedRules) {
        logger.info(`serving cached rule list for archetype: ${archetype}`);
        return res.json(cachedRules);
    }
    const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
    const archetypeConfig = config.archetype;
    if (archetypeConfig && archetypeConfig.rules) {
        const rules = config.rules;
        setRuleListCache(archetype, rules as RuleProperties[], DEFAULT_TTL);
        logger.info(`serving fresh rule list for archetype: ${archetype}`);
        res.json(rules);
    } else {
        logger.error(`archetype ${archetype} not found or has no rules`);
        res.status(404).json({ error: 'archetype not found or has no rules' });
    }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype) || !validateUrlInput(rule)) {
        logger.error(`invalid archetype or rule name: ${archetype}, ${rule}`);
        return res.status(400).json({ error: 'invalid archetype or rule name' });
    }
    const cacheKey = `rule:${archetype}:${rule}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.info(`serving cached rule ${rule} for archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const ruleConfigs: RuleConfig[] = config.rules;
        if (ruleConfigs.length > 0 && config.archetype.rules.includes(rule)) {
            const ruleConf = ruleConfigs.find((r) => r.name === rule);

            if (ruleConf && validateRule(ruleConf)) {
                setCachedData(cacheKey, ruleConf);
                logger.info(`serving fresh rule ${req.params.rule} for archetype ${req.params.archetype}`);
                res.json(ruleConf);
            } else {
                logger.error(`invalid rule configuration for ${rule}`);
                res.status(500).json({ error: 'invalid rule configuration' });
            }
        } else {
            res.status(404).json({ error: 'rule not found' });
        }
    } catch (error) {
        logger.error(`error fetching rule ${rule} for archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'internal server error' });
    }
});

// New route for telemetry
app.post('/telemetry', checkSharedSecret, (req, res) => {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateTelemetryData(req.body)) {
        return res.status(400).json({ error: 'Invalid telemetry data' });
    }
    logger.debug(`accepting telemetry data: ${JSON.stringify(req.body)}`);
    // Here you can process and store the telemetry data as needed
    res.status(200).json({ message: 'telemetry data received successfully' });
});

// New route to clear cache
app.post('/clearcache', checkSharedSecret, (req, res) => {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    clearCache();
    ConfigManager.clearLoadedConfigs();
    res.status(200).json({ message: 'Cache cleared successfully' });
});

// New route to view cache
app.get('/viewcache', checkSharedSecret, (req, res) => {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    logger.info('Viewing cache');
    const cacheContent = {
        ...getCacheContent(),
        loadedConfigs: ConfigManager.getLoadedConfigs()
    };
    res.status(200).json(cacheContent);
});

export function startServer({ customPort, executionLogPrefix }: StartServerParams): any {
    const serverPort = customPort ? parseInt(customPort) : port;
    executionLogPrefix && setLogPrefix(executionLogPrefix);

    // Read SSL certificate and key
    try {
        const certPath = process.env.CERT_PATH || __dirname;
        const privateKey = fs.readFileSync(`${certPath}/private-key.pem`, 'utf8');
        const certificate = fs.readFileSync(`${certPath}/certificate.pem`, 'utf8');
        const credentials = { key: privateKey, cert: certificate };

        // Create HTTPS server
        const httpsServer = https.createServer(credentials, app);

        return httpsServer.listen(serverPort, () => {
            logger.info(`xfidelity server is running on https://localhost:${serverPort}`);
        });

    } catch (error) {
        logger.warn('failed to start server with tls, falling back to http:', error);
        return app.listen(serverPort, () => {
            logger.info(`xfidelity server is running on http://localhost:${serverPort}`);
        });
    }
}
