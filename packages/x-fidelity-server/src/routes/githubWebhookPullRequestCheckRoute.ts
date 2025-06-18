import { Request, Response } from 'express';
import { analyzeCodebase } from '@x-fidelity/core';
import { logger, setLogPrefix, ServerLogger } from '../utils/serverLogger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    
    logger.info({
        repoUrl,
        prNumber,
        headSha,
        baseSha
    }, 'Processing pull request check');

    // Create temporary directory for cloning
    const tempDir = path.join('/tmp', `pr-check-${Date.now()}-${prNumber}`);
    
    try {
        // Clone repository
        await execAsync(`git clone ${repoUrl} ${tempDir}`);
        
        // Checkout PR head
        await execAsync(`cd ${tempDir} && git checkout ${headSha}`);
        
        // Create logger for analysis
        const analysisLogger = new ServerLogger({
            level: 'info',
            enableConsole: true,
            enableColors: true
        });

        // Run analysis on the PR
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
        
        // Post status check to GitHub if GitHub App credentials are available
        if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY) {
            await postGitHubStatusCheck(repository, headSha, results);
        }
        
    } finally {
        // Cleanup temporary directory
        if (fs.existsSync(tempDir)) {
            await execAsync(`rm -rf ${tempDir}`);
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
    
    logger.info({
        repoUrl,
        sha
    }, 'Processing push check');

    // Create temporary directory for cloning
    const tempDir = path.join('/tmp', `push-check-${Date.now()}-${sha.substring(0, 8)}`);
    
    try {
        // Clone repository
        await execAsync(`git clone ${repoUrl} ${tempDir}`);
        
        // Checkout specific commit
        await execAsync(`cd ${tempDir} && git checkout ${sha}`);
        
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
            await execAsync(`rm -rf ${tempDir}`);
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


