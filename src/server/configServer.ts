import express from 'express';
import https from 'https';
import fs from 'fs';
import { logger, setLogPrefix } from '../utils/logger';
import { expressLogger } from './expressLogger'
import { options } from '../core/cli';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { StartServerParams } from '../types/typeDefs';
import { archetypeRoute } from './routes/archetypeRoute';
import { archetypeRulesRoute } from './routes/archetypeRulesRoute';
import { archetypeRuleRoute } from './routes/archetypeRuleRoute';
import { telemetryRoute } from './routes/telemetryRoute';
import { clearCacheRoute } from './routes/clearCacheRoute';
import { viewCacheRoute } from './routes/viewCacheRoute';
import chokidar from 'chokidar';
import crypto from 'crypto';
import path from 'path';
import axios from 'axios';

const SHARED_SECRET = process.env.XFI_SHARED_SECRET;
const maskedSecret = SHARED_SECRET ? `${SHARED_SECRET.substring(0, 4)}****${SHARED_SECRET.substring(SHARED_SECRET.length - 4)}` : 'not set';
logger.info(`Shared secret is ${maskedSecret}`);

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

const DEFAULT_TTL = parseInt(options.jsonTTL) * 60 * 1000; // Convert CLI option to milliseconds

app.use(express.json());
app.use(expressLogger);

app.get('/archetypes/:archetype', archetypeRoute);
app.get('/archetypes/:archetype/rules', archetypeRulesRoute);
app.get('/archetypes/:archetype/rules/:rule', archetypeRuleRoute);
app.post('/telemetry', checkSharedSecret, telemetryRoute);
app.post('/clearcache', checkSharedSecret, clearCacheRoute);
app.get('/viewcache', checkSharedSecret, viewCacheRoute);

// GitHub webhook route
app.post('/github-webhook', (req, res) => {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);

    const signature = req.headers['x-hub-signature-256'] as string;
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!githubSecret) {
        logger.error('GitHub webhook secret is not set');
        return res.status(500).send('Server is not configured for webhooks');
    }

    if (!signature) {
        logger.error('No X-Hub-Signature-256 found on request');
        return res.status(400).send('No X-Hub-Signature-256 found on request');
    }

    const hmac = crypto.createHmac('sha256', githubSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
        logger.error('Request body digest did not match X-Hub-Signature-256');
        return res.status(400).send('Invalid signature');
    }

    const event = req.headers['x-github-event'] as string;
    if (event === 'push') {
        logger.info('Received push event from GitHub');
        // Clear cache and loaded configs
        clearCache();
        ConfigManager.clearLoadedConfigs();
        logger.info('Cache and loaded configs cleared due to GitHub push event');

        // Extract repository information from the payload
        const payload = req.body;
        const repoOwner = payload.repository.owner.name;
        const repoName = payload.repository.name;
        const branch = payload.ref.split('/').pop();

        // Update local config
        await updateLocalConfig(repoOwner, repoName, branch);

        return res.status(200).send('Webhook received and processed');
    }

    res.status(200).send('Received');
});

async function updateLocalConfig(repoOwner: string, repoName: string, branch: string) {
    if (!options.localConfigPath) {
        logger.error('Local config path is not set');
        return;
    }

    const baseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents`;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'XFidelity-Webhook'
    };

    try {
        const response = await axios.get(`${baseUrl}?ref=${branch}`, { headers });
        for (const item of response.data) {
            if (item.type === 'file') {
                await downloadFile(item.download_url, item.path);
            } else if (item.type === 'dir') {
                await processDirectory(`${baseUrl}/${item.path}`, item.path, branch);
            }
        }
        logger.info('Local config updated successfully');
    } catch (error) {
        logger.error(`Error updating local config: ${error}`);
    }
}

async function processDirectory(url: string, dirPath: string, branch: string) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'XFidelity-Webhook'
    };

    try {
        const response = await axios.get(`${url}?ref=${branch}`, { headers });
        for (const item of response.data) {
            if (item.type === 'file') {
                await downloadFile(item.download_url, path.join(dirPath, item.name));
            } else if (item.type === 'dir') {
                await processDirectory(`${url}/${item.name}`, path.join(dirPath, item.name), branch);
            }
        }
    } catch (error) {
        logger.error(`Error processing directory ${dirPath}: ${error}`);
    }
}

async function downloadFile(url: string, filePath: string) {
    const fullPath = path.join(options.localConfigPath, filePath);
    const dir = path.dirname(fullPath);

    try {
        await fs.promises.mkdir(dir, { recursive: true });
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fs.promises.writeFile(fullPath, response.data);
        logger.info(`File downloaded: ${fullPath}`);
    } catch (error) {
        logger.error(`Error downloading file ${filePath}: ${error}`);
    }
}

export function startServer({ customPort, executionLogPrefix }: StartServerParams): any {
    const serverPort = customPort ? parseInt(customPort) : port;
    executionLogPrefix && setLogPrefix(executionLogPrefix);

    // Read SSL certificate and key
    try {
        const certPath = process.env.CERT_PATH || __dirname;
        const privateKey = fs.readFileSync(`${certPath}/private-key.pem`, 'utf8');
        const certificate = fs.readFileSync(`${certPath}/certificate.pem`, 'utf8');
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
        logger.warn('failed to start server with tls, falling back to http:', error);
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

function handleConfigChange(path: string, fileType: string, changeType: string) {
    logger.info(`${fileType} ${path} has been ${changeType}`);
    clearCache();
    ConfigManager.clearLoadedConfigs();
    logger.info('Cache and loaded configs cleared due to local config change');
}
