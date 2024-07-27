import express from 'express';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';
import { logger } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';

const app = express();
const port = options.port || process.env.XFI_LISTEN_PORT || 8888;

app.use(express.json());
app.use(expressLogger);

const validInput = (value: string): boolean => {
    // Ensure input contains only alphanumeric characters, hyphens, and underscores
    const validName = /^[a-zA-Z0-9-_\-]{1,50}$/;
    return validName.test(value);
}

app.get('/archetypes/:archetype', (req, res) => {
    logger.info(`serving archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype) && archetypes[archetype]) {
        logger.debug(`Found archetype ${archetype} config: ${JSON.stringify(archetypes[archetype])}`);
        res.json(archetypes[archetype]);
    } else {
        res.status(404).json({ error: 'archetype not found' });
    }
});

app.get('/archetypes', (req, res) => {
    logger.info('serving archetype list..');
    res.json(Object.keys(archetypes));
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    logger.info(`serving rules for archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        res.json(rules);
    } else {
        res.status(404).json({ error: 'archetype not found' });
    }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    logger.info(`serving rule ${req.params.rule} for archetype ${req.params.archetype}..`);
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    if (validInput(archetype) && validInput(rule) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules.includes(rule)) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        const ruleJson = rules.find((r) => r.name === rule);
        res.json(ruleJson);
    } else {
        res.status(404).json({ error: 'rule not found' });
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
