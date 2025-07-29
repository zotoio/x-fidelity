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

  // Determine which version to use (prioritize CLI as source of truth)
  const targetVersion = cliVersion;
  log('yellow', `🎯 Target version: ${targetVersion}`);

  // Update VSCode extension version
  if (vscodeVersion !== targetVersion) {
    vscodePackage.version = targetVersion;
    writePackageJson(vscodePackagePath, vscodePackage);
    log(
      'green',
      `✅ VSCode extension version updated: ${vscodeVersion} → ${targetVersion}`
    );
  }

  log('green', '🎉 Version synchronization complete!');
  log('blue', `📋 All packages now use version: ${targetVersion}`);
}

if (require.main === module) {
  main();
}
