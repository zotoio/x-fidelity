import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../utils/serverLogger';
import crypto from 'crypto';
import { axiosClient } from '@x-fidelity/core';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { options } from '@x-fidelity/core';

/**
 * Validates GitHub repository information to prevent SSRF attacks
 * @param repoOwner Repository owner name
 * @param repoName Repository name
 * @param branch Branch name
 * @returns True if valid, false otherwise
 */
function validateGitHubRepo(repoOwner: string, repoName: string, branch: string): boolean {
    // Validate repository owner (GitHub username/organization rules)
    if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(repoOwner)) {
        logger.warn(`Invalid repository owner format: ${repoOwner}`);
        return false;
    }
    
    // Validate repository name (GitHub repository naming rules)
    if (!/^[a-zA-Z0-9._-]+$/.test(repoName) || repoName.length > 100) {
        logger.warn(`Invalid repository name format: ${repoName}`);
        return false;
    }
    
    // Validate branch name (Git branch naming rules)
    if (!/^[a-zA-Z0-9._/-]+$/.test(branch) || branch.length > 255 || branch.includes('..')) {
        logger.warn(`Invalid branch name format: ${branch}`);
        return false;
    }
    
    return true;
}

/**
 * Creates a validated GitHub API URL
 * @param repoOwner Repository owner
 * @param repoName Repository name
 * @param path Optional path within repository
 * @returns Validated GitHub API URL
 */
function createGitHubApiUrl(repoOwner: string, repoName: string, path?: string): URL {
    if (!validateGitHubRepo(repoOwner, repoName, 'main')) {
        throw new Error('Invalid GitHub repository parameters');
    }
    
    const basePath = path ? `/${encodeURIComponent(path)}` : '';
    return new URL(`https://api.github.com/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/contents${basePath}`);
}

/**
 * Validates and sanitizes file download URLs from GitHub
 * @param downloadUrl The download URL from GitHub API response
 * @returns True if URL is safe to download from
 */
function validateGitHubDownloadUrl(downloadUrl: string): boolean {
    try {
        const url = new URL(downloadUrl);
        
        // Only allow GitHub raw content URLs
        const allowedHosts = [
            'raw.githubusercontent.com',
            'github.com'
        ];
        
        if (!allowedHosts.includes(url.hostname)) {
            logger.warn(`Invalid download URL host: ${url.hostname}`);
            return false;
        }
        
        // Ensure HTTPS protocol
        if (url.protocol !== 'https:') {
            logger.warn(`Non-HTTPS download URL: ${url.protocol}`);
            return false;
        }
        
        return true;
    } catch (error) {
        logger.warn(`Invalid download URL format: ${downloadUrl}`);
        return false;
    }
}

export async function githubWebhookConfigUpdateRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);

    const signature = req.headers['x-hub-signature-256'] as string;
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!githubSecret) {
        logger.error({
            type: 'webhook-config',
            error: 'missing-secret'
        }, 'GitHub webhook secret is not set');
        return res.status(500).send('Server is not configured for webhooks');
    }

    if (!signature) {
        logger.error({
            type: 'webhook-config',
            error: 'missing-signature'
        }, 'No X-Hub-Signature-256 found on request');
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

        // Extract and validate repository information from the payload
        const payload = req.body;
        
        // Validate payload structure
        if (!payload.repository?.owner?.name || !payload.repository?.name || !payload.ref) {
            logger.error('Invalid GitHub webhook payload structure');
            return res.status(400).send('Invalid webhook payload');
        }
        
        const repoOwner = payload.repository.owner.name;
        const repoName = payload.repository.name;
        const branch = payload.ref.split('/').pop();
        
        // Validate repository information
        if (!validateGitHubRepo(repoOwner, repoName, branch)) {
            logger.error(`Invalid repository information: ${repoOwner}/${repoName}@${branch}`);
            return res.status(400).send('Invalid repository information');
        }

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

    try {
        const baseUrl = createGitHubApiUrl(repoOwner, repoName);
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'XFidelity-Webhook/4.0.0'
        };

        const response = await axiosClient.get(baseUrl.toString(), { 
            headers,
            params: { ref: branch },
            validateStatus: (status) => status === 200,
            timeout: 30000,
            maxRedirects: 3
        });
        
        for (const item of response.data) {
            if (item.type === 'file') {
                if (!validateGitHubDownloadUrl(item.download_url)) {
                    logger.warn(`Skipping invalid download URL: ${item.download_url}`);
                    continue;
                }
                await downloadFile(new URL(item.download_url), item.path);
            } else if (item.type === 'dir') {
                const dirUrl = createGitHubApiUrl(repoOwner, repoName, item.path);
                await processDirectory(dirUrl, item.path, branch);
            }
        }
        logger.info('Local config updated successfully');
    } catch (error) {
        logger.error(`Error updating local config: ${error}`);
    }
}

async function processDirectory(url: URL, dirPath: string, branch: string) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'XFidelity-Webhook/4.0.0'
    };

    try {
        const response = await axiosClient.get(url.toString(), { 
            headers,
            params: { ref: branch },
            validateStatus: (status) => status === 200,
            timeout: 30000,
            maxRedirects: 3
        });
        
        for (const item of response.data) {
            if (item.type === 'file') {
                if (!validateGitHubDownloadUrl(item.download_url)) {
                    logger.warn(`Skipping invalid download URL: ${item.download_url}`);
                    continue;
                }
                await downloadFile(new URL(item.download_url), path.join(dirPath, item.name));
            } else if (item.type === 'dir') {
                // Extract repository info from the current URL to maintain validation
                const urlParts = url.pathname.split('/');
                const repoOwner = urlParts[2];
                const repoName = urlParts[3];
                const newDirUrl = createGitHubApiUrl(repoOwner, repoName, path.join(dirPath, item.name));
                await processDirectory(newDirUrl, path.join(dirPath, item.name), branch);
            }
        }
    } catch (error) {
        logger.error(`Error processing directory ${dirPath}: ${error}`);
    }
}

async function downloadFile(url: URL, filePath: string) {
    if (!validateGitHubDownloadUrl(url.toString())) {
        logger.error(`Invalid download URL blocked: ${url.toString()}`);
        return;
    }
    
    // Validate and sanitize file path to prevent directory traversal
    const sanitizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(options.localConfigPath || '', sanitizedPath);
    
    // Ensure the resolved path is within the allowed directory
    const configPath = path.resolve(options.localConfigPath || '');
    const resolvedPath = path.resolve(fullPath);
    
    if (!resolvedPath.startsWith(configPath)) {
        logger.error(`Path traversal attempt blocked: ${filePath}`);
        return;
    }
    
    const dir = path.dirname(fullPath);

    try {
        await fs.promises.mkdir(dir, { recursive: true });
        const response = await axiosClient.get(url.toString(), { 
            responseType: 'arraybuffer',
            validateStatus: (status) => status === 200,
            maxRedirects: 3,
            timeout: 30000,
            headers: {
                'User-Agent': 'XFidelity-Webhook/4.0.0'
            }
        });
        await fs.promises.writeFile(fullPath, response.data);
        logger.info(`File downloaded: ${fullPath}`);
    } catch (error) {
        logger.error(`Error downloading file ${filePath}: ${error}`);
    }
}
