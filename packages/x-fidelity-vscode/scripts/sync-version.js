#!/usr/bin/env node

/**
 * Version Synchronization Script
 * Ensures CLI and VSCode extension versions are always in sync
 */

const fs = require('fs');
const path = require('path');

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

function readPackageJson(packagePath) {
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log('red', `❌ Failed to read ${packagePath}: ${error.message}`);
    process.exit(1);
  }
}

function writePackageJson(packagePath, packageJson) {
  try {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    log('green', `✅ Updated ${packagePath}`);
  } catch (error) {
    log('red', `❌ Failed to write ${packagePath}: ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const scriptDir = __dirname;
  const vscodeDir = path.dirname(scriptDir);
  const cliDir = path.resolve(vscodeDir, '../x-fidelity-cli');

  const vscodePackagePath = path.join(vscodeDir, 'package.json');
  const cliPackagePath = path.join(cliDir, 'package.json');

  log('blue', '🔄 Synchronizing versions between CLI and VSCode extension...');

  // Read both package.json files
  const vscodePackage = readPackageJson(vscodePackagePath);
  const cliPackage = readPackageJson(cliPackagePath);

  const vscodeVersion = vscodePackage.version;
  const cliVersion = cliPackage.version;

  log('blue', `📦 VSCode Extension version: ${vscodeVersion}`);
  log('blue', `📦 CLI version: ${cliVersion}`);

  if (vscodeVersion === cliVersion) {
    log('green', '✅ Versions are already synchronized!');
    return;
  }

  // In unified release mode, both packages should always have the same version
  // This script is now mainly for verification and local development
  
  if (vscodeVersion === cliVersion) {
    log('green', '✅ Versions are already synchronized!');
    log('blue', '📋 Note: Unified release handles version synchronization automatically');
    return;
  }

  log('yellow', '⚠️  Version mismatch detected - this should not happen in unified release mode');
  log('yellow', '🔧 This may indicate a development environment or testing scenario');
  log('blue', '📋 In production, semantic-release handles version synchronization automatically');
  
  // For development purposes, we can still sync manually
  const targetVersion = cliVersion !== '0.0.0-semantically-released' ? cliVersion : vscodeVersion;
  log('yellow', `🎯 Target version: ${targetVersion}`);

  // Update VSCode extension version if needed
  if (vscodeVersion !== targetVersion && targetVersion !== '0.0.0-semantically-released') {
    vscodePackage.version = targetVersion;
    writePackageJson(vscodePackagePath, vscodePackage);
    log(
      'green',
      `✅ VSCode extension version updated: ${vscodeVersion} → ${targetVersion}`
    );
  }

  log('green', '🎉 Local version synchronization complete!');
  log('blue', `📋 Local packages now use version: ${targetVersion}`);
}

if (require.main === module) {
  main();
}
