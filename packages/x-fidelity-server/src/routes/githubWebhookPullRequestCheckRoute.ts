import { Request, Response } from 'express';
import { analyzeCodebase } from '@x-fidelity/core';
import { logger, setLogPrefix, ServerLogger } from '../utils/serverLogger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

// Security: Whitelist of allowed git commands and arguments
const ALLOWED_GIT_COMMANDS = ['clone', 'fetch', 'checkout'] as const;
const ALLOWED_GIT_FLAGS = [
  '--depth', '--no-hardlinks', '--single-branch', 
  '--timeout', 'origin'
] as const;

// Security: Enhanced command validation and sanitization
type AllowedGitCommand = typeof ALLOWED_GIT_COMMANDS[number];

/**
 * Validates and sanitizes command arguments to prevent injection attacks
 * @param command The git command to validate
 * @param args The arguments to validate
 * @returns True if command and args are safe
 */
function validateGitCommand(command: string, args: string[]): boolean {
  // Only allow whitelisted git commands
  if (!ALLOWED_GIT_COMMANDS.includes(command as AllowedGitCommand)) {
    logger.error(`Blocked unauthorized git command: ${command}`);
    return false;
  }
  
  // Validate each argument
  for (const arg of args) {
    // Check for command injection patterns
    if (arg.includes(';') || arg.includes('|') || arg.includes('&') || 
        arg.includes('`') || arg.includes('$') || arg.includes('\n') || 
        arg.includes('\r') || arg.includes('\0')) {
      logger.error(`Blocked command injection attempt in arg: ${arg}`);
      return false;
    }
    
    // Check for path traversal attempts
    if (arg.includes('..') || arg.includes('~')) {
      logger.error(`Blocked path traversal attempt in arg: ${arg}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Securely executes git commands with enhanced validation
 * @param command Git command to execute
 * @param args Command arguments (will be validated)
 * @param options Execution options
 * @returns Promise with command output
 */
function execSpawnSecure(command: string, args: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Security: Only allow git commands
    if (command !== 'git' && command !== 'rm') {
      reject(new Error(`Blocked unauthorized command: ${command}`));
      return;
    }
    
    // Security: For rm command, only allow specific safe patterns for cleanup
    if (command === 'rm') {
      if (args.length !== 2 || args[0] !== '-rf' || !args[1].startsWith('/tmp/')) {
        reject(new Error(`Blocked unsafe rm command: ${args.join(' ')}`));
        return;
      }
      // Additional validation for rm target
      const rmTarget = args[1];
      if (!validateDirectoryPath(rmTarget)) {
        reject(new Error(`Blocked unsafe rm target: ${rmTarget}`));
        return;
      }
    }
    
    // Security: Validate git commands and arguments
    if (command === 'git' && !validateGitCommand(args[0], args.slice(1))) {
      reject(new Error(`Git command validation failed: ${args.join(' ')}`));
      return;
    }
    
    // Security: Sanitize environment variables
    const sanitizedEnv = {
      PATH: process.env.PATH || '/usr/bin:/bin',
      HOME: process.env.HOME || '/tmp',
      // Remove potentially dangerous environment variables
    };
    
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: sanitizedEnv,
      shell: false, // Critical: Never use shell to prevent command injection
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
    
    // Handle timeout with forced termination
    if (options.timeout) {
      setTimeout(() => {
        child.kill('SIGKILL'); // Use SIGKILL for immediate termination
        reject(new Error('Command timeout - process terminated'));
      }, options.timeout);
    }
  });
}

// Legacy function for backward compatibility - now uses secure implementation
function execSpawn(command: string, args: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
  return execSpawnSecure(command, args, options);
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
 * Creates a safe branch name for git operations with enhanced sanitization
 * @param prNumber The validated PR number
 * @returns Safe branch name
 */
function createSafeBranchName(prNumber: number): string {
  // Validate input is actually a safe integer
  if (!Number.isInteger(prNumber) || prNumber <= 0 || prNumber > 999999) {
    throw new Error(`Invalid PR number for branch name: ${prNumber}`);
  }
  
  // Create a safe branch name using only the validated number
  const safeBranchName = `pr-${prNumber}`;
  
  // Additional validation: ensure result contains only safe characters
  if (!/^pr-\d+$/.test(safeBranchName)) {
    throw new Error(`Generated branch name failed safety check: ${safeBranchName}`);
  }
  
  return safeBranchName;
}

/**
 * Creates a safe fetch refspec for git operations with enhanced validation
 * @param prNumber The validated PR number
 * @returns Safe refspec string
 */
function createSafeFetchRefspec(prNumber: number): string {
  // Validate input is actually a safe integer
  if (!Number.isInteger(prNumber) || prNumber <= 0 || prNumber > 999999) {
    throw new Error(`Invalid PR number for refspec: ${prNumber}`);
  }
  
  // Create a safe refspec using only the validated number
  const safeRefspec = `pull/${prNumber}/head:pr-${prNumber}`;
  
  // Additional validation: ensure result contains only safe characters
  if (!/^pull\/\d+\/head:pr-\d+$/.test(safeRefspec)) {
    throw new Error(`Generated refspec failed safety check: ${safeRefspec}`);
  }
  
  return safeRefspec;
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

/**
 * Creates a safe execution log prefix for PR analysis with enhanced validation
 * @param prNumber The validated PR number
 * @returns Safe log prefix string
 */
function createSafeExecutionLogPrefix(prNumber: number): string {
  // Ensure we only use validated numeric PR number
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`Invalid PR number for log prefix: ${prNumber}`);
  }
  
  const safePrefix = `PR-${prNumber}`;
  
  // Additional validation: ensure result contains only safe characters
  if (!/^PR-\d+$/.test(safePrefix)) {
    throw new Error(`Generated log prefix failed safety check: ${safePrefix}`);
  }
  
  return safePrefix;
}

/**
 * Creates a safe execution log prefix for push analysis with enhanced validation
 * @param sha The validated SHA
 * @returns Safe log prefix string
 */
function createSafePushLogPrefix(sha: string): string {
  // Validate SHA format
  if (!validateSHA(sha)) {
    throw new Error(`Invalid SHA for log prefix: ${sha}`);
  }
  
  // Use only first 8 characters for safety
  const safeShaPrefix = sha.substring(0, 8);
  const safePrefix = `PUSH-${safeShaPrefix}`;
  
  // Additional validation: ensure result contains only safe characters
  if (!/^PUSH-[a-f0-9]{8}$/.test(safePrefix)) {
    throw new Error(`Generated push log prefix failed safety check: ${safePrefix}`);
  }
  
  return safePrefix;
}

/**
 * Validates and sanitizes SHA for git checkout operations
 * @param sha The SHA to validate
 * @returns Sanitized SHA string
 */
function sanitizeSHAForCheckout(sha: string): string {
  // Strict validation
  if (!validateSHA(sha)) {
    throw new Error(`Invalid SHA format for checkout: ${sha}`);
  }
  
  // Additional sanitization: ensure it only contains valid hex characters
  const sanitized = sha.toLowerCase().replace(/[^a-f0-9]/g, '');
  
  if (sanitized.length !== 40) {
    throw new Error(`SHA sanitization failed: ${sha} -> ${sanitized}`);
  }
  
  return sanitized;
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

    const prNumber = pull_request.number;
    const headSha = pull_request.head.sha;
    const baseSha = pull_request.base.sha;
    const repoUrl = repository.clone_url;
    
    if (!repoUrl) {
        logger.warn('Invalid pull request payload - missing clone_url');
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
    
    // Create safe git operation parameters with enhanced validation
    const safeBranchName = createSafeBranchName(prNumber);
    const safeFetchRefspec = createSafeFetchRefspec(prNumber);
    
    try {
        // Clone repository with security options - using validated parameters
        await execSpawnSecure('git', ['clone', '--depth=50', '--no-hardlinks', '--single-branch', repoUrl, tempDir], {
            timeout: 300000 // 5 minute timeout
        });
        
        // Fetch and checkout pull request head (using secure refspec) - enhanced security
        await execSpawnSecure('git', ['fetch', 'origin', safeFetchRefspec], {
            cwd: tempDir,
            timeout: 60000 // 1 minute timeout
        });
        
        // Checkout using validated branch name - enhanced security
        await execSpawnSecure('git', ['checkout', safeBranchName], {
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
        
        // Create safe execution log prefix
        const safeLogPrefix = createSafeExecutionLogPrefix(prNumber);
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: safeLogPrefix,
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
        // Cleanup temporary directory with path validation - using secure command
        if (fs.existsSync(tempDir) && validateDirectoryPath(tempDir)) {
            await execSpawnSecure('rm', ['-rf', tempDir], { timeout: 30000 });
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

    // Create safe identifier for temporary directory (using validated SHA)
    const safeShaPrefix = sha.substring(0, 8);
    // Validate the SHA prefix before using it
    if (!/^[a-f0-9]{8}$/.test(safeShaPrefix)) {
        logger.error(`Invalid SHA prefix format: ${safeShaPrefix}`);
        return;
    }
    
    // Create secure temporary directory for cloning
    const tempDir = createSecureTempPath('push-check', safeShaPrefix);
    
    // Security: Validate the temporary directory path
    if (!validateDirectoryPath(tempDir)) {
        logger.error(`Invalid temporary directory path: ${tempDir}`);
        return;
    }
    
    try {
        // Clone repository with security options - using validated parameters
        await execSpawnSecure('git', ['clone', '--depth=50', '--no-hardlinks', repoUrl, tempDir], { 
            timeout: 300000 // 5 minute timeout
        });
        
        // Checkout specific commit (using validated and sanitized SHA) - enhanced security
        const sanitizedSha = sanitizeSHAForCheckout(sha);
        await execSpawnSecure('git', ['checkout', sanitizedSha], {
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
        
        // Create safe execution log prefix
        const safeLogPrefix = createSafePushLogPrefix(sha);
        
        // Run analysis
        const results = await analyzeCodebase({
            repoPath: tempDir,
            archetype: 'node-fullstack', // Could be configurable
            executionLogPrefix: safeLogPrefix,
            logger: analysisLogger
        });
        
        logger.info({
            sha: safeLogPrefix.replace('PUSH-', ''), // Extract validated short SHA from safe prefix
            totalFailures: results.XFI_RESULT.totalIssues,
            errorCount: results.XFI_RESULT.errorCount,
            warningCount: results.XFI_RESULT.warningCount
        }, 'Push analysis completed');
        
    } finally {
        // Cleanup temporary directory with path validation - using secure command
        if (fs.existsSync(tempDir) && validateDirectoryPath(tempDir)) {
            await execSpawnSecure('rm', ['-rf', tempDir], { timeout: 30000 });
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


