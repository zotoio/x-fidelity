import express from 'express';
import https from 'https';
import fs from 'fs';
import { loadRules } from '../rules';
import { RuleProperties } from 'json-rules-engine';
import { logger } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';
import { ConfigManager } from '../utils/config';

const app = express();
const port = options.port || process.env.XFI_LISTEN_PORT || 8888;

// Simple in-memory cache
const cache: { [key: string]: { data: any; expiry: number } } = {};
const DEFAULT_TTL = parseInt(options.jsonTTL) * 60 * 1000; // Convert CLI option to milliseconds

// Cache for archetype lists and rule lists
const archetypeListCache: { data: string[]; expiry: number } = { data: [], expiry: 0 };
const ruleListCache: { [archetype: string]: { data: RuleProperties[]; expiry: number } } = {};

function getCachedData(key: string): any | null {
    const item = cache[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

function setCachedData(key: string, data: any, ttl: number = DEFAULT_TTL): void {
    cache[key] = {
        data,
        expiry: Date.now() + ttl
    };
}

app.use(express.json());
app.use(expressLogger);

const validInput = (value: string): boolean => {
    // Ensure input contains only alphanumeric characters, hyphens, and underscores
    const validName = /^[a-zA-Z0-9-_-]{1,50}$/;
    return validName.test(value);
}

app.get('/archetypes/:archetype', async (req, res) => {
    logger.info(`serving archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype)) {
        const cacheKey = `archetype:${archetype}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            logger.debug(`Serving cached archetype ${archetype}`);
            return res.json(cachedData);
        }

        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        logger.debug(`Found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);
        
        setCachedData(cacheKey, archetypeConfig);
        res.json(archetypeConfig);
    } else {
        res.status(404).json({ error: 'archetype not found' });
    }
});

app.get('/archetypes', async (req, res) => {
    logger.info('serving archetype list..');
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
    if (validInput(archetype)) {
        if (ruleListCache[archetype] && ruleListCache[archetype].expiry > Date.now()) {
            logger.debug(`Serving cached rule list for archetype: ${archetype}`);
            return res.json(ruleListCache[archetype].data);
        }
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules) {
            const rules = await loadRules(archetype, archetypeConfig.rules, options.configServer, '', options.localConfig);
            ruleListCache[archetype] = {
                data: rules,
                expiry: Date.now() + DEFAULT_TTL
            };
            res.json(rules);
        } else {
            res.status(404).json({ error: 'archetype not found or has no rules' });
        }
    } else {
        res.status(404).json({ error: 'invalid archetype name' });
    }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    logger.info(`serving rule ${req.params.rule} for archetype ${req.params.archetype}..`);
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    if (validInput(archetype) && validInput(rule)) {
        const cacheKey = `rule:${archetype}:${rule}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            logger.debug(`Serving cached rule ${rule} for archetype ${archetype}`);
            return res.json(cachedData);
        }

        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules && archetypeConfig.rules.includes(rule)) {
            const rules = await loadRules(archetype, archetypeConfig.rules, options.configServer, '', options.localConfig);
            const ruleJson = rules.find((r) => r.name === rule);
            
            if (ruleJson) {
                setCachedData(cacheKey, ruleJson);
                res.json(ruleJson);
            } else {
                res.status(404).json({ error: 'rule not found' });
            }
        } else {
            res.status(404).json({ error: 'rule not found' });
        }
    } else {
        res.status(404).json({ error: 'invalid archetype or rule name' });
    }
});


// New route for telemetry
app.post('/telemetry', (req, res) => {
    logger.info('accepting telemetry data:', req.body);
    // Here you can process and store the telemetry data as needed
    // For now, we'll just log it and send a success response
    res.status(200).json({ message: 'telemetry data received successfully' });
});

export function startServer(customPort?: string) {
    const serverPort = customPort ? parseInt(customPort) : port;
    
    // Read SSL certificate and key
    try {
        const privateKey = fs.readFileSync(`${__dirname}/private-key.pem`, 'utf8');
        const certificate = fs.readFileSync(`${__dirname}/certificate.pem`, 'utf8');
        const credentials = { key: privateKey, cert: certificate };

        // Create HTTPS server
        const httpsServer = https.createServer(credentials, app);

        httpsServer.listen(serverPort, () => {
            logger.info(`xfidelity server is running on https://localhost:${serverPort}`);
        });
        
    } catch (error) {
        logger.warn('Failed to start server with tls, falling back to http:', error);
        app.listen(serverPort, () => {
            logger.info(`xfidelity server is running on http://localhost:${serverPort}`);
        });
    }
}
