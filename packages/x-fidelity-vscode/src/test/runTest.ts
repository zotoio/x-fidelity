import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // Check if verbose mode is enabled
    const isVerbose = process.env.VSCODE_TEST_VERBOSE === 'true';

    if (isVerbose) {
      console.log('Starting VSCode extension tests...');
    }

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Use the node-fullstack fixtures as the test workspace
    // This provides consistent, comprehensive test coverage with intentionally problematic code
    const testWorkspace = path.resolve(
      __dirname,
      '../../x-fidelity-fixtures/node-fullstack'
    );

    if (isVerbose) {
      console.log('Extension development path:', extensionDevelopmentPath);
      console.log('Extension tests path:', extensionTestsPath);
      console.log('Test workspace (fixtures):', testWorkspace);
    }

    // Windows-optimized VSCode launch configuration
    const isWindows = process.platform === 'win32';
    const isCI =
      process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    // Base launch arguments
    let launchArgs = [
      testWorkspace,
      '--disable-extensions',
      '--disable-workspace-trust'
    ];

    // Add platform-specific arguments to prevent unresponsive extension host
    if (isCI) {
      launchArgs.push(
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-gpu-sandbox',
        '--disable-web-security'
      );

      // Windows-specific optimizations for CI
      if (isWindows) {
        launchArgs.push(
          '--max-memory=2048', // Limit memory usage
          '--disable-background-timer-throttling', // Prevent timer throttling that can cause hangs
          '--disable-renderer-backgrounding', // Keep renderer active
          '--disable-backgrounding-occluded-windows' // Prevent background window optimization
        );
      }
    }

    if (isVerbose) {
      console.log('VSCode launch arguments:', launchArgs);
    }

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
      version: 'stable'
    });

    // Always show final result
    console.log('All tests passed!');
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
