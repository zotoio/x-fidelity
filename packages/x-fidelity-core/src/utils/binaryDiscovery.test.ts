import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock the utility functions directly at module level
const mockExecAsync = jest.fn();

// Mock dependencies with explicit implementations
jest.mock('fs');
jest.mock('os');
jest.mock('./logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('child_process', () => ({
  exec: jest.fn()
}));
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Import after mocking
import {
  resolveNvmDefaultPath,
  resolveVoltaPath,
  resolveFnmPath,
  findBinaryWithWhich,
  discoverBinary,
  detectShell,
  getPackageManagerPaths,
  discoverPackageManagers,
  createEnhancedEnvironment,
  getGlobalDirectory
} from './binaryDiscovery';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('binaryDiscovery', () => {
  let originalPlatform: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Store original values
    originalPlatform = process.platform;
    originalEnv = { ...process.env };
    
    // Default mocks
    mockedOs.homedir.mockReturnValue('/Users/testuser');
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    
    // Default fs.existsSync behavior
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.statSync.mockReturnValue({
      isFile: () => true,
      mode: 0o755 // Executable file
    } as any);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    // Set up default mock behavior for exec async
    mockExecAsync.mockImplementation((...args: any[]) => {
      const [command, secondArg] = args;
      if (command === 'which' && secondArg && secondArg[0] === 'npm') {
        return Promise.resolve({ stdout: '/usr/local/bin/npm\n', stderr: '' });
      } else if (command === 'which' && secondArg && secondArg[0] === 'yarn') {
        return Promise.resolve({ stdout: '/usr/local/bin/yarn\n', stderr: '' });
      } else if (command === 'where' && secondArg && secondArg[0] === 'npm') {
        return Promise.resolve({ stdout: 'C:\\Program Files\\nodejs\\npm.cmd\n', stderr: '' });
      } else if (typeof command === 'string' && command.includes('--version')) {
        return Promise.resolve({ stdout: '8.19.2\n', stderr: '' });
      } else if (typeof command === 'string' && command.includes('global dir')) {
        return Promise.resolve({ stdout: '/Users/testuser/.config/yarn/global\n', stderr: '' });
      } else {
        return Promise.reject(new Error('Command not found'));
      }
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    process.env = originalEnv;
  });

  describe('detectShell', () => {
    test('should detect zsh shell on macOS', () => {
      process.env.SHELL = '/bin/zsh';

      const result = detectShell();
      
      expect(result.type).toBe('zsh');
      expect(result.shell).toBe('/bin/zsh');
      expect(result.platform).toBe('darwin');
    });

    test('should detect bash shell', () => {
      process.env.SHELL = '/bin/bash';

      const result = detectShell();
      
      expect(result.type).toBe('bash');
      expect(result.shell).toBe('/bin/bash');
    });

    test('should detect PowerShell on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      delete process.env.SHELL;
      process.env.COMSPEC = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

      const result = detectShell();
      
      expect(result.type).toBe('powershell');
      expect(result.platform).toBe('win32');
    });

    test('should detect cmd on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      delete process.env.SHELL;
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';

      const result = detectShell();
      
      expect(result.type).toBe('cmd');
      expect(result.platform).toBe('win32');
    });

    test('should handle unknown shell', () => {
      process.env.SHELL = '/some/unknown/shell';

      const result = detectShell();
      
      expect(result.type).toBe('unknown');
      expect(result.shell).toBe('/some/unknown/shell');
    });

    test('should use fallback when no shell is set', () => {
      delete process.env.SHELL;
      delete process.env.COMSPEC;

      const result = detectShell();
      
      expect(result.shell).toBe('/bin/sh');
    });
  });

  describe('resolveNvmDefaultPath', () => {
    test('should resolve nvm default version path correctly', async () => {
      // Use the actual home directory that os.homedir() returns during the test
      const homeDir = os.homedir(); // This will be whatever Jest environment provides
      const nvmDefaultPath = `${homeDir}/.nvm/alias/default`;
      const nvmBinPath = `${homeDir}/.nvm/versions/node/v18.17.0/bin`;
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        return pathStr === nvmDefaultPath || pathStr === nvmBinPath;
      });
      
      (mockedFs.readFileSync as any).mockImplementation((filePath: any, encoding: any) => {
        const pathStr = String(filePath);
        if (pathStr === nvmDefaultPath && encoding === 'utf8') {
          return 'v18.17.0\n'; // Simulate default alias content with newline
        }
        throw new Error('File not found');
      });

      const result = await resolveNvmDefaultPath();
      
      expect(result).toBe(nvmBinPath);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(nvmDefaultPath, 'utf8');
    });

    test('should return null when nvm default alias does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await resolveNvmDefaultPath();
      
      expect(result).toBeNull();
    });

    test('should return null when nvm bin path does not exist', async () => {
      const nvmDefaultPath = '/Users/testuser/.nvm/alias/default';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === nvmDefaultPath;
      });
      
      mockedFs.readFileSync.mockReturnValue('v18.17.0');

      const result = await resolveNvmDefaultPath();
      
      expect(result).toBeNull();
    });

    test('should handle custom NVM_DIR environment variable', async () => {
      process.env.NVM_DIR = '/custom/nvm/path';
      const customDefaultPath = '/custom/nvm/path/alias/default';
      const customBinPath = '/custom/nvm/path/versions/node/v18.17.0/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === customDefaultPath || filePath === customBinPath;
      });
      
      mockedFs.readFileSync.mockReturnValue('v18.17.0');

      const result = await resolveNvmDefaultPath();
      
      expect(result).toBe(customBinPath);
    });

    test('should handle file read errors gracefully', async () => {
      const nvmDefaultPath = '/Users/testuser/.nvm/alias/default';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === nvmDefaultPath;
      });
      
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await resolveNvmDefaultPath();
      
      expect(result).toBeNull();
    });
  });

  describe('resolveVoltaPath', () => {
    test('should return volta bin path when it exists', async () => {
      const voltaBinPath = '/Users/testuser/.volta/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === voltaBinPath;
      });

      const result = await resolveVoltaPath();
      
      expect(result).toBe(voltaBinPath);
    });

    test('should return null when volta bin path does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await resolveVoltaPath();
      
      expect(result).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = await resolveVoltaPath();
      
      expect(result).toBeNull();
    });
  });

  describe('resolveFnmPath', () => {
    test('should return fnm current path when it exists', async () => {
      const fnmCurrentPath = '/Users/testuser/.fnm/current/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === fnmCurrentPath;
      });

      const result = await resolveFnmPath();
      
      expect(result).toBe(fnmCurrentPath);
    });

    test('should find latest version when current symlink does not exist', async () => {
      const fnmVersionsPath = '/Users/testuser/.fnm/node-versions';
      const latestBinPath = '/Users/testuser/.fnm/node-versions/v20.0.0/installation/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === fnmVersionsPath || filePath === latestBinPath;
      });
      
      mockedFs.readdirSync.mockReturnValue(['v18.17.0', 'v20.0.0', 'v16.20.0'] as any);

      const result = await resolveFnmPath();
      
      expect(result).toBe(latestBinPath);
    });

    test('should return null when no fnm installations exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await resolveFnmPath();
      
      expect(result).toBeNull();
    });

    test('should handle readdir errors gracefully', async () => {
      const fnmVersionsPath = '/Users/testuser/.fnm/node-versions';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === fnmVersionsPath;
      });
      
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await resolveFnmPath();
      
      expect(result).toBeNull();
    });
  });

  describe('findBinaryWithWhich', () => {

    test('should find npm using which on Unix', async () => {
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        if (command === 'which' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/npm';
      });

      const result = await findBinaryWithWhich('npm');
      
      expect(result).toBe('/usr/local/bin/npm');
    });

    test('should find npm using where on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: 'C:\\Program Files\\nodejs\\npm.cmd\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === 'C:\\Program Files\\nodejs\\npm.cmd';
      });

      const result = await findBinaryWithWhich('npm');
      
      expect(result).toBe('C:\\Program Files\\nodejs\\npm.cmd');
    });

    test('should return null when binary is not found', async () => {
      const result = await findBinaryWithWhich('nonexistent');
      
      expect(result).toBeNull();
    });

    test('should return null when binary path does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await findBinaryWithWhich('npm');
      
      expect(result).toBeNull();
    });
  });

  describe('getPackageManagerPaths', () => {
    test('should include nvm path when available', async () => {
      const homeDir = '/Users/testuser';
      const nvmDefaultPath = `${homeDir}/.nvm/alias/default`;
      const nvmBinPath = `${homeDir}/.nvm/versions/node/v18.17.0/bin`;
      
      // Ensure homedir mock is set
      mockedOs.homedir.mockReturnValue(homeDir);
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        return pathStr === nvmDefaultPath || 
               pathStr === nvmBinPath ||
               pathStr === '/usr/local/bin' ||
               pathStr === '/opt/homebrew/bin';
      });
      
      (mockedFs.readFileSync as any).mockImplementation((filePath: any, encoding: any) => {
        const pathStr = String(filePath);
        if (pathStr === nvmDefaultPath && encoding === 'utf8') {
          return 'v18.17.0\n'; // Include newline for trim()
        }
        throw new Error('File not found');
      });

      const result = await getPackageManagerPaths();
      
      expect(result).toContain(nvmBinPath);
    });

    test('should include platform-specific paths on macOS', async () => {
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin' || 
               filePath === '/opt/homebrew/bin';
      });

      const result = await getPackageManagerPaths();
      
      expect(result).toContain('/usr/local/bin');
      expect(result).toContain('/opt/homebrew/bin');
    });

    test('should include platform-specific paths on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/bin' || 
               filePath === '/usr/local/bin' ||
               filePath === '/Users/testuser/.local/bin';
      });

      const result = await getPackageManagerPaths();
      
      expect(result).toContain('/usr/bin');
      expect(result).toContain('/usr/local/bin');
    });

    test('should include platform-specific paths on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      process.env.APPDATA = 'C:\\Users\\testuser\\AppData\\Roaming';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === 'C:\\Program Files\\nodejs' || 
               filePath === 'C:\\Users\\testuser\\AppData\\Roaming\\npm';
      });

      const result = await getPackageManagerPaths();
      
      expect(result).toContain('C:\\Program Files\\nodejs');
      expect(result).toContain('C:\\Users\\testuser\\AppData\\Roaming\\npm');
    });

    test('should include system PATH', async () => {
      process.env.PATH = '/usr/bin:/usr/local/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/bin' || filePath === '/usr/local/bin';
      });

      const result = await getPackageManagerPaths();
      
      expect(result).toContain('/usr/bin');
      expect(result).toContain('/usr/local/bin');
    });

    test('should deduplicate paths', async () => {
      process.env.PATH = '/usr/local/bin:/opt/homebrew/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin' || filePath === '/opt/homebrew/bin';
      });

      const result = await getPackageManagerPaths();
      
      // Should only have one instance of each path
      expect(result.filter(p => p === '/usr/local/bin')).toHaveLength(1);
      expect(result.filter(p => p === '/opt/homebrew/bin')).toHaveLength(1);
    });
  });

  describe('discoverBinary', () => {

    test('should discover binary using which command', async () => {
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'which' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        // Handle execAsync calls (command as string)
        if (typeof command === 'string' && command.includes('"/usr/local/bin/npm" --version')) {
          return Promise.resolve({ stdout: '8.19.2\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/npm';
      });

      const result = await discoverBinary('npm');
      
      expect(result).toEqual({
        binary: 'npm',
        path: '/usr/local/bin/npm',
        source: 'system',
        version: '8.19.2'
      });
    });

    test('should discover any Node.js binary (node, npx, etc.)', async () => {
      const testBinaries = ['node', 'npx', 'pnpm'];
      
      for (const binary of testBinaries) {
        mockExecAsync.mockImplementation((...args: any[]) => {
          const [command, secondArg] = args;
          // Handle execFileAsync calls (command and args separately)
          if (command === 'which' && secondArg && secondArg[0] === binary) {
            return Promise.resolve({ stdout: `/usr/local/bin/${binary}\n` });
          }
          if (command === 'where' && secondArg && secondArg[0] === binary) {
            return Promise.resolve({ stdout: `/usr/local/bin/${binary}\n` });
          }
          // Handle execAsync calls (command as string)
          if (typeof command === 'string' && command.includes(`"/usr/local/bin/${binary}" --version`)) {
            return Promise.resolve({ stdout: '1.0.0\n' });
          }
          return Promise.reject(new Error('Command not found'));
        });

        mockedFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === `/usr/local/bin/${binary}`;
        });

        const result = await discoverBinary(binary);

        expect(result).toEqual({
          binary: binary,
          path: `/usr/local/bin/${binary}`,
          source: 'system',
          version: '1.0.0'
        });
      }
    });

    test('should discover binary in package manager paths', async () => {
      const homeDir = '/Users/testuser';
      const nvmDefaultPath = `${homeDir}/.nvm/alias/default`;
      const nvmBinPath = `${homeDir}/.nvm/versions/node/v18.17.0/bin`;
      const npmPath = path.join(nvmBinPath, 'npm');
      
      // Ensure homedir mock is set
      mockedOs.homedir.mockReturnValue(homeDir);
      
      // Mock file system for nvm structure
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        return pathStr === nvmDefaultPath || 
               pathStr === nvmBinPath ||
               pathStr === npmPath;
      });
      
      (mockedFs.readFileSync as any).mockImplementation((filePath: any, encoding: any) => {
        const pathStr = String(filePath);
        if (pathStr === nvmDefaultPath && encoding === 'utf8') {
          return 'v18.17.0\n'; // Include newline for trim()
        }
        throw new Error('File not found');
      });

      // Override the mock for this test to ensure which fails
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command] = args;
        if (typeof command === 'string' && command.includes('--version')) {
          return Promise.resolve({ stdout: '8.19.2\n', stderr: '' });
        } else {
          return Promise.reject(new Error('Command not found'));
        }
      });

      const result = await discoverBinary('npm');
      
      expect(result).toEqual({
        binary: 'npm',
        path: npmPath,
        source: 'nvm',
        version: '8.19.2'
      });
    });

    test('should handle Windows executable extensions', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      
      const npmPath = 'C:\\Program Files\\nodejs\\npm.cmd';
      
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: `${npmPath}\n` });
        }
        // Handle execAsync calls (command as string)
        if (typeof command === 'string' && command.includes(`"${npmPath}" --version`)) {
          return Promise.resolve({ stdout: '8.19.2\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === 'C:\\Program Files\\nodejs' || 
               filePath === npmPath;
      });

      const result = await discoverBinary('npm');
      
      expect(result?.path).toBe(npmPath);
    });

    test('should return null when binary is not found', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await discoverBinary('npm');
      
      expect(result).toBeNull();
    });

    test('should handle version check failures gracefully', async () => {
      // Override the mock for this test
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'which' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        // Handle execAsync calls (command as string) - fail version check
        if (typeof command === 'string' && command.includes('--version')) {
          return Promise.reject(new Error('Version check failed'));
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/npm';
      });

      const result = await discoverBinary('npm');
      
      expect(result).toEqual({
        binary: 'npm',
        path: '/usr/local/bin/npm',
        source: 'system'
      });
    });

    test('should identify different sources correctly', async () => {
      const homeDir = '/Users/testuser';
      
      // Ensure homedir mock is set
      mockedOs.homedir.mockReturnValue(homeDir);
      
      // Make which/where command fail so we use Strategy 2 (package manager paths)
      mockExecAsync.mockImplementation(() => Promise.reject(new Error('Command not found')));
      
      // Test each source type individually
      const testCases = [
        { path: '/Users/testuser/.nvm/versions/node/v18.17.0/bin/npm', expectedSource: 'nvm' },
        { path: '/Users/testuser/.volta/bin/npm', expectedSource: 'volta' },
        { path: '/Users/testuser/.fnm/current/bin/npm', expectedSource: 'fnm' },
        { path: '/opt/homebrew/bin/npm', expectedSource: 'homebrew' },
        { path: '/usr/local/bin/npm', expectedSource: 'homebrew' },
        { path: '/Users/testuser/.yarn/bin/npm', expectedSource: 'global' },
        { path: '/usr/bin/npm', expectedSource: 'fallback' }
      ];

      for (const testCase of testCases) {
        const basePath = path.dirname(testCase.path);
        
        // Mock nvm, volta, fnm functions to return appropriate paths
        if (testCase.expectedSource === 'nvm') {
          const nvmDefaultPath = `${homeDir}/.nvm/alias/default`;
          mockedFs.existsSync.mockImplementation((filePath: any) => {
            const pathStr = String(filePath);
            return pathStr === nvmDefaultPath || 
                   pathStr === basePath || 
                   pathStr === testCase.path;
          });
          (mockedFs.readFileSync as any).mockImplementation((filePath: any, encoding: any) => {
            const pathStr = String(filePath);
            if (pathStr === nvmDefaultPath && encoding === 'utf8') {
              return 'v18.17.0\n';
            }
            throw new Error('File not found');
          });
        } else {
          // For non-nvm tests, make sure nvm paths don't exist but test paths do
          mockedFs.existsSync.mockImplementation((filePath: any) => {
            const pathStr = String(filePath);
            return pathStr === basePath || pathStr === testCase.path;
          });
        }
        
        mockedFs.statSync.mockReturnValue({
          isFile: () => true,
          mode: 0o755
        } as any);

        const result = await discoverBinary('npm');
        
        expect(result?.source).toBe(testCase.expectedSource);
        expect(result?.path).toBe(testCase.path);
      }
    });
  });

  describe('discoverPackageManagers', () => {
    test('should discover both npm and yarn', async () => {
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'which' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        if (command === 'which' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n' });
        }
        // Handle execAsync calls (command as string)
        if (typeof command === 'string' && command.includes('"/usr/local/bin/npm" --version')) {
          return Promise.resolve({ stdout: '8.19.2\n' });
        }
        if (typeof command === 'string' && command.includes('"/usr/local/bin/yarn" --version')) {
          return Promise.resolve({ stdout: '1.22.19\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/npm' || filePath === '/usr/local/bin/yarn';
      });

      const result = await discoverPackageManagers();
      
      expect(result.npm).toBeTruthy();
      expect(result.yarn).toBeTruthy();
      expect(result.npm?.path).toBe('/usr/local/bin/npm');
      expect(result.yarn?.path).toBe('/usr/local/bin/yarn');
    });

    test('should handle missing package managers gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await discoverPackageManagers();
      
      expect(result.npm).toBeNull();
      expect(result.yarn).toBeNull();
    });
  });

  describe('createEnhancedEnvironment', () => {
    test('should create enhanced PATH with package manager paths', async () => {
      process.env.PATH = '/usr/bin:/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin' || 
               filePath === '/usr/bin' || 
               filePath === '/bin';
      });

      const result = await createEnhancedEnvironment();
      
      expect(result.PATH).toContain('/usr/local/bin');
      expect(result.PATH).toContain('/usr/bin');
      expect(result.PATH).toContain('/bin');
    });

    test('should preserve original environment variables', async () => {
      process.env.NODE_ENV = 'test';
      process.env.PATH = '/usr/bin';
      
      mockedFs.existsSync.mockReturnValue(false);

      const result = await createEnhancedEnvironment();
      
      expect(result.NODE_ENV).toBe('test');
    });

    test('should deduplicate PATH entries', async () => {
      process.env.PATH = '/usr/local/bin:/usr/bin';
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin' || filePath === '/usr/bin';
      });

      const result = await createEnhancedEnvironment();
      
      const pathEntries = result.PATH?.split(':') || [];
      const localBinCount = pathEntries.filter(p => p === '/usr/local/bin').length;
      expect(localBinCount).toBe(1);
    });
  });

  describe('getGlobalDirectory', () => {
    test('should get npm global directory successfully', async () => {
      // Override the mock for this test
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'which' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'npm') {
          return Promise.resolve({ stdout: '/usr/local/bin/npm\n' });
        }
        // Handle execAsync calls (command as string)
        if (typeof command === 'string' && command.includes('prefix -g')) {
          return Promise.resolve({ stdout: '/usr/local\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/npm' || 
               filePath === '/usr/local';
      });

      const result = await getGlobalDirectory('npm');
      
      expect(result).toBe('/usr/local');
    });

    test('should get yarn global directory successfully', async () => {
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        // Handle execFileAsync calls (command and args separately)
        if (command === 'which' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n' });
        }
        if (command === 'where' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n' });
        }
        // Handle execAsync calls (command as string)
        if (typeof command === 'string' && command.includes('global dir')) {
          return Promise.resolve({ stdout: '/Users/testuser/.config/yarn/global\n' });
        }
        return Promise.reject(new Error('Command not found'));
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/yarn' || 
               filePath === '/Users/testuser/.config/yarn/global';
      });

      const result = await getGlobalDirectory('yarn');
      
      expect(result).toBe('/Users/testuser/.config/yarn/global');
    });

    test('should return null when yarn is not found', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await getGlobalDirectory('yarn');
      
      expect(result).toBeNull();
    });

    test('should return null when global directory does not exist', async () => {
      // Override the mock for this test
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        if (command === 'which' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n', stderr: '' });
        } else if (typeof command === 'string' && command.includes('global dir')) {
          return Promise.resolve({ stdout: '/nonexistent/path\n', stderr: '' });
        } else {
          return Promise.reject(new Error('Command not found'));
        }
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/yarn';
      });

      const result = await getGlobalDirectory('yarn');
      
      expect(result).toBeNull();
    });

    test('should handle yarn global dir command errors', async () => {
      // Override the mock for this test
      mockExecAsync.mockImplementation((...args: any[]) => {
        const [command, secondArg] = args;
        if (command === 'which' && secondArg && secondArg[0] === 'yarn') {
          return Promise.resolve({ stdout: '/usr/local/bin/yarn\n', stderr: '' });
        } else if (typeof command === 'string' && command.includes('global dir')) {
          return Promise.reject(new Error('yarn global dir failed'));
        } else {
          return Promise.reject(new Error('Command not found'));
        }
      });
      
      mockedFs.existsSync.mockImplementation((filePath: any) => {
        return filePath === '/usr/local/bin/yarn';
      });

      const result = await getGlobalDirectory('yarn');
      
      expect(result).toBeNull();
    });
  });
});