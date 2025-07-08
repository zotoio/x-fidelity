import { Request, Response } from 'express';
import { analyzeCodebase } from '@x-fidelity/core';
import { logger, setLogPrefix, ServerLogger } from '../utils/serverLogger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

// Helper function to execute spawn commands as promises
function execSpawn(command: string, args: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
        
        // Handle timeout
        if (options.timeout) {
            setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error('Command timeout'));
            }, options.timeout);
        }
    });
}

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
 * Enhanced validation for PR numbers to prevent injection attacks
 * @param prNumber The PR number from GitHub payload
 * @returns True if PR number is safe to use
 */
function validatePRNumber(prNumber: any): boolean {
    // Must be a positive integer, reasonable range
    if (typeof prNumber !== 'number' || !Number.isInteger(prNumber)) {
        return false;
    }
    return prNumber > 0 && prNumber <= 999999; // Reasonable upper limit
}

/**
 * Enhanced validation for SHA to prevent injection attacks
 * @param sha The SHA from GitHub payload
 * @returns True if SHA is safe to use
 */
function validateSHA(sha: any): boolean {
    if (typeof sha !== 'string') {
        return false;
    }
    // Must be exactly 40 character hex string
    return /^[a-f0-9]{40}$/.test(sha);
}

/**
 * Creates a secure temporary directory path with enhanced validation
 * @param prefix Directory prefix
 * @param identifier Unique identifier (sanitized)
 * @returns Secure temporary directory path
 */
function createSecureTempPath(prefix: string, identifier: string): string {
    // Sanitize identifier to prevent path traversal
    const sanitizedId = identifier.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    
    const tempPath = path.join('/tmp', `${prefix}-${timestamp}-${sanitizedId}-${randomSuffix}`);
    
    // Security: Validate the resolved path is within /tmp
    const resolvedPath = path.resolve(tempPath);
    if (!resolvedPath.startsWith('/tmp/')) {
        throw new Error('Invalid temporary directory path - security violation');
    }
    
    return resolvedPath;
}

/**
 * Creates a safe branch name for git operations
 * @param prNumber The validated PR number
 * @returns Safe branch name
 */
function createSafeBranchName(prNumber: number): string {
    // Create a safe branch name using only the validated number
    return `pr-${prNumber}`;
}

/**
 * Creates a safe fetch refspec for git operations
 * @param prNumber The validated PR number
 * @returns Safe refspec string
 */
function createSafeFetchRefspec(prNumber: number): string {
    // Create a safe refspec using only the validated number
    return `pull/${prNumber}/head:pr-${prNumber}`;
}

/**
 * Validates that a directory path is safe for operations
 * @param dirPath The directory path to validate
 * @returns True if path is safe
 */
function validateDirectoryPath(dirPath: string): boolean {
    try {
        const resolvedPath = path.resolve(dirPath);
        
        // Must be within /tmp directory
        if (!resolvedPath.startsWith('/tmp/')) {
            logger.warn(`Directory path outside allowed range: ${resolvedPath}`);
            return false;
        }
        
        // Check for path traversal attempts
        if (dirPath.includes('..') || dirPath.includes('\0')) {
            logger.warn(`Path traversal attempt detected: ${dirPath}`);
            return false;
        }
        
        return true;
    } catch (error) {
        logger.warn(`Invalid directory path: ${dirPath}`);
        return false;
    }
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
    
    // Enhanced security validation
    if (!validateGitHubCloneUrl(repoUrl)) {
        logger.error(`Invalid or unsafe repository URL: ${repoUrl}`);
        return;
    }
    
    if (!validatePRNumber(prNumber)) {
        logger.error(`Invalid PR number: ${prNumber}`);
        return;
    }
    
    if (!validateSHA(headSha) || !validateSHA(baseSha)) {
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
    
    // Security: Validate the temporary directory path
    if (!validateDirectoryPath(tempDir)) {
        logger.error(`Invalid temporary directory path: ${tempDir}`);
        return;
    }
    
    // Create safe git operation parameters
    const safeBranchName = createSafeBranchName(prNumber);
    const safeFetchRefspec = createSafeFetchRefspec(prNumber);
    
    try {
        // Clone repository with security options
        await execSpawn('git', ['clone', '--depth=50', '--no-hardlinks', '--single-branch', repoUrl, tempDir], {
            timeout: 300000 // 5 minute timeout
        });
        
        // Fetch and checkout pull request head (using secure refspec)
        await execSpawn('git', ['fetch', 'origin', safeFetchRefspec], {
            cwd: tempDir,
            timeout: 60000 // 1 minute timeout
        });
        
        await execSpawn('git', ['checkout', safeBranchName], {
            cwd: tempDir,
            timeout: 60000 // 1 minute timeout
        });
        
        // Create logger for analysis
        const analysisLogger = new ServerLogger({
            level: 'info',
            enableConsole: true,
            enableColors: true
        });
        
        // Security: Validate tempDir before using in analysis
        if (!validateDirectoryPath(tempDir)) {
            throw new Error(`Invalid directory path for analysis: ${tempDir}`);
        }
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: 'PR-' + prNumber,
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
        // Cleanup temporary directory with path validation
        if (fs.existsSync(tempDir) && validateDirectoryPath(tempDir)) {
            await execSpawn('rm', ['-rf', tempDir], { timeout: 30000 });
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
    
    // Enhanced security validation
    if (!validateGitHubCloneUrl(repoUrl)) {
        logger.error(`Invalid or unsafe repository URL: ${repoUrl}`);
        return;
    }
    
    if (!validateSHA(sha)) {
        logger.error(`Invalid SHA format: ${sha}`);
        return;
    }
    
    logger.info({
        repoUrl,
        sha
    }, 'Processing push check');

    // Create secure temporary directory for cloning
    const tempDir = createSecureTempPath('push-check', sha.substring(0, 8));
    
    // Security: Validate the temporary directory path
    if (!validateDirectoryPath(tempDir)) {
        logger.error(`Invalid temporary directory path: ${tempDir}`);
        return;
    }
    
    try {
        // Clone repository with security options
        await execSpawn('git', ['clone', '--depth=50', '--no-hardlinks', repoUrl, tempDir], { 
            timeout: 300000 // 5 minute timeout
        });
        
        // Checkout specific commit (using validated SHA)
        await execSpawn('git', ['checkout', sha], {
            cwd: tempDir,
            timeout: 60000 // 1 minute timeout
        });
        
        // Create logger for analysis
        const analysisLogger = new ServerLogger({
            level: 'info',
            enableConsole: true,
            enableColors: true
        });
        
        // Security: Validate tempDir before using in analysis
        if (!validateDirectoryPath(tempDir)) {
            throw new Error(`Invalid directory path for analysis: ${tempDir}`);
        }
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: 'PUSH-' + sha.substring(0, 8),
            logger: analysisLogger
        });
        
        logger.info({
            sha: sha.substring(0, 8),
            totalFailures: results.XFI_RESULT.totalIssues,
            errorCount: results.XFI_RESULT.errorCount,
            warningCount: results.XFI_RESULT.warningCount
        }, 'Push analysis completed');
        
    } finally {
        // Cleanup temporary directory with path validation
        if (fs.existsSync(tempDir) && validateDirectoryPath(tempDir)) {
            await execSpawn('rm', ['-rf', tempDir], { timeout: 30000 });
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


