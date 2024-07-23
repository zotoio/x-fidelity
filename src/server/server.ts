import express from 'express';
import { logger } from '../utils/logger';
import { analyzeCodebase } from '../core/engine';

export function startServer(port: string) {
    const app = express();
    app.use(express.json());

    app.post('/analyze', async (req, res) => {
        try {
            const { repoPath, archetype, configServer } = req.body;
            const results = await analyzeCodebase(repoPath, archetype, configServer);
            res.json(results);
        } catch (error) {
            logger.error(`Error during analysis: ${error}`);
            res.status(500).json({ error: 'An error occurred during analysis' });
        }
    });

    app.listen(parseInt(port), () => {
        logger.info(`xfidelity server is running on port ${port}`);
    });
}
