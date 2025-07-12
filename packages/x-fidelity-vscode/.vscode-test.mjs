import { defineConfig } from '@vscode/test-cli';

const commonConfig = {
  version: 'stable',
  workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
  extensionDevelopmentPath: '.',
  mocha: {
    ui: 'bdd',
    timeout: 120000,
    color: true,
    reporter: process.env.VSCODE_TEST_VERBOSE === 'true' ? 'spec' : 'spec',
    exit: true
  },
  env: {
    NODE_ENV: 'test',
    VSCODE_TEST_VERBOSE: process.env.VSCODE_TEST_VERBOSE || 'false',
    DISPLAY: process.env.DISPLAY || ':99',
    XVFB: '1',
    XDG_RUNTIME_DIR: './.vscode-test-user-data',
    TMPDIR: './.vscode-test-user-data',
    SCREENSHOTS: process.env.SCREENSHOTS || 'false'
  },
  launchArgs: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-extension=ms-python.python',
    '--disable-extension=ms-vsliveshare.vsliveshare',
    '--user-data-dir=./.vscode-test-user-data'
  ]
};

export default defineConfig([
  {
    ...commonConfig,
    label: 'core',
    files: 'out/test/test/{unit,integration}/**/*.test.js',
    mocha: { ...commonConfig.mocha, timeout: 30000 }
  },
  {
    ...commonConfig,
    label: 'integration',
    files: 'out/test/test/integration/**/*.test.js',
    mocha: { ...commonConfig.mocha, timeout: 60000 }
  },
  {
    ...commonConfig,
    label: 'e2e',
    files: 'out/test/test/e2e/**/*.test.js'
  },
  {
    ...commonConfig,
    label: 'all',
    files: 'out/test/test/**/*.test.js'
  }
]);
