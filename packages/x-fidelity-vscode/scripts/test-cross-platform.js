#!/usr/bin/env node

/**
 * Cross-platform VSCode test runner with enhanced caching
 * - Linux: Uses xvfb-run for headless testing
 * - Windows/macOS: Runs VSCode tests directly
 * - Implements VSCode download caching
 * - Optimizes test execution with shared analysis
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const platform = os.platform();
const isLinux = platform === 'linux';

// Parse command line arguments
const cliArgs = process.argv.slice(2);
const testLabel = cliArgs[0] || 'integration';
const isDebug = cliArgs.includes('--debug');
const isCIForced = cliArgs.includes('--ci');
const isCI = isCIForced || process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.GITLAB_CI === 'true';

console.log(`🧪 Running VSCode tests on ${platform}`);
console.log(`📋 Test label: ${testLabel}`);
console.log(`🔧 Environment: ${isCI ? 'CI/CD' : 'Local Development'}`);

if (isLinux && !isCI) {
  console.log(`💡 Local Linux: Running with display for debugging. Use CI=true to run headless.`);
}

// Check if VSCode is already cached
const vscodeCachePath = path.join(__dirname, '..', '.vscode-test');
const vscodeExists = fs.existsSync(vscodeCachePath);

if (vscodeExists) {
  console.log('📥 VSCode already cached - using existing installation');
} else {
  console.log('📥 VSCode not cached - will download on first run');
}

// Set environment variables for caching and optimization
const env = {
  ...process.env,
  VSCODE_TEST_CACHE: 'true',
  VSCODE_TEST_DISABLE_TELEMETRY: 'true',
  NODE_ENV: 'test'
};

// Add debug verbose output if requested
if (isDebug) {
  env.VSCODE_TEST_VERBOSE = 'true';
}

// Add parallel execution for faster tests
if (process.env.VSCODE_TEST_PARALLEL !== 'false') {
  env.VSCODE_TEST_PARALLEL = 'true';
}

// Determine the command to run
let command;
let args;

if (isLinux && isCI) {
  console.log(`🐧 Running on Linux CI with headless display`);
  command = 'xvfb-run';
  
  // Try different xvfb configurations for CI compatibility
  const xvfbConfigs = [
    ['--auto-servernum', '--server-args=-screen 0 1024x768x24 -ac +extension GLX +render -noreset'],
    ['--auto-servernum', '--server-args=-screen 0 1920x1080x24 -ac'],
    ['--server-args=-screen 0 1024x768x24', '--auto-servernum']
  ];
  
  // Use the first configuration as default
  args = [
    ...xvfbConfigs[0],
    'npx',
    'vscode-test',
    '--config',
    '.vscode-test.mjs',
    '--label',
    testLabel
  ];
} else if (isLinux) {
  console.log(`🐧 Running on Linux locally (with display for debugging)`);
  command = 'npx';
  args = [
    'vscode-test',
    '--config',
    '.vscode-test.mjs',
    '--label',
    testLabel
  ];
} else {
  console.log(`🚀 Running on ${platform}`);
  command = 'npx';
  args = [
    'vscode-test',
    '--config',
    '.vscode-test.mjs',
    '--label',
    testLabel
  ];
}

console.log(`🚀 Executing: ${command} ${args.join(' ')}`);

// Run the test command
const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  cwd: __dirname + '/..'
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Tests completed successfully');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});
