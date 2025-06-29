import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'simple',
    files: 'out/test/test/unit/simple.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 30000,
      color: true,
      reporter: 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'unit',
    files: 'out/test/test/unit/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 30000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'integration', 
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 45000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'comprehensive',
    files: 'out/test/test/suite/comprehensive.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 120000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
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
  },
  {
    label: 'progress',
    files: 'out/test/test/suite/progressManager.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'e2e',
    files: 'out/test/test/e2e/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'consistency',
    files: 'out/test/test-utils/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: './.vscode-test-user-data',
      TMPDIR: './.vscode-test-user-data'
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
    label: 'all',
    files: 'out/test/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'tdd',
      timeout: 120000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
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
  }
]); 
