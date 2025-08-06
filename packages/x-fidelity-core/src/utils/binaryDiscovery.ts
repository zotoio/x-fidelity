import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
export interface BinaryDiscoveryResult {
  binary: string;
  path: string;
  source: 'system' | 'nvm' | 'volta' | 'fnm' | 'homebrew' | 'global' | 'fallback';
  version?: string;
}

export interface ShellInfo {
  shell: string;
  type: 'bash' | 'zsh' | 'fish' | 'cmd' | 'powershell' | 'unknown';
  platform: NodeJS.Platform;
}

/**
 * Detects the current shell environment
 */
export function detectShell(): ShellInfo {
  const platform = process.platform;
  const shell = process.env.SHELL || process.env.COMSPEC || '/bin/sh';
  
  let type: ShellInfo['type'] = 'unknown';
  if (platform === 'win32') {
    if (shell.includes('powershell') || shell.includes('pwsh')) {
      type = 'powershell';
    } else {
      type = 'cmd';
    }
  } else {
    if (shell.includes('zsh')) type = 'zsh';
    else if (shell.includes('bash')) type = 'bash';
    else if (shell.includes('fish')) type = 'fish';
  }

  return { shell, type, platform };
}

/**
 * Resolves nvm default version and returns the bin path
 * Reads ~/.nvm/alias/default and constructs ~/.nvm/versions/node/<version>/bin/
 */
export async function resolveNvmDefaultPath(): Promise<string | null> {
  try {
    const homeDir = os.homedir();
    const nvmDir = process.env.NVM_DIR || path.join(homeDir, '.nvm');
    const defaultAliasPath = path.join(nvmDir, 'alias', 'default');
    
    logger.debug(`Checking nvm default alias at: ${defaultAliasPath}`);
    
    if (!fs.existsSync(defaultAliasPath)) {
      logger.debug('nvm default alias file not found');
      return null;
    }
    
    // Read the default version from alias file
    const defaultVersion = fs.readFileSync(defaultAliasPath, 'utf8').trim();
    logger.debug(`Found nvm default version: ${defaultVersion}`);
    
    // Construct the actual bin path
    const binPath = path.join(nvmDir, 'versions', 'node', defaultVersion, 'bin');
    
    if (!fs.existsSync(binPath)) {
      logger.debug(`nvm bin path does not exist: ${binPath}`);
      return null;
    }
    
    logger.debug(`Resolved nvm bin path: ${binPath}`);
    return binPath;
  } catch (error) {
    logger.debug(`Error resolving nvm path:`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Resolves volta bin path
 */
export async function resolveVoltaPath(): Promise<string | null> {
  try {
    const homeDir = os.homedir();
    const voltaBinPath = path.join(homeDir, '.volta', 'bin');
    
    if (fs.existsSync(voltaBinPath)) {
      logger.debug(`Found volta bin path: ${voltaBinPath}`);
      return voltaBinPath;
    }
    
    return null;
  } catch (error) {
    logger.debug(`Error resolving volta path:`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Resolves fnm bin path
 */
export async function resolveFnmPath(): Promise<string | null> {
  try {
    const homeDir = os.homedir();
    
    // Check for current symlink (fnm default)
    const fnmCurrentPath = path.join(homeDir, '.fnm', 'current', 'bin');
    if (fs.existsSync(fnmCurrentPath)) {
      logger.debug(`Found fnm current bin path: ${fnmCurrentPath}`);
      return fnmCurrentPath;
    }
    
    // Try to find the latest installed version
    const fnmNodeVersionsPath = path.join(homeDir, '.fnm', 'node-versions');
    if (fs.existsSync(fnmNodeVersionsPath)) {
      const versions = fs.readdirSync(fnmNodeVersionsPath);
      if (versions.length > 0) {
        // Sort versions and take the latest
        const latestVersion = versions.sort().reverse()[0];
        const latestBinPath = path.join(fnmNodeVersionsPath, latestVersion, 'installation', 'bin');
        if (fs.existsSync(latestBinPath)) {
          logger.debug(`Found fnm latest version bin path: ${latestBinPath}`);
          return latestBinPath;
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.debug(`Error resolving fnm path:`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Uses system command to find binary
 */
export async function findBinaryWithWhich(binaryName: string): Promise<string | null> {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'where' : 'which';
    
    const { stdout } = await execFileAsync(command, [binaryName]);
    const binaryPath = stdout.trim().split('\n')[0]; // Take first result
    
    if (binaryPath && fs.existsSync(binaryPath)) {
      logger.debug(`Found ${binaryName} using ${isWindows ? 'where' : 'which'}: ${binaryPath}`);
      return binaryPath;
    }
    
    return null;
  } catch (error) {
    logger.debug(`${binaryName} not found using which/where:`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Gets all possible paths for package managers based on platform and version managers
 * @param overridePath Optional override path to use as first priority
 */
export async function getPackageManagerPaths(overridePath?: string): Promise<string[]> {
  const paths: string[] = [];
  const homeDir = os.homedir();
  const platform = process.platform;
  
  // If override path is provided, use it first
  if (overridePath) {
    const resolvedPath = overridePath.replace(/^~/, homeDir);
    if (fs.existsSync(resolvedPath)) {
      paths.push(resolvedPath);
      logger.debug(`Using override binary path: ${resolvedPath}`);
    } else {
      logger.warn(`Override binary path does not exist: ${resolvedPath}`);
    }
  }
  
  // Version manager paths (highest priority)
  const nvmPath = await resolveNvmDefaultPath();
  if (nvmPath) paths.push(nvmPath);
  
  const voltaPath = await resolveVoltaPath();
  if (voltaPath) paths.push(voltaPath);
  
  const fnmPath = await resolveFnmPath();
  if (fnmPath) paths.push(fnmPath);
  
  // Platform-specific paths
  if (platform === 'darwin') {
    // macOS Homebrew
    paths.push('/opt/homebrew/bin'); // Apple Silicon
    paths.push('/usr/local/bin'); // Intel
    paths.push('/opt/homebrew/share/npm/bin');
    paths.push('/usr/local/share/npm/bin');
  } else if (platform === 'linux') {
    // Linux package managers
    paths.push('/usr/bin');
    paths.push('/usr/local/bin');
    paths.push(`${homeDir}/.local/bin`);
  } else if (platform === 'win32') {
    // Windows paths
    paths.push('C:\\Program Files\\nodejs');
    paths.push('C:\\Program Files (x86)\\nodejs');
    if (process.env.APPDATA) {
      paths.push(`${process.env.APPDATA}\\npm`);
    }
  }
  
  // Global yarn installation
  paths.push(path.join(homeDir, '.yarn', 'bin'));
  
  // System PATH (lower priority to avoid GUI launch issues on macOS)
  const systemPath = process.env.PATH;
  if (systemPath) {
    const pathSeparator = platform === 'win32' ? ';' : ':';
    paths.push(...systemPath.split(pathSeparator));
  }
  
  // Deduplicate and filter existing paths
  const uniquePaths = [...new Set(paths)].filter(p => {
    try {
      return p && fs.existsSync(p);
    } catch {
      return false;
    }
  });
  
  logger.debug(`Resolved package manager paths:`, {
    totalPaths: uniquePaths.length,
    nvmPath: nvmPath || 'not found',
    voltaPath: voltaPath || 'not found',
    fnmPath: fnmPath || 'not found',
    platform
  });
  
  return uniquePaths;
}

/**
 * Discovers any Node.js-related binary using multiple strategies
 * Supports node, npm, yarn, npx, and other Node.js binaries
 */
export async function discoverBinary(binaryName: string): Promise<BinaryDiscoveryResult | null> {
  logger.debug(`Discovering ${binaryName} binary...`);
  
  // Strategy 1: Try which/where command (most reliable for system installs)
  const whichResult = await findBinaryWithWhich(binaryName);
  if (whichResult) {
    try {
      const { stdout } = await execFileAsync(whichResult, ['--version']);
      return {
        binary: binaryName,
        path: whichResult,
        source: 'system',
        version: stdout.trim()
      };
    } catch {
      // Binary exists but version check failed, still use it
      return {
        binary: binaryName,
        path: whichResult,
        source: 'system'
      };
    }
  }
  
  // Strategy 2: Search in package manager paths
  const packageManagerPaths = await getPackageManagerPaths();
  
  for (const basePath of packageManagerPaths) {
    const binaryPath = path.join(basePath, binaryName);
    const binaryPathWithExt = process.platform === 'win32' ? `${binaryPath}.cmd` : binaryPath;
    
    for (const candidatePath of [binaryPath, binaryPathWithExt]) {
      try {
        if (fs.existsSync(candidatePath)) {
          const stats = fs.statSync(candidatePath);
          if (stats.isFile() && (stats.mode & 0o111 || process.platform === 'win32')) {
            // Determine source based on path
            let source: BinaryDiscoveryResult['source'] = 'fallback';
            if (basePath.includes('.nvm')) source = 'nvm';
            else if (basePath.includes('.volta')) source = 'volta';
            else if (basePath.includes('.fnm')) source = 'fnm';
            else if (basePath.includes('homebrew') || basePath.includes('/usr/local')) source = 'homebrew';
            else if (basePath.includes('.yarn')) source = 'global';
            
            try {
              const { stdout } = await execFileAsync(candidatePath, ['--version']);
              return {
                binary: binaryName,
                path: candidatePath,
                source,
                version: stdout.trim()
              };
            } catch {
              // Binary exists but version check failed, still use it
              return {
                binary: binaryName,
                path: candidatePath,
                source
              };
            }
          }
        }
      } catch (error) {
        logger.debug(`Error checking binary at ${candidatePath}:`, { error: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }
  }
  
  logger.debug(`${binaryName} binary not found`);
  return null;
}

/**
 * Discovers both npm and yarn binaries
 */
export async function discoverPackageManagers(): Promise<{
  npm: BinaryDiscoveryResult | null;
  yarn: BinaryDiscoveryResult | null;
}> {
  const [npm, yarn] = await Promise.all([
    discoverBinary('npm'),
    discoverBinary('yarn')
  ]);
  
  logger.info('Package manager discovery complete:', {
    npm: npm ? `${npm.path} (${npm.source}${npm.version ? `, v${npm.version}` : ''})` : 'not found',
    yarn: yarn ? `${yarn.path} (${yarn.source}${yarn.version ? `, v${yarn.version}` : ''})` : 'not found'
  });
  
  return { npm, yarn };
}

/**
 * Creates an enhanced environment with discovered package manager paths
 * @param overridePath Optional override path to use as first priority
 */
export async function createEnhancedEnvironment(overridePath?: string): Promise<Record<string, string>> {
  const packageManagerPaths = await getPackageManagerPaths(overridePath);
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  
  // Create enhanced PATH with package manager paths first
  const originalPath = process.env.PATH || '';
  const enhancedPath = [...packageManagerPaths, ...originalPath.split(pathSeparator)]
    .filter((p, i, arr) => p && arr.indexOf(p) === i) // Deduplicate
    .join(pathSeparator);
  
  return {
    ...process.env,
    PATH: enhancedPath
  };
}

/**
 * Gets the global directory for a package manager using reliable binary discovery
 */
export async function getGlobalDirectory(packageManager: 'npm' | 'yarn'): Promise<string | null> {
  try {
    const binaryResult = await discoverBinary(packageManager);
    if (!binaryResult) {
      logger.debug(`${packageManager} binary not found, cannot get global directory`);
      return null;
    }
    
    const command = packageManager === 'npm' ? 'prefix -g' : 'global dir';
    const { stdout } = await execAsync(`"${binaryResult.path}" ${command}`);
    const globalDir = stdout.trim();
    
    if (globalDir && fs.existsSync(globalDir)) {
      logger.debug(`Found ${packageManager} global directory: ${globalDir}`);
      return globalDir;
    }
    
    return null;
  } catch (error) {
    logger.debug(`Error getting ${packageManager} global directory:`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

