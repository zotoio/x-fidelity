import express from 'express';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';

const app = express();
const port = process.env.PORT || 3000;

app.get('/archetypes/:archetype', (req, res) => {
    const archetype = req.params.archetype;
    if (archetypes[archetype]) {
        res.json(archetypes[archetype]);
    } else {
        res.status(404).send('Archetype not found');
    }
});

app.get('/archetypes', (req, res) => {
    res.json(Object.keys(archetypes));
});

app.get('/rules/:archetype', async (req, res) => {
    const archetype = req.params.archetype;
    if (archetypes[archetype]) {
        const rules = await loadRules(archetypes[archetype].rules);
        res.json(rules);
    } else {
        res.status(404).send('Archetype not found');
    }
});

app.listen(port, () => {
    console.log(`Config server listening at http://localhost:${port}`);
});
