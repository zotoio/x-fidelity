#!/usr/bin/env node

/**
 * Unified Release Preparation Script
 * Updates package.json versions and prepares both CLI and VSCode extension for release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function updatePackageVersion(packagePath, version) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const oldVersion = packageJson.version;
    packageJson.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    log('green', `✅ Updated ${path.basename(path.dirname(packagePath))}: ${oldVersion} → ${version}`);
    return true;
  } catch (error) {
    log('red', `❌ Failed to update ${packagePath}: ${error.message}`);
    return false;
  }
}

function runCommand(command, cwd, description) {
  try {
    log('blue', `🔧 ${description}...`);
    execSync(command, { cwd, stdio: 'inherit' });
    log('green', `✅ ${description} completed`);
    return true;
  } catch (error) {
    log('red', `❌ ${description} failed: ${error.message}`);
    return false;
  }
}

function main() {
  const version = process.argv[2];
  
  if (!version) {
    log('red', '❌ Version argument is required');
    process.exit(1);
  }

  log('blue', `🚀 Preparing unified release for version ${version}`);

  const rootDir = path.resolve(__dirname, '..');
  const cliDir = path.join(rootDir, 'packages', 'x-fidelity-cli');
  const vscodeDir = path.join(rootDir, 'packages', 'x-fidelity-vscode');

  // Update package.json versions
  log('blue', '📝 Updating package versions...');
  const cliSuccess = updatePackageVersion(path.join(cliDir, 'package.json'), version);
  const vscodeSuccess = updatePackageVersion(path.join(vscodeDir, 'package.json'), version);

  if (!cliSuccess || !vscodeSuccess) {
    log('red', '❌ Failed to update package versions');
    process.exit(1);
  }

  // Build all packages
  log('blue', '🔨 Building all packages...');
  if (!runCommand('yarn build:production', rootDir, 'Building all packages')) {
    process.exit(1);
  }

  // Prepare CLI package
  log('blue', '📦 Preparing CLI package...');
  if (!runCommand('cp ../../README.md ./README.md', cliDir, 'Copying README to CLI package')) {
    process.exit(1);
  }

  // Prepare VSCode extension
  log('blue', '🎨 Preparing VSCode extension...');
  if (!runCommand('yarn embed:cli', vscodeDir, 'Embedding CLI in VSCode extension')) {
    process.exit(1);
  }

  if (!runCommand('yarn package', vscodeDir, 'Packaging VSCode extension')) {
    process.exit(1);
  }

  // Verify artifacts
  log('blue', '🔍 Verifying release artifacts...');
  
  const cliDistPath = path.join(cliDir, 'dist', 'xfidelity');
  if (!fs.existsSync(cliDistPath)) {
    log('red', `❌ CLI binary not found: ${cliDistPath}`);
    process.exit(1);
  }

  const vsixFiles = fs.readdirSync(vscodeDir).filter(f => f.endsWith('.vsix'));
  if (vsixFiles.length === 0) {
    log('red', '❌ No VSIX file found in VSCode extension directory');
    process.exit(1);
  }

  log('green', '🎉 Unified release preparation completed successfully!');
  log('blue', `📋 Release artifacts ready for version ${version}:`);
  log('blue', `   CLI: ${cliDistPath}`);
  log('blue', `   VSCode: ${path.join(vscodeDir, vsixFiles[0])}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };