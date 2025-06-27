import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      TEST_PATTERN: 'out/test/test/unit/**/*.test.js'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'integrationTests', 
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      TEST_PATTERN: 'out/test/test/integration/**/*.test.js',
      TEST_TIMEOUT: '45000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'comprehensiveTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      SCREENSHOTS: process.env.SCREENSHOTS || 'false',
      TEST_PATTERN: 'out/test/test/suite/comprehensive.test.js',
      TEST_TIMEOUT: '120000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'progressTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      TEST_PATTERN: 'out/test/test/suite/progressManager.test.js',
      TEST_TIMEOUT: '60000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'e2eTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      TEST_PATTERN: 'out/test/test/e2e/**/*.test.js',
      TEST_TIMEOUT: '60000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'consistencyTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      TEST_PATTERN: 'out/test/test-utils/**/*.test.js',
      TEST_TIMEOUT: '60000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  },
  {
    label: 'allTests',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    extensionTestsPath: './out/test/suite/index.js',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
      SCREENSHOTS: process.env.SCREENSHOTS || 'false',
      TEST_PATTERN: 'out/test/test/**/*.test.js',
      TEST_TIMEOUT: '120000'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extension=ms-python.python',
      '--disable-extension=ms-vsliveshare.vsliveshare',
      '--user-data-dir=./.vscode-test-user-data'
    ]
  }
]); 
