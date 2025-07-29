#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.trim() : '';
  } catch (error) {
    log('red', `❌ Command failed: ${command}`);
    log('red', `Error: ${error.message}`);
    throw error;
  }
}

function validatePrerequisites() {
  log('blue', '🔍 Validating publishing prerequisites...');
  
  // Check for required environment variables
  const requiredEnvVars = ['VSCE_PAT', 'OVSX_PAT'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log('red', `❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  // Check for required CLI tools
  try {
    execCommand('vsce --version', { silent: true });
    log('green', '✅ vsce CLI tool available');
  } catch (error) {
    log('red', '❌ vsce CLI tool not found - please install with: npm install -g @vscode/vsce');
    process.exit(1);
  }
  
  try {
    execCommand('ovsx --version', { silent: true });
    log('green', '✅ ovsx CLI tool available');
  } catch (error) {
    log('red', '❌ ovsx CLI tool not found - please install with: npm install -g ovsx');
    process.exit(1);
  }
  
  log('green', '✅ All prerequisites validated');
}

function validateVersionSync() {
  log('blue', '🔍 Validating version synchronization...');
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const vscodeVersion = pkg.version;
  
  // Check if version is semantic release placeholder - this should NOT happen at publish time
  if (vscodeVersion === '0.0.0-semantically-released') {
    log('red', '❌ CRITICAL: Version still shows semantic-release placeholder');
    log('red', '❌ Version synchronization must happen before publishing');
    log('red', '💡 This indicates the sync-published-version script was not run or failed');
    throw new Error('Version not synchronized - cannot publish with placeholder version');
  }
  
  // Try to get the CLI version from npm to verify sync
  try {
    const cliVersion = execCommand('npm view x-fidelity version', { silent: true });
    
    if (vscodeVersion !== cliVersion) {
      log('red', '❌ CRITICAL: Version mismatch detected:');
      log('red', `    VSCode Extension: ${vscodeVersion}`);
      log('red', `    Published CLI: ${cliVersion}`);
      log('red', '❌ Versions must be synchronized before publishing');
      throw new Error(`Version mismatch: VSCode=${vscodeVersion}, CLI=${cliVersion}`);
    } else {
      log('green', `✅ Versions synchronized: ${vscodeVersion}`);
    }
  } catch (error) {
    if (error.message.includes('Version mismatch')) {
      throw error; // Re-throw version mismatch errors
    }
    log('red', '❌ CRITICAL: Could not verify CLI version from npm');
    log('red', '❌ This usually means the CLI package was not published successfully');
    throw new Error('Cannot verify CLI version - CLI may not be published');
  }
  
  return vscodeVersion;
}

function packageExtension() {
  log('blue', '📦 Packaging universal extension...');
  
  // Clean any existing VSIX files first
  const existingVsix = execCommand('ls *.vsix 2>/dev/null || true', { silent: true });
  if (existingVsix) {
    log('blue', '🧹 Cleaning existing VSIX files...');
    execCommand('rm -f *.vsix');
  }
  
  // Package the extension
  execCommand('vsce package --yarn', { stdio: 'inherit' });
  
  // Find the generated VSIX file
  const vsixFiles = execCommand('ls *.vsix', { silent: true }).split('\n').filter(f => f.trim());
  
  if (vsixFiles.length === 0) {
    log('red', '❌ No VSIX file generated');
    process.exit(1);
  }
  
  if (vsixFiles.length > 1) {
    log('yellow', `⚠️  Multiple VSIX files found: ${vsixFiles.join(', ')}`);
    log('yellow', '⚠️  Using the first one');
  }
  
  const vsixFile = vsixFiles[0];
  log('green', `✅ Extension packaged: ${vsixFile}`);
  
  return vsixFile;
}

function validateVsixPackage(vsixFile) {
  log('blue', `🔍 Validating VSIX package: ${vsixFile}`);
  
  // Check file exists and has reasonable size
  const stats = fs.statSync(vsixFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  log('blue', `📊 Package size: ${sizeMB} MB`);
  
  if (stats.size < 100 * 1024) { // Less than 100KB is suspicious
    log('red', '❌ VSIX file seems too small - possible packaging issue');
    process.exit(1);
  }
  
  if (stats.size > 50 * 1024 * 1024) { // More than 50MB is too large
    log('red', '❌ VSIX file is too large (>50MB) - check bundle size');
    process.exit(1);
  }
  
  log('green', '✅ VSIX package validation passed');
}

function publishToMarketplace(vsixFile) {
  log('cyan', '🌐 Publishing to VS Code Marketplace...');
  
  try {
    // Use the specific VSIX file to ensure both marketplaces get identical package
    execCommand(`vsce publish --packagePath ${vsixFile}`, { stdio: 'inherit' });
    log('green', '✅ Successfully published to VS Code Marketplace');
    return true;
  } catch (error) {
    log('red', '❌ Failed to publish to VS Code Marketplace');
    throw error;
  }
}

function publishToOpenVSX(vsixFile) {
  log('cyan', '🌐 Publishing to Open VSX Registry...');
  
  try {
    // Use the same VSIX file to ensure consistency
    execCommand(`ovsx publish ${vsixFile}`, { stdio: 'inherit' });
    log('green', '✅ Successfully published to Open VSX Registry');
    return true;
  } catch (error) {
    log('red', '❌ Failed to publish to Open VSX Registry');
    throw error;
  }
}

async function publishUniversal() {
  log('cyan', '🚀 Starting universal VSCode extension publishing...');
  
  try {
    // Phase 1: Validate prerequisites
    validatePrerequisites();
    
    // Phase 2: Validate version synchronization
    const version = validateVersionSync();
    log('blue', `📦 Publishing version: ${version}`);
    
    // Phase 3: Package extension
    const vsixFile = packageExtension();
    
    // Phase 4: Validate package
    validateVsixPackage(vsixFile);
    
    // Phase 5: Publish to both marketplaces using the same VSIX
    log('cyan', '🌐 Publishing to both marketplaces...');
    
    const marketplaceSuccess = await publishToMarketplace(vsixFile);
    const openVsxSuccess = await publishToOpenVSX(vsixFile);
    
    if (marketplaceSuccess && openVsxSuccess) {
      log('green', '🎉 Successfully published universal extension to both marketplaces!');
      log('cyan', `📦 Published package: ${vsixFile}`);
      log('cyan', `📋 Version: ${version}`);
      log('cyan', '📍 Available on:');
      log('cyan', '   • VS Code Marketplace');
      log('cyan', '   • Open VSX Registry');
    } else {
      log('red', '❌ Partial publication failure');
      process.exit(1);
    }
    
  } catch (error) {
    log('red', `💥 Publishing failed: ${error.message}`);
    
    // Provide helpful error context
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      log('yellow', '💡 Tip: Check your internet connection and registry availability');
    } else if (error.message.includes('authentication') || error.message.includes('token')) {
      log('yellow', '💡 Tip: Verify your VSCE_PAT and OVSX_PAT environment variables');
    } else if (error.message.includes('already exists') || error.message.includes('version')) {
      log('yellow', '💡 Tip: This version may already be published - check marketplace');
    }
    
    process.exit(1);
  }
}

publishUniversal().catch(console.error); 