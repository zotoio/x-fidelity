import { Request, Response } from 'express';
import { analyzeCodebase } from '@x-fidelity/core';
import { logger, setLogPrefix, ServerLogger } from '../utils/serverLogger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Validates GitHub repository clone URL to prevent SSRF attacks
 * @param cloneUrl The repository clone URL
 * @returns True if URL is safe, false otherwise
 */
function validateGitHubCloneUrl(cloneUrl: string): boolean {
    try {
        const url = new URL(cloneUrl);
        
        // Only allow GitHub.com URLs
        if (url.hostname !== 'github.com') {
            logger.warn(`Invalid clone URL host: ${url.hostname}`);
            return false;
        }
        
        // Ensure HTTPS protocol
        if (url.protocol !== 'https:') {
            logger.warn(`Non-HTTPS clone URL: ${url.protocol}`);
            return false;
        }
        
        // Validate repository path format (owner/repo.git)
        const pathMatch = url.pathname.match(/^\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:\.git)?$/);
        if (!pathMatch) {
            logger.warn(`Invalid repository path format: ${url.pathname}`);
            return false;
        }
        
        return true;
    } catch (error) {
        logger.warn(`Invalid clone URL format: ${cloneUrl}`);
        return false;
    }
}

/**
 * Validates Git SHA to prevent injection attacks
 * @param sha The Git SHA
 * @returns True if SHA is valid, false otherwise
 */
function validateGitSha(sha: string): boolean {
    // Git SHA should be 40 character hexadecimal string
    return /^[a-f0-9]{40}$/i.test(sha);
}

/**
 * Creates a secure temporary directory path
 * @param prefix Directory prefix
 * @param identifier Unique identifier (sanitized)
 * @returns Secure temporary directory path
 */
function createSecureTempPath(prefix: string, identifier: string): string {
    // Sanitize identifier to prevent path traversal
    const sanitizedId = identifier.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    
    return path.join('/tmp', `${prefix}-${timestamp}-${sanitizedId}-${randomSuffix}`);
}

export async function githubWebhookPullRequestCheckRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);

    const signature = req.headers['x-hub-signature-256'] as string;
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!githubSecret) {
        logger.error({
            type: 'webhook-pr',
            error: 'missing-secret'
        }, 'GitHub webhook secret is not set');
        return res.status(500).send('Server is not configured for webhooks');
    }

    if (!signature) {
        logger.error({
            type: 'webhook-pr',
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
    
    if (event === 'pull_request') {
        try {
            await handlePullRequestCheck(req.body);
            return res.status(200).send('Pull request check completed');
        } catch (error) {
            logger.error({ error }, 'Error processing pull request check');
            return res.status(500).send('Error processing pull request check');
        }
    }

    if (event === 'push') {
        try {
            await handlePushCheck(req.body);
            return res.status(200).send('Push check completed');
        } catch (error) {
            logger.error({ error }, 'Error processing push check');
            return res.status(500).send('Error processing push check');
        }
    }

    res.status(200).send('Received');
}

async function handlePullRequestCheck(payload: any) {
    const { pull_request, repository } = payload;
    
    if (!pull_request || !repository) {
        logger.warn('Invalid pull request payload - missing pull_request or repository');
        return; // Return early instead of throwing error
    }

    const repoUrl = repository.clone_url;
    const prNumber = pull_request.number;
    const headSha = pull_request.head?.sha;
    const baseSha = pull_request.base?.sha;
    
    if (!repoUrl || !prNumber || !headSha || !baseSha) {
        logger.warn('Invalid pull request payload - missing required fields');
        return; // Return early instead of throwing error
    }
    
    // Validate repository URL and SHAs
    if (!validateGitHubCloneUrl(repoUrl)) {
        logger.error(`Invalid or unsafe repository URL: ${repoUrl}`);
        return;
    }
    
    if (!validateGitSha(headSha) || !validateGitSha(baseSha)) {
        logger.error(`Invalid SHA format - head: ${headSha}, base: ${baseSha}`);
        return;
    }
    
    logger.info({
        repoUrl,
        prNumber,
        headSha,
        baseSha
    }, 'Processing pull request check');

    // Create secure temporary directory for cloning
    const tempDir = createSecureTempPath('pr-check', `${prNumber}`);
    
    try {
        // Clone repository with security options
        const cloneCmd = `git clone --depth=50 --no-hardlinks --single-branch ${repoUrl} ${tempDir}`;
        await execAsync(cloneCmd, { 
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        // Checkout pull request head
        await execAsync(`cd ${tempDir} && git fetch origin pull/${prNumber}/head:pr-${prNumber} && git checkout pr-${prNumber}`, {
            timeout: 60000 // 1 minute timeout
        });
        
        // Create logger for analysis
        const analysisLogger = new ServerLogger({
            level: 'info',
            enableConsole: true,
            enableColors: true
        });
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: `PR-${prNumber}`,
            logger: analysisLogger
        });
        
        logger.info({
            prNumber,
            totalFailures: results.XFI_RESULT.totalIssues,
            errorCount: results.XFI_RESULT.errorCount,
            warningCount: results.XFI_RESULT.warningCount
        }, 'Pull request analysis completed');
        
        // Post GitHub status check (placeholder)
        await postGitHubStatusCheck(repository, headSha, results);
        
    } finally {
        // Cleanup temporary directory
        if (fs.existsSync(tempDir)) {
            await execAsync(`rm -rf ${tempDir}`, { timeout: 30000 });
        }
    }
}

async function handlePushCheck(payload: any) {
    const { repository, after: sha } = payload;
    
    if (!repository || !sha) {
        logger.warn('Invalid push payload - missing repository or sha');
        return; // Return early instead of throwing error
    }

    const repoUrl = repository.clone_url;
    
    if (!repoUrl) {
        logger.warn('Invalid push payload - missing clone_url');
        return; // Return early instead of throwing error
    }
    
    // Validate repository URL and SHA
    if (!validateGitHubCloneUrl(repoUrl)) {
        logger.error(`Invalid or unsafe repository URL: ${repoUrl}`);
        return;
    }
    
    if (!validateGitSha(sha)) {
        logger.error(`Invalid SHA format: ${sha}`);
        return;
    }
    
    logger.info({
        repoUrl,
        sha
    }, 'Processing push check');

    // Create secure temporary directory for cloning
    const tempDir = createSecureTempPath('push-check', sha.substring(0, 8));
    
    try {
        // Clone repository with security options
        const cloneCmd = `git clone --depth=50 --no-hardlinks ${repoUrl} ${tempDir}`;
        await execAsync(cloneCmd, { 
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        // Checkout specific commit
        await execAsync(`cd ${tempDir} && git checkout ${sha}`, {
            timeout: 60000 // 1 minute timeout
        });
        
        // Create logger for analysis
        const analysisLogger = new ServerLogger({
            level: 'info',
            enableConsole: true,
            enableColors: true
        });
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: `PUSH-${sha.substring(0, 8)}`,
            logger: analysisLogger
        });
        
        logger.info({
            sha: sha.substring(0, 8),
            totalFailures: results.XFI_RESULT.totalIssues,
            errorCount: results.XFI_RESULT.errorCount,
            warningCount: results.XFI_RESULT.warningCount
        }, 'Push analysis completed');
        
    } finally {
        // Cleanup temporary directory
        if (fs.existsSync(tempDir)) {
            await execAsync(`rm -rf ${tempDir}`, { timeout: 30000 });
        }
    }
}

async function postGitHubStatusCheck(repository: any, sha: string, results: any) {
    // This would require GitHub App authentication implementation
    // For now, just log that we would post a status check
    logger.info({
        repository: repository.full_name,
        sha,
        state: results.XFI_RESULT.errorCount > 0 ? 'failure' : 'success',
        description: `${results.XFI_RESULT.totalIssues} issues found (${results.XFI_RESULT.errorCount} errors, ${results.XFI_RESULT.warningCount} warnings)`
    }, 'Would post GitHub status check');
}


