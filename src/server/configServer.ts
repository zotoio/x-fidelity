import express from 'express';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';

const app = express();
const port = process.env.XFI_PORT || 8888;

app.get('/archetypes/:archetype', (req, res) => {
    console.log(`Fetching archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (archetypes[archetype]) {
        console.log(`Found archetype ${archetype} config: ${JSON.stringify(archetypes[archetype])}`);
        res.json(archetypes[archetype]);
    } else {
        res.status(404).send(`archetype not found`);
    }
});

app.get('/archetypes', (req, res) => {
    console.log('Fetching archetype list..');
    res.json(Object.keys(archetypes));
});

app.get('/archetypes/:archetype/rules', async (req, res) => {
    console.log(`Fetching rules for archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (archetypes[archetype]) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        res.json(rules);
    } else {
        res.status(404).send(`archetype not found`);
    }
});

app.get('/archetypes/:archetype/rules/:rule', async (req, res) => {
    console.log(`Fetching rule ${req.params.rule} for archetype ${req.params.archetype}..`);
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    if (archetypes[archetype]) {
        const rules = await loadRules(archetype, archetypes[archetype].rules);
        const ruleJson = rules.find((r) => r.name === rule);
        res.json(ruleJson);
    } else {
        res.status(404).send(`rule not found`);
    }
});

app.listen(port, () => {
    console.log(`Config server listening at http://localhost:${port}`);
});
