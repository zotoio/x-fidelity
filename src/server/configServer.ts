import express from 'express';
import https from 'https';
import fs from 'fs';
import { loadRules } from '../rules';
import { RuleProperties } from 'json-rules-engine';
import { logger, setLogPrefix } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';
import { ConfigManager } from '../utils/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';

const app = express();
app.use(helmet());

// Create a rate limiter
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 10000 // limit each IP to 10000 requests per windowMs
});

// Apply rate limiter to all routes
app.use(limiter);

const port = options.port || process.env.XFI_LISTEN_PORT || 8888;

// Simple in-memory cache
const cache: { [key: string]: { data: any; expiry: number } } = {};
const DEFAULT_TTL = parseInt(options.jsonTTL) * 60 * 1000; // Convert CLI option to milliseconds

// Cache for archetype lists and rule lists
const archetypeListCache: { data: string[]; expiry: number } = { data: [], expiry: 0 };
const ruleListCache: { [archetype: string]: { data: RuleProperties[]; expiry: number } } = {};

function getCachedData(key: string): any | null {
    logger.debug(`Checking cache for key: ${key}`);
    const item = cache[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

function setCachedData(key: string, data: any, ttl: number = DEFAULT_TTL): void {
    logger.debug(`Setting cache for key: ${key}`);
    cache[key] = {
        data,
        expiry: Date.now() + ttl
    };
    logger.debug(JSON.stringify(cache));
}

app.use(express.json());
app.use(expressLogger);

const validateInput = (value: string): boolean => {
    return /^[a-zA-Z0-9-_]{1,50}$/.test(value);
}

const validateTelemetryData = (data: any): boolean => {
    return (
        typeof data.eventType === 'string' &&
        typeof data.metadata === 'object' &&
        typeof data.timestamp === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data.timestamp)
    );
}

app.get('/archetypes/:archetype', async (req, res) => {
    logger.info(`serving archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateInput(archetype)) {
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    const cacheKey = `archetype:${archetype}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.debug(`Serving cached archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig, requestLogPrefix);
        const archetypeConfig = configManager.getConfig();
        logger.debug(`Found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);
        
        if (!validateArchetype(archetypeConfig)) {
            logger.error(`Invalid archetype configuration for ${archetype}`);
            return res.status(500).json({ error: 'Invalid archetype configuration' });
        }
        
        setCachedData(cacheKey, archetypeConfig);
        res.json(archetypeConfig);
    } catch (error) {
        logger.error(`Error fetching archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/archetypes', async (req, res) => {
    logger.info('serving archetype list..');
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (archetypeListCache.expiry > Date.now()) {
        logger.debug('Serving cached archetype list');
        return res.json(archetypeListCache.data);
    }
    const configManager = ConfigManager.getInstance();
    
    const archetypes = await configManager.getAvailableArchetypes();
    archetypeListCache.data = archetypes;
    archetypeListCache.expiry = Date.now() + DEFAULT_TTL;
    res.json(archetypes);
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    logger.info(`serving rules for archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateInput(archetype)) {
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    if (ruleListCache[archetype] && ruleListCache[archetype].expiry > Date.now()) {
        logger.debug(`Serving cached rule list for archetype: ${archetype}`);
            return res.json(ruleListCache[archetype].data);
        }
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig, requestLogPrefix);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules) {
            const rules = await loadRules(archetype, archetypeConfig.rules, options.configServer, requestLogPrefix, options.localConfig);
            ruleListCache[archetype] = {
                data: rules,
                expiry: Date.now() + DEFAULT_TTL
            };
            res.json(rules);
        } else {
            res.status(404).json({ error: 'archetype not found or has no rules' });
        }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    logger.info(`serving rule ${req.params.rule} for archetype ${req.params.archetype}..`);
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateInput(archetype) || !validateInput(rule)) {
        return res.status(400).json({ error: 'Invalid archetype or rule name' });
    }
    const cacheKey = `rule:${archetype}:${rule}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.debug(`Serving cached rule ${rule} for archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig, requestLogPrefix);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules && archetypeConfig.rules.includes(rule)) {
            const rules = await loadRules(archetype, [rule], options.configServer, requestLogPrefix, options.localConfig);
            const ruleJson = rules[0]; // We're only loading one rule, so it's the first element
            
            if (ruleJson && validateRule(ruleJson)) {
                setCachedData(cacheKey, ruleJson);
                res.json(ruleJson);
            } else {
                logger.error(`Invalid rule configuration for ${rule}`);
                res.status(500).json({ error: 'Invalid rule configuration' });
            }
        } else {
            res.status(404).json({ error: 'Rule not found' });
        }
    } catch (error) {
        logger.error(`Error fetching rule ${rule} for archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// New route for telemetry
app.post('/telemetry', (req, res) => {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateTelemetryData(req.body)) {
        return res.status(400).json({ error: 'Invalid telemetry data' });
    }
    logger.info('accepting telemetry data:', req.body);
    // Here you can process and store the telemetry data as needed
    res.status(200).json({ message: 'telemetry data received successfully' });
});

export function startServer(customPort?: string) {
    const serverPort = customPort ? parseInt(customPort) : port;
    
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
        logger.warn('Failed to start server with tls, falling back to http:', error);
        return app.listen(serverPort, () => {
            logger.info(`xfidelity server is running on http://localhost:${serverPort}`);
        });
    }
}
