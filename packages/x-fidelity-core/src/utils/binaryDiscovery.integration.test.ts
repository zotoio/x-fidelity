import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { 
  detectShell, 
  getPackageManagerPaths, 
  discoverBinary, 
  discoverPackageManagers,
  createEnhancedEnvironment,
  getGlobalDirectory,
  resolveNvmDefaultPath,
  resolveVoltaPath,
  resolveFnmPath,
  findBinaryWithWhich
} from './binaryDiscovery';

// Platform detection
const platform = os.platform();
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';
const isLinux = platform === 'linux';

describe('Binary Discovery Core Integration Tests', () => {
  let testHomeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temporary test directory
    testHomeDir = path.join(os.tmpdir(), `xfi-core-test-${Date.now()}`);
    fs.mkdirSync(testHomeDir, { recursive: true });

    // Backup original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up test directory
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true, force: true });
    }
  });

  describe('Shell Detection', () => {
    test('should detect current shell correctly', () => {
      const shell = detectShell();
      
      expect(shell).toBeDefined();
      expect(shell.shell).toBeDefined();
      expect(shell.type).toBeDefined();
      
      console.log(`✅ Detected shell: ${shell.shell} (${shell.type})`);
      
      if (isWindows) {
        expect(['cmd', 'powershell', 'pwsh'].includes(shell.type)).toBe(true);
      } else {
        expect(['bash', 'zsh', 'fish', 'sh'].includes(shell.type)).toBe(true);
      }
    });

    test('should handle missing SHELL environment variable', () => {
      delete process.env.SHELL;
      delete process.env.ComSpec;
      
      const shell = detectShell();
      
      expect(shell).toBeDefined();
      expect(shell.shell).toBeDefined();
      expect(shell.type).toBeDefined();
      
      console.log(`✅ Fallback shell detection: ${shell.shell} (${shell.type})`);
    });
  });

  describe('Real Binary Discovery', () => {
    test('should discover system npm', async () => {
      const result = await discoverBinary('npm');
      
      expect(result).not.toBeNull();
      expect(result?.binary).toBe('npm');
      expect(result?.path).toBeDefined();
      expect(fs.existsSync(result!.path)).toBe(true);
      
      console.log(`✅ Found npm: ${result?.path} (${result?.source})`);
    }, 30000);

    test('should discover system node', async () => {
      const result = await discoverBinary('node');
      
      expect(result).not.toBeNull();
      expect(result?.binary).toBe('node');
      expect(result?.path).toBeDefined();
      expect(fs.existsSync(result!.path)).toBe(true);
      
      console.log(`✅ Found node: ${result?.path} (${result?.source})`);
    }, 30000);

    test('should handle non-existent binary gracefully', async () => {
      const result = await discoverBinary('definitely-not-a-real-binary-12345');
      
      expect(result).toBeNull();
      console.log('✅ Non-existent binary handled correctly');
    }, 15000);

    test('should discover multiple binaries efficiently', async () => {
      const startTime = Date.now();
      
      const results = await discoverPackageManagers();
      
      const duration = Date.now() - startTime;
      
      expect(results.npm).not.toBeNull();
      expect(results.npm?.binary).toBe('npm');
      
      // Yarn may or may not be available
      if (results.yarn) {
        expect(results.yarn.binary).toBe('yarn');
      }
      
      console.log(`✅ Package manager discovery completed in ${duration}ms`);
      console.log(`   npm: ${results.npm?.path} (${results.npm?.source})`);
      console.log(`   yarn: ${results.yarn ? `${results.yarn.path} (${results.yarn.source})` : 'not found'}`);
    }, 30000);
  });

  describe('Platform-Specific Path Discovery', () => {
    test('should return appropriate paths for current platform', async () => {
      const paths = await getPackageManagerPaths();
      
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
      
      // Verify paths exist on filesystem
      const existingPaths = paths.filter(p => fs.existsSync(p));
      expect(existingPaths.length).toBeGreaterThan(0);
      
      console.log(`✅ Found ${paths.length} total paths, ${existingPaths.length} exist on filesystem`);
      console.log(`   Platform: ${platform}`);
      console.log(`   Sample paths: ${paths.slice(0, 5).join(', ')}`);
      
      if (isWindows) {
        // Should include some Windows-specific paths
        const windowsPaths = paths.filter(p => 
          p.toLowerCase().includes('program files') || 
          p.toLowerCase().includes('windows') ||
          p.toLowerCase().includes('nodejs')
        );
        console.log(`   Windows-specific paths: ${windowsPaths.length}`);
      } else if (isMacOS) {
        // Should include some macOS-specific paths
        const macPaths = paths.filter(p => 
          p.includes('/opt/homebrew') || 
          p.includes('/usr/local') ||
          p.includes('.nvm') ||
          p.includes('.volta')
        );
        console.log(`   macOS-specific paths: ${macPaths.length}`);
      } else if (isLinux) {
        // Should include some Linux-specific paths
        const linuxPaths = paths.filter(p => 
          p.includes('/usr/bin') || 
          p.includes('/usr/local') ||
          p.includes('/snap')
        );
        console.log(`   Linux-specific paths: ${linuxPaths.length}`);
      }
    }, 15000);

    test('should handle override path correctly', async () => {
      const overrideDir = path.join(testHomeDir, 'override-test');
      fs.mkdirSync(overrideDir, { recursive: true });
      
      const paths = await getPackageManagerPaths(overrideDir);
      
      expect(paths).toContain(overrideDir);
      expect(paths[0]).toBe(overrideDir);
      
      console.log(`✅ Override path ${overrideDir} correctly prioritized`);
    }, 10000);

    test('should expand tilde in override path', async () => {
      const tildeOverride = '~/test-binary-override';
      const expandedPath = tildeOverride.replace(/^~/, os.homedir());
      
      // Create the directory
      fs.mkdirSync(expandedPath, { recursive: true });
      
      try {
        const paths = await getPackageManagerPaths(tildeOverride);
        
        expect(paths).toContain(expandedPath);
        console.log(`✅ Tilde path ${tildeOverride} expanded to ${expandedPath}`);
      } finally {
        fs.rmSync(expandedPath, { recursive: true, force: true });
      }
    }, 10000);
  });

  describe('Version Manager Detection', () => {
    test('should detect nvm if present', async () => {
      const homeDir = os.homedir();
      const nvmDir = path.join(homeDir, '.nvm');
      
      if (fs.existsSync(nvmDir)) {
        const nvmPath = await resolveNvmDefaultPath();
        
        if (nvmPath) {
          expect(nvmPath).toContain('.nvm');
          expect(nvmPath).toContain('bin');
          console.log(`✅ NVM detected: ${nvmPath}`);
        } else {
          console.log('⚠️ NVM directory exists but default path not resolved');
        }
      } else {
        console.log('ℹ️ NVM not installed on this system');
      }
    }, 10000);

    test('should detect volta if present', async () => {
      const homeDir = os.homedir();
      const voltaDir = path.join(homeDir, '.volta');
      
      if (fs.existsSync(voltaDir)) {
        const voltaPath = await resolveVoltaPath();
        
        if (voltaPath) {
          expect(voltaPath).toContain('.volta');
          expect(voltaPath).toContain('bin');
          console.log(`✅ Volta detected: ${voltaPath}`);
        } else {
          console.log('⚠️ Volta directory exists but path not resolved');
        }
      } else {
        console.log('ℹ️ Volta not installed on this system');
      }
    }, 10000);

    test('should detect fnm if present', async () => {
      const homeDir = os.homedir();
      const fnmDir = path.join(homeDir, '.fnm');
      
      if (fs.existsSync(fnmDir)) {
        const fnmPath = await resolveFnmPath();
        
        if (fnmPath) {
          expect(fnmPath).toContain('.fnm');
          expect(fnmPath).toContain('bin');
          console.log(`✅ FNM detected: ${fnmPath}`);
        } else {
          console.log('⚠️ FNM directory exists but path not resolved');
        }
      } else {
        console.log('ℹ️ FNM not installed on this system');
      }
    }, 10000);
  });

  describe('Which/Where Command Integration', () => {
    test('should find npm using which/where command', async () => {
      const npmPath = await findBinaryWithWhich('npm');
      
      if (npmPath) {
        expect(fs.existsSync(npmPath)).toBe(true);
        console.log(`✅ Found npm via which/where: ${npmPath}`);
      } else {
        console.log('⚠️ npm not found via which/where (may not be in PATH)');
      }
    }, 15000);

    test('should find node using which/where command', async () => {
      const nodePath = await findBinaryWithWhich('node');
      
      if (nodePath) {
        expect(fs.existsSync(nodePath)).toBe(true);
        console.log(`✅ Found node via which/where: ${nodePath}`);
      } else {
        console.log('⚠️ node not found via which/where (may not be in PATH)');
      }
    }, 15000);

    test('should return null for non-existent binary', async () => {
      const result = await findBinaryWithWhich('definitely-not-a-real-binary-12345');
      
      expect(result).toBeNull();
      console.log('✅ Non-existent binary correctly returns null');
    }, 10000);
  });

  describe('Enhanced Environment Creation', () => {
    test('should create enhanced environment with valid PATH', async () => {
      const enhancedEnv = await createEnhancedEnvironment();
      
      expect(enhancedEnv.PATH).toBeDefined();
      expect(enhancedEnv.PATH!.length).toBeGreaterThan(0);
      
      const pathSeparator = isWindows ? ';' : ':';
      const pathParts = enhancedEnv.PATH!.split(pathSeparator);
      
      expect(pathParts.length).toBeGreaterThan(0);
      
      console.log(`✅ Enhanced PATH created with ${pathParts.length} entries`);
      // console.log(`   First 3 paths: ${pathParts.slice(0, 3).join(pathSeparator)}`); // Avoid logging sensitive path data
    }, 15000);

    test('should preserve original environment variables', async () => {
      const testKey = 'XFI_INTEGRATION_TEST_VAR';
      const testValue = 'test-value-12345';
      process.env[testKey] = testValue;
      
      const enhancedEnv = await createEnhancedEnvironment();
      
      expect(enhancedEnv[testKey]).toBe(testValue);
      
      console.log(`✅ Environment variable ${testKey} preserved`);
      
      // Clean up
      delete process.env[testKey];
    }, 10000);

    test('should use override path when provided', async () => {
      const overrideDir = path.join(testHomeDir, 'env-override-test');
      fs.mkdirSync(overrideDir, { recursive: true });
      
      const enhancedEnv = await createEnhancedEnvironment(overrideDir);
      
      const pathSeparator = isWindows ? ';' : ':';
      const pathParts = enhancedEnv.PATH!.split(pathSeparator);
      
      expect(pathParts).toContain(overrideDir);
      // Override should be first
      expect(pathParts[0]).toBe(overrideDir);
      
      console.log(`✅ Override path ${overrideDir} added to environment PATH`);
    }, 10000);
  });

  describe('Global Directory Discovery', () => {
    test('should discover npm global directory', async () => {
      const globalDir = await getGlobalDirectory('npm');
      
      if (globalDir) {
        expect(fs.existsSync(globalDir)).toBe(true);
        console.log(`✅ Found npm global directory: ${globalDir}`);
      } else {
        console.log('⚠️ npm global directory not found');
      }
    }, 20000);

    test('should discover yarn global directory if available', async () => {
      const globalDir = await getGlobalDirectory('yarn');
      
      if (globalDir) {
        expect(fs.existsSync(globalDir)).toBe(true);
        console.log(`✅ Found yarn global directory: ${globalDir}`);
      } else {
        console.log('⚠️ yarn global directory not found (yarn may not be installed)');
      }
    }, 20000);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle corrupted PATH environment gracefully', async () => {
      // Temporarily corrupt PATH
      const originalPath = process.env.PATH;
      process.env.PATH = '';
      
      try {
        const paths = await getPackageManagerPaths();
        
        expect(Array.isArray(paths)).toBe(true);
        // Should still return some default system paths
        expect(paths.length).toBeGreaterThan(0);
        
        console.log(`✅ Handled empty PATH gracefully, found ${paths.length} paths`);
      } finally {
        process.env.PATH = originalPath;
      }
    }, 10000);

    test('should handle filesystem permission errors gracefully', async () => {
      const nonAccessiblePath = isWindows ? 'C:\\System Volume Information' : '/root';
      
      // This should not throw, even if the path is not accessible
      const paths = await getPackageManagerPaths(nonAccessiblePath);
      
      expect(Array.isArray(paths)).toBe(true);
      console.log(`✅ Handled inaccessible path gracefully`);
    }, 10000);

    test('should handle malformed environment variables', async () => {
      // Set malformed environment variables
      process.env.NVM_DIR = 'not-a-real-path-12345';
      process.env.VOLTA_HOME = 'also-not-real';
      process.env.FNM_DIR = 'definitely-fake';
      
      try {
        const paths = await getPackageManagerPaths();
        
        expect(Array.isArray(paths)).toBe(true);
        expect(paths.length).toBeGreaterThan(0);
        
        console.log(`✅ Handled malformed env vars gracefully`);
      } finally {
        delete process.env.NVM_DIR;
        delete process.env.VOLTA_HOME;
        delete process.env.FNM_DIR;
      }
    }, 10000);
  });

  describe('Performance and Caching', () => {
    test('should complete all operations within reasonable time', async () => {
      const startTime = Date.now();
      
      const operations = await Promise.all([
        getPackageManagerPaths(),
        discoverBinary('npm'),
        discoverBinary('node'),
        createEnhancedEnvironment(),
        getGlobalDirectory('npm')
      ]);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds even on slow systems
      expect(duration).toBeLessThan(30000);
      
      console.log(`✅ All operations completed in ${duration}ms`);
      
      // All operations should have returned valid results
      expect(operations[0]).toBeTruthy(); // paths
      expect(operations[1]).toBeTruthy(); // npm
      expect(operations[2]).toBeTruthy(); // node
      expect(operations[3]).toBeTruthy(); // enhanced env
      // operations[4] (npm global) may be null if npm is not properly configured
    }, 35000);
  });
});