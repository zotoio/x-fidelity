import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { logger, setLogPrefix } from './utils/serverLogger';
import { pluginRegistry } from '@x-fidelity/core';
import { expressLogger } from './expressLogger'
import { options } from '@x-fidelity/core';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { StartServerParams } from '@x-fidelity/types';
import { archetypeRoute } from './routes/archetypeRoute';
import { archetypeRulesRoute } from './routes/archetypeRulesRoute';
import { archetypeRuleRoute } from './routes/archetypeRuleRoute';
import { telemetryRoute } from './routes/telemetryRoute';
import { clearCacheRoute } from './routes/clearCacheRoute';
import { viewCacheRoute } from './routes/viewCacheRoute';
import { githubWebhookConfigUpdateRoute } from './routes/githubWebhookConfigUpdateRoute';
import { githubWebhookPullRequestCheckRoute } from './routes/githubWebhookPullRequestCheckRoute';
import { exemptionsRoute } from './routes/exemptionsRoute';
import { validateUrlInput } from './middleware/validateUrlInput';
import { validateTelemetryData } from './middleware/validateTelemetryData';
import { validateGithubWebhook } from './middleware/validateGithubWebhook';
import chokidar from 'chokidar';
import { handleConfigChange } from './cacheManager';

const SHARED_SECRET = process.env.XFI_SHARED_SECRET;
const maskedSecret = SHARED_SECRET ? `${SHARED_SECRET.substring(0, 1)}****${SHARED_SECRET.substring(SHARED_SECRET.length - 1)}` : 'not set';
//logger.trace(`Shared secret is ${maskedSecret}`);

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

app.use(express.json());
app.use(expressLogger);

app.get('/archetypes/:archetype', validateUrlInput, archetypeRoute);
app.get('/archetypes/:archetype/rules', validateUrlInput, archetypeRulesRoute);
app.get('/archetypes/:archetype/rules/:rule', validateUrlInput, archetypeRuleRoute);
app.post('/telemetry', checkSharedSecret, validateTelemetryData, telemetryRoute);
app.post('/clearcache', checkSharedSecret, clearCacheRoute);
app.get('/viewcache', checkSharedSecret, viewCacheRoute);
app.get('/archetypes/:archetype/exemptions', checkSharedSecret, exemptionsRoute);

app.post('/github-config-update', validateGithubWebhook, githubWebhookConfigUpdateRoute);
app.post('/github-pull-request-check', validateGithubWebhook, githubWebhookPullRequestCheckRoute);

export function startServer({ customPort, executionLogPrefix }: StartServerParams): any {
    const serverPort = customPort ? parseInt(customPort.toString()) : port;
    executionLogPrefix && setLogPrefix(executionLogPrefix);

    // Read SSL certificate and key
    try {
        const certPath = process.env.CERT_PATH || __dirname;
        const privateKey = fs.readFileSync(`${certPath}/tls.key`, 'utf8');
        const certificate = fs.readFileSync(`${certPath}/tls.pem`, 'utf8');
        const credentials = { key: privateKey, cert: certificate };

        // Create HTTPS server
        const httpsServer = https.createServer(credentials, app);

        const server = httpsServer.listen(serverPort, () => {
            logger.info(`xfidelity server is running on https://localhost:${serverPort}`);
        });

        // Set up file watcher for local config path
        if (options.localConfigPath) {
            const watcher = chokidar.watch(options.localConfigPath, {
                ignored: /(^|[/\\])\../, // ignore dotfiles
                persistent: true,
                depth: 1
            });

            watcher
                .on('add', path => handleConfigChange(path, 'File', 'added'))
                .on('change', path => handleConfigChange(path, 'File', 'changed'))
                .on('unlink', path => handleConfigChange(path, 'File', 'removed'));

            logger.info(`Watching for changes in ${options.localConfigPath}`);
        }

        return server;

    } catch (error) {
        logger.warn({ 
            error: error instanceof Error ? error.message : String(error),
            message: 'Failed to start server with TLS, falling back to HTTP'
        });
        const server = app.listen(serverPort, () => {
            logger.info(`xfidelity server is running on http://localhost:${serverPort}`);
        });

        // Set up file watcher for local config path
        if (options.localConfigPath) {
            const watcher = chokidar.watch(options.localConfigPath, {
                ignored: /(^|[/\\])\../, // ignore dotfiles
                persistent: true,
                depth: 1
            });

            watcher
                .on('add', path => handleConfigChange(path, 'File', 'added'))
                .on('change', path => handleConfigChange(path, 'File', 'changed'))
                .on('unlink', path => handleConfigChange(path, 'File', 'removed'));

            logger.info(`Watching for changes in ${options.localConfigPath}`);
        }

        return server;
    }
}


