#!/usr/bin/env node

/**
 * Cross-platform VSCode test runner
 * - Linux: Uses xvfb-run for headless testing
 * - Windows/macOS: Runs VSCode tests directly
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const platform = os.platform();
const isLinux = platform === 'linux';
const isCI = process.env.CI === 'true';

// Get the test label from command line arguments
const testLabel = process.argv[2] || 'integration';

console.log(`🧪 Running VSCode tests on ${platform} (CI: ${isCI})`);
console.log(`📋 Test label: ${testLabel}`);

// Base command - use npx to run locally installed vscode-test
const npxCmd = platform === 'win32' ? 'npx.cmd' : 'npx';
const baseCmd = npxCmd;
const baseArgs = ['vscode-test', '--config', '.vscode-test.mjs', '--label', testLabel];

let command, args;

if (isLinux && (isCI || process.env.FORCE_XVFB === 'true')) {
  // Linux with headless display
  console.log('🐧 Using xvfb-run for headless Linux testing');
  command = 'xvfb-run';
  args = [
    '-a',
    '--server-args=-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp',
    baseCmd,
    ...baseArgs
  ];
} else {
  // Direct execution (Windows, macOS, or Linux with display)
  if (isLinux) {
    console.log('🐧 Running on Linux with display');
  } else if (platform === 'win32') {
    console.log('🪟 Running on Windows');
  } else if (platform === 'darwin') {
    console.log('🍎 Running on macOS');
  }
  
  command = baseCmd;
  args = baseArgs;
}

// Set up environment
const env = {
  ...process.env,
  NODE_ENV: 'test',
  VSCODE_TEST_VERBOSE: process.env.VSCODE_TEST_VERBOSE || 'false'
};

// Add Linux-specific environment variables
if (isLinux) {
  env.DISPLAY = process.env.DISPLAY || ':99';
  env.XVFB = '1';
}

// Windows-specific settings
if (platform === 'win32') {
  env.ELECTRON_ENABLE_LOGGING = '1';
}

console.log(`🚀 Executing: ${command} ${args.join(' ')}`);

// Create user data directory
const userDataDir = './.vscode-test-user-data';
require('fs').mkdirSync(userDataDir, { recursive: true });

// Spawn the process
const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
  shell: platform === 'win32'
});

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    if (command === 'xvfb-run') {
      console.error('❌ xvfb-run not found. Install with: sudo apt-get install xvfb');
      console.log('💡 Alternative: Run with FORCE_XVFB=false to skip xvfb');
    } else {
      console.error(`❌ Command not found: ${command}`);
    }
  } else {
    console.error(`❌ Test execution failed:`, error.message);
  }
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Tests completed successfully');
  } else {
    console.error(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
}); 