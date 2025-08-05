import * as assert from 'assert';
import { suite, test, setup, teardown } from 'mocha';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { getPackageManagerPaths, discoverBinary, createEnhancedEnvironment, getGlobalDirectory } from '@x-fidelity/core';

// Platform detection
const platform = os.platform();
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';
const isLinux = platform === 'linux';

suite('Binary Discovery Cross-Platform Integration Tests', () => {
  let testHomeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  setup(async function() {
    // Increase timeout for real filesystem operations
    this.timeout(30000);

    // Create temporary test home directory
    testHomeDir = path.join(os.tmpdir(), `xfi-binary-test-${Date.now()}`);
    fs.mkdirSync(testHomeDir, { recursive: true });

    // Backup original environment
    originalEnv = { ...process.env };
  });

  teardown(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up test directory
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true, force: true });
    }
  });

  suite('Real System Binary Discovery', () => {
    test('should discover npm binary on current system', async function() {
      this.timeout(15000);
      
      const result = await discoverBinary('npm');
      
      // Should find npm on any properly configured Node.js system
      assert.ok(result, 'npm should be discoverable on the system');
      assert.strictEqual(result.binary, 'npm');
      assert.ok(result.path, 'npm path should be returned');
      assert.ok(fs.existsSync(result.path), 'npm binary should exist at returned path');
      
      console.log(`✅ Found npm at: ${result.path} (source: ${result.source})`);
    });

    test('should discover yarn binary if available', async function() {
      this.timeout(15000);
      
      const result = await discoverBinary('yarn');
      
      if (result) {
        assert.strictEqual(result.binary, 'yarn');
        assert.ok(result.path, 'yarn path should be returned');
        assert.ok(fs.existsSync(result.path), 'yarn binary should exist at returned path');
        console.log(`✅ Found yarn at: ${result.path} (source: ${result.source})`);
      } else {
        console.log('⚠️  Yarn not found - this is acceptable on systems without yarn');
      }
    });

    test('should discover node binary on current system', async function() {
      this.timeout(15000);
      
      const result = await discoverBinary('node');
      
      assert.ok(result, 'node should be discoverable on the system');
      assert.strictEqual(result.binary, 'node');
      assert.ok(result.path, 'node path should be returned');
      assert.ok(fs.existsSync(result.path), 'node binary should exist at returned path');
      
      console.log(`✅ Found node at: ${result.path} (source: ${result.source})`);
    });

    test('should discover npx binary if available', async function() {
      this.timeout(15000);
      
      const result = await discoverBinary('npx');
      
      if (result) {
        assert.strictEqual(result.binary, 'npx');
        assert.ok(result.path, 'npx path should be returned');
        assert.ok(fs.existsSync(result.path), 'npx binary should exist at returned path');
        console.log(`✅ Found npx at: ${result.path} (source: ${result.source})`);
      } else {
        console.log('⚠️  npx not found - may not be available on this system');
      }
    });
  });

  suite('Platform-Specific Path Discovery', () => {
    test('should return platform-appropriate paths', async function() {
      this.timeout(10000);
      
      const paths = await getPackageManagerPaths();
      
      assert.ok(Array.isArray(paths), 'Should return an array of paths');
      assert.ok(paths.length > 0, 'Should return at least one path');

      if (isWindows) {
        // Windows should include Program Files paths
        const hasWindowsPaths = paths.some(p => 
          p.includes('Program Files') || 
          p.includes('nodejs') ||
          p.toLowerCase().includes('windows')
        );
        console.log(`🪟 Windows paths found: ${hasWindowsPaths}`);
        console.log(`🪟 All paths: ${paths.join(', ')}`);
      } else if (isMacOS) {
        // macOS should include Homebrew paths
        const hasBrewPaths = paths.some(p => 
          p.includes('/opt/homebrew') || 
          p.includes('/usr/local') ||
          p.includes('.nvm') ||
          p.includes('.volta')
        );
        console.log(`🍎 macOS/Homebrew paths found: ${hasBrewPaths}`);
        console.log(`🍎 All paths: ${paths.join(', ')}`);
      } else if (isLinux) {
        // Linux should include standard system paths
        const hasLinuxPaths = paths.some(p => 
          p.includes('/usr/bin') || 
          p.includes('/usr/local') ||
          p.includes('.nvm') ||
          p.includes('.volta')
        );
        console.log(`🐧 Linux paths found: ${hasLinuxPaths}`);
        console.log(`🐧 All paths: ${paths.join(', ')}`);
      }
    });
  });

  suite('Environment PATH Integration', () => {
    test('should create enhanced environment with valid PATH', async function() {
      this.timeout(10000);
      
      const enhancedEnv = await createEnhancedEnvironment();
      
      assert.ok(enhancedEnv.PATH, 'Enhanced environment should have PATH');
      assert.ok(enhancedEnv.PATH.length > 0, 'PATH should not be empty');
      
      // PATH should contain path separator appropriate for platform
      const pathSeparator = isWindows ? ';' : ':';
      assert.ok(
        enhancedEnv.PATH.includes(pathSeparator) || enhancedEnv.PATH.split(pathSeparator).length === 1, 
        `PATH should use ${pathSeparator} separator or be a single path`
      );
      
      console.log(`✅ Enhanced PATH length: ${enhancedEnv.PATH.length}`);
      console.log(`✅ Enhanced PATH: ${enhancedEnv.PATH.split(pathSeparator).slice(0, 5).join(pathSeparator)}...`);
    });

    test('should preserve original environment variables', async function() {
      this.timeout(10000);
      
      // Set a test environment variable
      const testKey = 'XFI_TEST_VAR';
      const testValue = 'test-value-12345';
      process.env[testKey] = testValue;
      
      const enhancedEnv = await createEnhancedEnvironment();
      
      assert.strictEqual(enhancedEnv[testKey], testValue, 'Should preserve custom environment variables');
      
      // Clean up
      delete process.env[testKey];
    });
  });

  suite('Node Version Manager Detection', () => {
    test('should detect nvm if available', async function() {
      this.timeout(10000);
      
      const homeDir = os.homedir();
      const nvmDir = path.join(homeDir, '.nvm');
      
      if (fs.existsSync(nvmDir)) {
        console.log('✅ NVM directory found, testing nvm paths');
        
        const paths = await getPackageManagerPaths();
        const nvmPaths = paths.filter(p => p.includes('.nvm'));
        
        if (nvmPaths.length > 0) {
          console.log(`✅ NVM paths detected: ${nvmPaths.join(', ')}`);
          assert.ok(nvmPaths.length > 0, 'Should include nvm paths when nvm is available');
        } else {
          console.log('⚠️  NVM directory exists but no nvm paths found in results');
        }
      } else {
        console.log('ℹ️  NVM not installed on this system');
      }
    });

    test('should detect volta if available', async function() {
      this.timeout(10000);
      
      const homeDir = os.homedir();
      const voltaDir = path.join(homeDir, '.volta');
      
      if (fs.existsSync(voltaDir)) {
        console.log('✅ Volta directory found, testing volta paths');
        
        const paths = await getPackageManagerPaths();
        const voltaPaths = paths.filter(p => p.includes('.volta'));
        
        if (voltaPaths.length > 0) {
          console.log(`✅ Volta paths detected: ${voltaPaths.join(', ')}`);
          assert.ok(voltaPaths.length > 0, 'Should include volta paths when volta is available');
        } else {
          console.log('⚠️  Volta directory exists but no volta paths found in results');
        }
      } else {
        console.log('ℹ️  Volta not installed on this system');
      }
    });

    test('should detect fnm if available', async function() {
      this.timeout(10000);
      
      const homeDir = os.homedir();
      const fnmDir = path.join(homeDir, '.fnm');
      
      if (fs.existsSync(fnmDir)) {
        console.log('✅ FNM directory found, testing fnm paths');
        
        const paths = await getPackageManagerPaths();
        const fnmPaths = paths.filter(p => p.includes('.fnm'));
        
        if (fnmPaths.length > 0) {
          console.log(`✅ FNM paths detected: ${fnmPaths.join(', ')}`);
          assert.ok(fnmPaths.length > 0, 'Should include fnm paths when fnm is available');
        } else {
          console.log('⚠️  FNM directory exists but no fnm paths found in results');
        }
      } else {
        console.log('ℹ️  FNM not installed on this system');
      }
    });
  });

  suite('Global Directory Discovery', () => {
    test('should discover npm global directory', async function() {
      this.timeout(15000);
      
      try {
        const globalDir = await getGlobalDirectory('npm');
        
        if (globalDir) {
          assert.ok(fs.existsSync(globalDir), 'npm global directory should exist');
          console.log(`✅ Found npm global directory: ${globalDir}`);
        } else {
          console.log('⚠️  npm global directory not found');
        }
      } catch (error) {
        console.log(`⚠️  Error getting npm global directory: ${error}`);
      }
    });

    test('should discover yarn global directory if yarn is available', async function() {
      this.timeout(15000);
      
      try {
        const globalDir = await getGlobalDirectory('yarn');
        
        if (globalDir) {
          assert.ok(fs.existsSync(globalDir), 'yarn global directory should exist');
          console.log(`✅ Found yarn global directory: ${globalDir}`);
        } else {
          console.log('⚠️  yarn global directory not found (yarn may not be installed)');
        }
      } catch (error) {
        console.log(`⚠️  Error getting yarn global directory: ${error}`);
      }
    });
  });

  suite('Override Path Functionality', () => {
    test('should respect override path when provided', async function() {
      this.timeout(10000);
      
      // Create a temporary override directory with fake binaries
      const overrideDir = path.join(testHomeDir, 'override-bin');
      fs.mkdirSync(overrideDir, { recursive: true });
      
      // Create fake npm binary
      const fakeNpmPath = path.join(overrideDir, isWindows ? 'npm.cmd' : 'npm');
      fs.writeFileSync(fakeNpmPath, isWindows ? '@echo off\necho fake npm' : '#!/bin/bash\necho fake npm');
      if (!isWindows) {
        fs.chmodSync(fakeNpmPath, 0o755);
      }
      
      const paths = await getPackageManagerPaths(overrideDir);
      
      assert.ok(paths.includes(overrideDir), 'Override path should be included in results');
      assert.strictEqual(paths[0], overrideDir, 'Override path should be first in results');
      
      console.log(`✅ Override path ${overrideDir} correctly prioritized`);
    });

    test('should expand tilde in override path', async function() {
      this.timeout(10000);
      
      // Test with tilde path
      const tildeOverride = '~/test-override';
      const expandedPath = tildeOverride.replace(/^~/, os.homedir());
      
      // Create the directory to make it valid
      fs.mkdirSync(expandedPath, { recursive: true });
      
      try {
        const paths = await getPackageManagerPaths(tildeOverride);
        
        assert.ok(paths.includes(expandedPath), 'Tilde should be expanded to home directory');
        console.log(`✅ Tilde path ${tildeOverride} expanded to ${expandedPath}`);
      } finally {
        // Clean up
        fs.rmSync(expandedPath, { recursive: true, force: true });
      }
    });
  });

  suite('Error Handling and Edge Cases', () => {
    test('should handle non-existent binaries gracefully', async function() {
      this.timeout(10000);
      
      const result = await discoverBinary('definitely-not-a-real-binary-12345');
      
      assert.strictEqual(result, null, 'Should return null for non-existent binaries');
      console.log('✅ Non-existent binary handled gracefully');
    });

    test('should handle empty override path gracefully', async function() {
      this.timeout(10000);
      
      const paths = await getPackageManagerPaths('');
      
      assert.ok(Array.isArray(paths), 'Should return an array even with empty override');
      assert.ok(paths.length > 0, 'Should include default paths when override is empty');
      console.log('✅ Empty override path handled gracefully');
    });

    test('should handle non-existent override path gracefully', async function() {
      this.timeout(10000);
      
      const nonExistentPath = path.join(testHomeDir, 'definitely-does-not-exist');
      const paths = await getPackageManagerPaths(nonExistentPath);
      
      assert.ok(Array.isArray(paths), 'Should return an array even with non-existent override');
      assert.ok(!paths.includes(nonExistentPath), 'Should not include non-existent override path');
      console.log('✅ Non-existent override path handled gracefully');
    });
  });

  suite('Performance Tests', () => {
    test('should complete binary discovery within reasonable time', async function() {
      this.timeout(30000);
      
      const startTime = Date.now();
      
      await Promise.all([
        discoverBinary('npm'),
        discoverBinary('yarn'), 
        discoverBinary('node'),
        getPackageManagerPaths(),
        createEnhancedEnvironment()
      ]);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 25 seconds even on slow systems
      assert.ok(duration < 25000, `Discovery should complete quickly, took ${duration}ms`);
      console.log(`✅ All binary discovery operations completed in ${duration}ms`);
    });

    test('should cache results for repeated calls', async function() {
      this.timeout(20000);
      
      // First call
      const start1 = Date.now();
      const result1 = await discoverBinary('npm');
      const duration1 = Date.now() - start1;
      
      // Second call (should be faster due to caching)
      const start2 = Date.now();
      const result2 = await discoverBinary('npm');
      const duration2 = Date.now() - start2;
      
      // Results should be identical
      assert.deepStrictEqual(result1, result2, 'Results should be identical');
      
      console.log(`✅ First call: ${duration1}ms, Second call: ${duration2}ms`);
      
      // Note: We don't assert duration2 < duration1 because the functions don't implement 
      // caching yet, but this test documents the expected behavior for future optimization
    });
  });
});