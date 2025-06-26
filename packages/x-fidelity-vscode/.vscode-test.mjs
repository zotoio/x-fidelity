import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/test/test/unit/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp'
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
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 45000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp'
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
    files: 'out/test/test/suite/comprehensive.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 120000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
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
    label: 'progressTests',
    files: 'out/test/test/suite/progressManager.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp'
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
    files: 'out/test/test/e2e/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp'
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
    files: 'out/test/test-utils/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 60000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp'
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
    files: 'out/test/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 120000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':99',
      XVFB: '1',
      XDG_RUNTIME_DIR: '/tmp',
      TMPDIR: '/tmp',
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
