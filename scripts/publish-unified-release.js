#!/usr/bin/env node

/**
 * Unified Release Publishing Script
 * Publishes both CLI to npm and VSCode extension to marketplaces
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

function runCommand(command, cwd, description, continueOnError = false) {
  try {
    log('blue', `🚀 ${description}...`);
    const result = execSync(command, { cwd, stdio: 'pipe', encoding: 'utf8' });
    log('green', `✅ ${description} completed`);
    return { success: true, output: result };
  } catch (error) {
    const message = `❌ ${description} failed: ${error.message}`;
    if (continueOnError) {
      log('yellow', message + ' (continuing...)');
      return { success: false, output: error.stdout || error.message };
    } else {
      log('red', message);
      return { success: false, output: error.stdout || error.message };
    }
  }
}

function publishCLI(cliDir, version) {
  log('blue', `📦 Publishing CLI package v${version} to npm...`);
  
  // Verify NPM_TOKEN exists
  if (!process.env.NPM_TOKEN) {
    log('red', '❌ NPM_TOKEN environment variable is required');
    return false;
  }

  // Publish to npm
  const result = runCommand('npm publish --access public', cliDir, 'Publishing CLI to npm');
  
  if (!result.success) {
    log('red', '❌ CLI publishing failed');
    console.log('Output:', result.output);
    return false;
  }

  log('green', `✅ CLI v${version} published to npm successfully`);
  return true;
}

function publishVSCodeExtension(vscodeDir, version) {
  log('blue', `🎨 Publishing VSCode extension v${version} to marketplaces...`);
  
  // Verify required tokens exist
  const requiredTokens = ['VSCE_PAT', 'OVSX_PAT'];
  const missingTokens = requiredTokens.filter(token => !process.env[token]);
  
  if (missingTokens.length > 0) {
    log('red', `❌ Missing required environment variables: ${missingTokens.join(', ')}`);
    return false;
  }

  // Find VSIX file
  const vsixFiles = fs.readdirSync(vscodeDir).filter(f => f.endsWith('.vsix'));
  if (vsixFiles.length === 0) {
    log('red', '❌ No VSIX file found');
    return false;
  }

  const vsixFile = vsixFiles[0];
  log('blue', `📄 Using VSIX file: ${vsixFile}`);

  // Publish to VSCode Marketplace
  const vsceResult = runCommand(
    `npx vsce publish --packagePath ${vsixFile}`,
    vscodeDir,
    'Publishing to VSCode Marketplace',
    true // Continue on error to try Open VSX
  );

  // Publish to Open VSX
  const ovsxResult = runCommand(
    `npx ovsx publish ${vsixFile}`,
    vscodeDir,
    'Publishing to Open VSX Registry',
    true // Continue on error
  );

  // Check results
  const vsceSuccess = vsceResult.success;
  const ovsxSuccess = ovsxResult.success;

  if (!vsceSuccess && !ovsxSuccess) {
    log('red', '❌ Both marketplace publications failed');
    console.log('VSCE Output:', vsceResult.output);
    console.log('OVSX Output:', ovsxResult.output);
    return false;
  }

  if (!vsceSuccess) {
    log('yellow', '⚠️  VSCode Marketplace publication failed, but Open VSX succeeded');
    console.log('VSCE Output:', vsceResult.output);
  }

  if (!ovsxSuccess) {
    log('yellow', '⚠️  Open VSX publication failed, but VSCode Marketplace succeeded');
    console.log('OVSX Output:', ovsxResult.output);
  }

  if (vsceSuccess && ovsxSuccess) {
    log('green', `✅ VSCode extension v${version} published to both marketplaces successfully`);
  } else {
    log('yellow', `⚠️  VSCode extension v${version} published to at least one marketplace`);
  }

  return true;
}

function main() {
  const version = process.argv[2];
  
  if (!version) {
    log('red', '❌ Version argument is required');
    process.exit(1);
  }

  log('blue', `🚀 Publishing unified release v${version}`);

  const rootDir = path.resolve(__dirname, '..');
  const cliDir = path.join(rootDir, 'packages', 'x-fidelity-cli');
  const vscodeDir = path.join(rootDir, 'packages', 'x-fidelity-vscode');

  let cliSuccess = false;
  let vscodeSuccess = false;

  // Publish CLI
  try {
    cliSuccess = publishCLI(cliDir, version);
  } catch (error) {
    log('red', `❌ CLI publishing failed with error: ${error.message}`);
  }

  // Publish VSCode extension
  try {
    vscodeSuccess = publishVSCodeExtension(vscodeDir, version);
  } catch (error) {
    log('red', `❌ VSCode extension publishing failed with error: ${error.message}`);
  }

  // Summary
  log('blue', '📊 Publishing Summary:');
  log(cliSuccess ? 'green' : 'red', `   CLI (npm): ${cliSuccess ? 'SUCCESS' : 'FAILED'}`);
  log(vscodeSuccess ? 'green' : 'red', `   VSCode Extension: ${vscodeSuccess ? 'SUCCESS' : 'FAILED'}`);

  if (cliSuccess && vscodeSuccess) {
    log('green', `🎉 Unified release v${version} published successfully!`);
    log('blue', `📦 Both packages are now available with synchronized version ${version}`);
    process.exit(0);
  } else if (cliSuccess || vscodeSuccess) {
    log('yellow', `⚠️  Partial success - some packages failed to publish`);
    process.exit(1);
  } else {
    log('red', `❌ Unified release v${version} failed - no packages were published`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };