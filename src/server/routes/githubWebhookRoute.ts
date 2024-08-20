import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../../utils/logger';
import crypto from 'crypto';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '../../utils/configManager';
import { options } from '../../core/cli';

export async function githubWebhookRoute(req: Request, res: Response) {
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
}

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
