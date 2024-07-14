import express from 'express';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';
import path from 'path';

const app = express();
const port = process.env.XFI_SERVER_PORT || 8888;

const validInput = (value: string): boolean => {
    // Ensure input contains only alphanumeric characters, hyphens, and underscores
    const validName = /^[a-zA-Z0-9-_]{1,50}$/;
    return validName.test(value);
}

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.get('/archetypes/:archetype', (req, res) => {
    console.log(`Fetching archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype) && archetypes[archetype]) {
        console.log(`Found archetype ${archetype} config: ${JSON.stringify(archetypes[archetype])}`);
        res.json(archetypes[archetype]);
    } else {
        res.status(404).json({ error: 'Archetype not found' });
    }
});

app.get('/archetypes', (req, res) => {
    console.log('Fetching archetype list..');
    res.json(Object.keys(archetypes));
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    console.log(`Fetching rules for archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        res.json(rules);
    } else {
        res.status(404).json({ error: 'Archetype not found' });
    }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    console.log(`Fetching rule ${req.params.rule} for archetype ${req.params.archetype}..`);
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    if (validInput(archetype) && validInput(rule) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules.includes(rule)) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        const ruleJson = rules.find((r) => r.name === rule);
        res.json(ruleJson);
    } else {
        res.status(404).json({ error: 'Rule not found' });
    }
});

app.listen(port, () => {
    console.log(`Config server listening at http://localhost:${port}`);
});
