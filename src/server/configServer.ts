import express from 'express';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';

const app = express();
const port = process.env.XFI_PORT || 8888;

const validInput = (value: string, res: any) => {
    // ensure archetype contains only alphanuleric characters and hyphens and is not longer than 50 characters
    const validArchetypeName = /^[a-zA-Z0-9-]{1,50}$/;
    if (!validArchetypeName.test(value)) {
        res.status(400).send('Invalid request');
        return false;
    } else {
        return true;
    }
}

app.get('/archetypes/:archetype', (req, res) => {
    console.log(`Fetching archetype: ${req.params.archetype}`);
    const archetype = req.params.archetype;
    if (validInput(archetype, res) && archetypes[archetype]) {
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
    if (validInput(archetype, res) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules) {
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
    if (validInput(archetype, res) && validInput(rule, res) && archetypes.hasOwnProperty(archetype) && archetypes[archetype].rules.includes(rule)) {
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
