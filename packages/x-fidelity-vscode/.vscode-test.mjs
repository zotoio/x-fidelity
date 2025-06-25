import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/test/test/unit/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../../',
    mocha: {
      ui: 'bdd',
      timeout: 20000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99',
      XVFB: '1'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions-except=zotoio.x-fidelity-vscode',
      '--user-data-dir=/tmp/vscode-test-user-data'
    ]
  },
  {
    label: 'integrationTests', 
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../../',
    mocha: {
      ui: 'bdd',
      timeout: 45000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99',
      XVFB: '1'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions-except=zotoio.x-fidelity-vscode',
      '--user-data-dir=/tmp/vscode-test-user-data'
    ]
  },
  {
    label: 'comprehensiveTests',
    files: 'out/test/test/suite/comprehensive.test.js', 
    version: 'stable',
    workspaceFolder: '../../../',
    mocha: {
      ui: 'bdd',
      timeout: 180000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec',
      slow: 30000
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99',
      XVFB: '1',
      SCREENSHOTS: process.env.SCREENSHOTS || 'false'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions-except=zotoio.x-fidelity-vscode',
      '--user-data-dir=/tmp/vscode-test-user-data',
      '--new-window'
    ]
  },
  {
    label: 'progressTests',
    files: 'out/test/test/suite/progressManager.test.js',
    version: 'stable', 
    workspaceFolder: '../../../',
    mocha: {
      ui: 'bdd',
      timeout: 30000,
      color: true,
      reporter: process.env.CI ? 'spec' : 'spec'
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99',
      XVFB: '1'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions-except=zotoio.x-fidelity-vscode',
      '--user-data-dir=/tmp/vscode-test-user-data'
    ]
  },
  {
    label: 'allTests',
    files: 'out/test/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../../',
    mocha: {
      ui: 'bdd',
      timeout: 180000,
      color: true,
      reporter: 'spec',
      bail: false
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99',
      CI: 'true'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions-except=zotoio.x-fidelity-vscode',
      '--new-window'
    ]
  }
]); 
