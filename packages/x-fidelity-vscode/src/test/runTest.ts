import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    console.log('Starting VSCode extension tests...');

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

    console.log('Extension development path:', extensionDevelopmentPath);
    console.log('Extension tests path:', extensionTestsPath);
    console.log('Test workspace (fixtures):', testWorkspace);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        '--disable-extensions',
        '--disable-workspace-trust',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-gpu-sandbox',
        '--disable-web-security'
      ],
      version: 'stable'
    });

    console.log('All tests passed!');
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
