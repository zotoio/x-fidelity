import express from 'express';
import { loadRules } from '../rules';
import { logger } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';
import { ConfigManager } from '../utils/config';

const app = express();
const port = options.port || process.env.XFI_LISTEN_PORT || 8888;

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
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        logger.debug(`Found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);
        res.json(archetypeConfig);
    } else {
        res.status(404).json({ error: 'archetype not found' });
    }
});

app.get('/archetypes', async (req, res) => {
    logger.info('serving archetype list..');
    const configManager = ConfigManager.getInstance();
    const archetypes = await configManager.getAvailableArchetypes();
    res.json(archetypes);
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    logger.info(`serving rules for archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype)) {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules) {
            const rules = await loadRules(archetype, archetypeConfig.rules, options.configServer, '', options.localConfig);
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
        const configManager = ConfigManager.getInstance();
        await configManager.initialize(archetype, options.configServer, options.localConfig);
        const archetypeConfig = configManager.getConfig();
        if (archetypeConfig && archetypeConfig.rules && archetypeConfig.rules.includes(rule)) {
            const rules = await loadRules(archetype, archetypeConfig.rules, options.configServer, '', options.localConfig);
            const ruleJson = rules.find((r) => r.name === rule);
            res.json(ruleJson);
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
    app.listen(serverPort, () => {
        logger.info(`xfidelity server is running on port ${serverPort}`);
    });
}
