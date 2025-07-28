#!/usr/bin/env node

/**
 * Sync Published Version Script
 * Synchronizes VSCode extension version with published CLI package from npm registry
 * Ensures the extension always references a valid, published CLI version
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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    }).trim();
  } catch (error) {
    if (!options.silent) {
      log('red', `❌ Command failed: ${command}`);
      log('red', `Error: ${error.message}`);
    }
    throw error;
  }
}

function getLatestCliVersionFromNpm() {
  try {
    log('blue', '🔍 Fetching latest x-fidelity version from npm...');
    const result = execCommand('npm view x-fidelity version', { silent: true });
    return result.trim();
  } catch (error) {
    log('red', '❌ Failed to fetch CLI version from npm registry');
    throw error;
  }
}

function verifyCliPackageExists(version) {
  try {
    log('blue', `🔍 Verifying x-fidelity@${version} exists on npm...`);
    execCommand(`npm view x-fidelity@${version} version`, { silent: true });
    log('green', `✅ Confirmed x-fidelity@${version} exists on npm`);
    return true;
  } catch (error) {
    log('red', `❌ Package x-fidelity@${version} not found on npm`);
    return false;
  }
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

function updateEmbeddedCliDependency(vscodePackage, cliVersion) {
  // Update the CLI dependency if it exists in dependencies or devDependencies
  const updated = { ...vscodePackage };
  let dependencyUpdated = false;

  if (updated.dependencies && updated.dependencies['x-fidelity']) {
    updated.dependencies['x-fidelity'] = cliVersion;
    dependencyUpdated = true;
    log('green', `✅ Updated CLI dependency to ${cliVersion}`);
  }

  if (updated.devDependencies && updated.devDependencies['x-fidelity']) {
    updated.devDependencies['x-fidelity'] = cliVersion;
    dependencyUpdated = true;
    log('green', `✅ Updated CLI devDependency to ${cliVersion}`);
  }

  if (!dependencyUpdated) {
    log('yellow', '⚠️  No x-fidelity dependency found in package.json - this might be expected if CLI is embedded differently');
  }

  return updated;
}

function validateVersionSync(vscodeVersion, cliVersion) {
  if (vscodeVersion === cliVersion) {
    log('green', `✅ Versions are synchronized: ${vscodeVersion}`);
    return true;
  } else {
    log('yellow', `⚠️  Version mismatch: VSCode=${vscodeVersion}, CLI=${cliVersion}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const scriptDir = __dirname;
  const vscodeDir = path.dirname(scriptDir);
  const vscodePackagePath = path.join(vscodeDir, 'package.json');

  // Check for dry-run mode
  const isDryRun = args.includes('--dry-run') || args.includes('--validate-only');
  
  if (isDryRun) {
    log('cyan', '🔍 Running in validation mode (no changes will be made)');
    log('green', '✅ sync-published-version.js is available and functional');
    return;
  }

  log('cyan', '🔄 Starting published version synchronization...');
  log('yellow', '⚠️  Note: This updates package.json locally only - changes are NOT committed to git');

  // Parse command line arguments
  let cliVersion = null;
  args.forEach(arg => {
    if (arg.startsWith('--cli-version=')) {
      cliVersion = arg.split('=')[1];
    }
  });

  try {
    // Determine CLI version to sync with
    if (cliVersion) {
      log('blue', `📦 Using provided CLI version: ${cliVersion}`);
      
      // Verify the provided version exists on npm
      if (!verifyCliPackageExists(cliVersion)) {
        log('red', '💥 CRITICAL: Provided CLI version not found on npm');
        process.exit(1);
      }
    } else {
      log('blue', '📦 No CLI version provided, fetching latest from npm...');
      cliVersion = getLatestCliVersionFromNpm();
      log('blue', `📦 Latest CLI version from npm: ${cliVersion}`);
    }

    // Read VSCode extension package.json
    const vscodePackage = readPackageJson(vscodePackagePath);
    const currentVscodeVersion = vscodePackage.version;

    log('blue', `📦 Current VSCode extension version: ${currentVscodeVersion}`);
    log('blue', `📦 Target CLI version: ${cliVersion}`);

    // CRITICAL: Only update if currently showing placeholder
    if (currentVscodeVersion === '0.0.0-semantically-released') {
      log('blue', '🔄 Updating version from semantic-release placeholder...');
      
      // Update VSCode extension version to match CLI
      const updatedVscodePackage = { ...vscodePackage };
      updatedVscodePackage.version = cliVersion;

      // Update embedded CLI dependency
      const finalVscodePackage = updateEmbeddedCliDependency(updatedVscodePackage, cliVersion);

      // Write updated package.json (LOCAL ONLY - not committed)
      writePackageJson(vscodePackagePath, finalVscodePackage);
      
      log('green', `✅ VSCode extension version updated: ${currentVscodeVersion} → ${cliVersion}`);
    } else {
      // Version already updated - verify it matches
      if (currentVscodeVersion === cliVersion) {
        log('green', '✅ Version already synchronized correctly');
      } else {
        log('red', `❌ CRITICAL: Version mismatch detected`);
        log('red', `   Current VSCode version: ${currentVscodeVersion}`);
        log('red', `   Expected CLI version: ${cliVersion}`);
        log('red', '💥 This indicates a synchronization failure');
        process.exit(1);
      }
    }

    // Final validation
    validateVersionSync(cliVersion, cliVersion);

    log('green', '🎉 Version synchronization completed successfully!');
    log('cyan', `📋 VSCode extension now uses version: ${cliVersion}`);
    log('cyan', `📋 Embedded CLI version: ${cliVersion}`);
    log('yellow', '🔒 IMPORTANT: These changes are local only and will NOT be committed to git');
    log('yellow', '🔒 The package.json file will remain as "0.0.0-semantically-released" in the repository');

  } catch (error) {
    log('red', `💥 CRITICAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getLatestCliVersionFromNpm,
  verifyCliPackageExists,
  updateEmbeddedCliDependency,
  validateVersionSync
};