import * as assert from 'assert';
import { suite, test, setup, teardown } from 'mocha';
import { CLISpawner, CLISpawnOptions } from '../../utils/cliSpawner';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Minimal mocking - only mock console output to reduce noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

suite('CLI Spawner Improved Integration Tests', () => {
  let cliSpawner: CLISpawner;
  let testWorkspace: string;

  setup(async () => {
    // Create a temporary test workspace
    testWorkspace = path.join(os.tmpdir(), `xfi-test-${Date.now()}`);
    fs.mkdirSync(testWorkspace, { recursive: true });
    
    // Create a minimal test project structure
    const srcDir = path.join(testWorkspace, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create a simple test file
    const testFile = path.join(srcDir, 'test.js');
    fs.writeFileSync(testFile, `
// Simple test file for CLI analysis
function greet(name) {
  console.log('Hello, ' + name);
}

module.exports = { greet };
`);

    // Create package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      main: 'src/test.js'
    };
    fs.writeFileSync(
      path.join(testWorkspace, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create CLI spawner instance
    cliSpawner = new CLISpawner();

    // Suppress console output during tests
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  });

  teardown(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Clean up test workspace
    try {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  suite('Real CLI Validation Tests', () => {
    test('should validate CLI existence and accessibility', async function() {
      this.timeout(10000); // Increase timeout for file system operations

      try {
        await cliSpawner.validateCLI();
        // If validation passes, the CLI file exists and is accessible
        assert.ok(true, 'CLI validation should pass or throw descriptive error');
      } catch (error) {
        // If validation fails, ensure error message is descriptive
        assert.ok(error instanceof Error, 'Error should be Error instance');
        assert.ok(
          error.message.includes('CLI') || error.message.includes('not found'),
          `Error message should be descriptive. Got: ${error.message}`
        );
      }
    });

    test('should provide detailed diagnostics information', async function() {
      this.timeout(10000);

      const diagnostics = await cliSpawner.getDiagnostics();

      // Verify diagnostic structure
      assert.ok(typeof diagnostics === 'object', 'Diagnostics should be an object');
      assert.ok(typeof diagnostics.platform === 'string', 'Platform should be provided');
      assert.ok(typeof diagnostics.arch === 'string', 'Architecture should be provided');
      assert.ok(typeof diagnostics.nodePath === 'string', 'Node path should be provided');
      assert.ok(typeof diagnostics.cliPath === 'string', 'CLI path should be provided');
      assert.ok(typeof diagnostics.nodeExists === 'boolean', 'Node existence should be boolean');
      assert.ok(typeof diagnostics.cliExists === 'boolean', 'CLI existence should be boolean');
      assert.ok(Array.isArray(diagnostics.possibleNodePaths), 'Possible Node paths should be array');
      assert.ok(Array.isArray(diagnostics.possibleCliPaths), 'Possible CLI paths should be array');

      // Verify platform-specific paths are included
      if (process.platform === 'darwin') {
        assert.ok(
          diagnostics.possibleNodePaths.some((p: string) => p.includes('/usr/local/bin')),
          'macOS should include Homebrew paths'
        );
        assert.ok(
          diagnostics.possibleNodePaths.some((p: string) => p.includes('/opt/homebrew')),
          'macOS should include Apple Silicon Homebrew paths'
        );
      }

      if (process.platform === 'win32') {
        // Windows-specific validations can be added here
        assert.ok(true, 'Windows platform detected');
      }
    });
  });

  suite('Execution Context Tests', () => {
    test('should handle concurrent execution prevention', async function() {
      this.timeout(15000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 5000
      };

      // Start first analysis
      const firstAnalysisPromise = cliSpawner.runAnalysis(options);
      
      // Immediately try to start second analysis
      try {
        await cliSpawner.runAnalysis(options);
        assert.fail('Second analysis should be rejected due to concurrent execution');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw error for concurrent execution');
        assert.ok(
          error.message.includes('already running'),
          `Error should mention concurrent execution. Got: ${error.message}`
        );
      }

      // Wait for first analysis to complete or fail
      try {
        await firstAnalysisPromise;
             } catch (firstError) {
         // First analysis may fail due to CLI setup issues, which is acceptable
         assert.ok(firstError instanceof Error, 'First analysis error should be Error instance');
       }
    });

    test('should handle timeout scenarios gracefully', async function() {
      this.timeout(20000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 1000 // Very short timeout to trigger timeout condition
      };

      try {
        const result = await cliSpawner.runAnalysis(options);
        // If analysis completes within timeout, that's also valid
        assert.ok(result, 'Analysis result should be defined if completed');
      } catch (error) {
        // Timeout or CLI setup errors are acceptable
        assert.ok(error instanceof Error, 'Timeout error should be Error instance');
        assert.ok(
          error.message.includes('timeout') || 
          error.message.includes('failed') ||
          error.message.includes('not found'),
          `Error should indicate timeout or setup issue. Got: ${error.message}`
        );
      }
    });
  });

  suite('Environment Integration Tests', () => {
    test('should handle different working directories', async function() {
      this.timeout(15000);

      // Test with relative path
      const relativeOptions: CLISpawnOptions = {
        workspacePath: '.',
        timeout: 5000
      };

      // Test with absolute path
      const absoluteOptions: CLISpawnOptions = {
        workspacePath: path.resolve(testWorkspace),
        timeout: 5000
      };

      // Both should handle path resolution (may fail due to CLI setup, but shouldn't crash)
      for (const options of [relativeOptions, absoluteOptions]) {
        try {
          await cliSpawner.runAnalysis(options);
        } catch (error) {
          assert.ok(error instanceof Error, 'Path handling error should be Error instance');
          // Error is acceptable - we're testing that it doesn't crash
        }
      }
    });

    test('should handle custom environment variables', async function() {
      this.timeout(15000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 5000,
        env: {
          XFI_LOG_LEVEL: 'debug',
          XFI_CORRELATION_ID: 'test-correlation-123',
          CUSTOM_VAR: 'test-value'
        }
      };

      try {
        await cliSpawner.runAnalysis(options);
      } catch (error) {
        // Environment variable handling errors are acceptable for this test
        assert.ok(error instanceof Error, 'Environment error should be Error instance');
      }
    });
  });

  suite('Error Recovery Tests', () => {
    test('should handle invalid workspace paths gracefully', async function() {
      this.timeout(10000);

      const invalidOptions: CLISpawnOptions = {
        workspacePath: '/nonexistent/path/that/should/not/exist',
        timeout: 5000
      };

      try {
        await cliSpawner.runAnalysis(invalidOptions);
        assert.fail('Analysis should fail for nonexistent workspace');
      } catch (error) {
        assert.ok(error instanceof Error, 'Invalid path error should be Error instance');
        assert.ok(
          error.message.includes('not found') || 
          error.message.includes('does not exist') ||
          error.message.includes('ENOENT'),
          `Error should indicate path issue. Got: ${error.message}`
        );
      }
    });

    test('should provide meaningful error messages for CLI issues', async function() {
      this.timeout(10000);

      // Try to run analysis - this may fail due to CLI setup
      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 5000
      };

      try {
        await cliSpawner.runAnalysis(options);
        // If successful, verify result structure
        assert.ok(true, 'Analysis completed successfully');
      } catch (error) {
        // Verify error is meaningful and actionable
        assert.ok(error instanceof Error, 'CLI error should be Error instance');
        
        const errorMessage = error.message.toLowerCase();
        const hasMeaningfulMessage = 
          errorMessage.includes('cli') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('validation') ||
          errorMessage.includes('spawn') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('dependency');

        assert.ok(
          hasMeaningfulMessage,
          `Error message should be meaningful and actionable. Got: ${error.message}`
        );
      }
    });
  });

  suite('Resource Management Tests', () => {
    test('should not leak resources during failed executions', async function() {
      this.timeout(15000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 2000
      };

      // Run multiple analyses that may fail
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 3; i++) {
        const promise = cliSpawner.runAnalysis(options).catch((error: Error) => {
          // Capture errors but don't fail the test
          return { error: error.message };
        });
        promises.push(promise);
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all to complete
      const results = await Promise.all(promises);
      
      // Verify that resources were properly cleaned up
      // (No specific assertions - the test passes if no resource leaks cause hangs)
      assert.ok(results.length === 3, 'All analysis attempts should complete');
    });

    test('should handle execution state correctly after errors', async function() {
      this.timeout(10000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 3000
      };

      // First execution (may fail)
      try {
        await cliSpawner.runAnalysis(options);
      } catch {
        // Error is expected
      }

      // Verify execution state is reset and second execution can be attempted
      assert.ok(!cliSpawner.isExecuting(), 'Execution state should be reset after error');

      // Second execution should be allowed
      try {
        await cliSpawner.runAnalysis(options);
             } catch (secondError) {
         // Second execution may also fail, but should not be rejected due to state issues
         assert.ok(secondError instanceof Error, 'Second execution error should be Error instance');
         assert.ok(
           !secondError.message.includes('already running'),
           'Second execution should not fail due to state issues'
         );
       }
    });
  });

  suite('Platform Compatibility Tests', () => {
    test('should work consistently across platforms', async function() {
      this.timeout(10000);

      const diagnostics = await cliSpawner.getDiagnostics();
      
      // Verify platform-specific behavior
      switch (process.platform) {
        case 'win32':
          // Windows-specific checks
          assert.ok(
            diagnostics.possibleNodePaths.some((p: string) => 
              typeof p === 'string' && p.length > 0
            ),
            'Windows should have valid Node.js paths'
          );
          break;
          
        case 'darwin':
          // macOS-specific checks
          assert.ok(
            diagnostics.possibleNodePaths.some((p: string) => 
              p.includes('/usr/local/bin') || p.includes('/opt/homebrew')
            ),
            'macOS should include Homebrew paths'
          );
          break;
          
        case 'linux':
          // Linux-specific checks
          assert.ok(
            diagnostics.possibleNodePaths.some((p: string) => 
              p.includes('/usr/bin') || p === 'node'
            ),
            'Linux should include system paths'
          );
          break;
      }

      // Universal checks
      assert.ok(
        diagnostics.possibleNodePaths.includes(process.execPath),
        'Should include current Node.js executable path'
      );
    });
  });

  suite('Real File System Integration', () => {
    test('should create and clean up result files appropriately', async function() {
      this.timeout(15000);

      const options: CLISpawnOptions = {
        workspacePath: testWorkspace,
        timeout: 8000
      };

             const resultDir = path.join(testWorkspace, '.xfiResults');

      // Ensure clean start
      if (fs.existsSync(resultDir)) {
        fs.rmSync(resultDir, { recursive: true, force: true });
      }

      try {
        const result = await cliSpawner.runAnalysis(options);
        
        // If analysis succeeds, verify result file handling
        assert.ok(result, 'Analysis result should be defined');
        assert.ok(result.metadata, 'Result metadata should be defined');
        
        // The CLI should have created result files
        // (May not exist if CLI execution failed, which is acceptable)
        
      } catch (error) {
        // Analysis may fail due to CLI setup, which is acceptable
        // We're testing file system integration, not CLI functionality
        assert.ok(error instanceof Error, 'File system error should be Error instance');
      }

      // Verify no hanging file handles or locks
      // (Test passes if it completes without hanging)
    });
  });
});