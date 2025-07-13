#!/usr/bin/env node

/**
 * VSCode Extension VSIX Installation Test Script
 *
 * This script tests the installation and basic functionality of the VSCode extension
 * from a packaged VSIX file. It provides comprehensive validation including:
 * - VSIX file existence and integrity
 * - VSCode CLI availability
 * - Extension installation
 * - Extension listing verification
 * - Cross-platform support
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();
const isCI = process.env.CI === 'true';

console.log('🧪 VSCode Extension VSIX Installation Test');
console.log(`📋 Platform: ${platform} (CI: ${isCI})`);

async function findVsixFile() {
  console.log('\n🔍 Looking for VSIX file...');

  try {
    const files = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));

    if (files.length === 0) {
      throw new Error('No VSIX file found. Run "yarn package" first.');
    }

    if (files.length > 1) {
      console.log(`⚠️  Multiple VSIX files found: ${files.join(', ')}`);
      console.log(`Using: ${files[0]}`);
    }

    const vsixFile = files[0];
    console.log(`✅ Found VSIX file: ${vsixFile}`);

    // Check file size
    const stats = fs.statSync(vsixFile);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`📦 File size: ${sizeKB}KB`);

    return vsixFile;
  } catch (error) {
    console.error(`❌ Error finding VSIX file: ${error.message}`);
    process.exit(1);
  }
}

async function testVsixIntegrity(vsixFile) {
  console.log('\n🔍 Testing VSIX file integrity...');

  return new Promise((resolve, reject) => {
    const unzip = spawn('unzip', ['-t', vsixFile], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    unzip.stdout.on('data', data => {
      output += data.toString();
    });

    unzip.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    unzip.on('close', code => {
      if (code === 0) {
        console.log('✅ VSIX file integrity check passed');
        resolve();
      } else {
        console.error('❌ VSIX file integrity check failed');
        console.error(`Error output: ${errorOutput}`);
        reject(new Error('VSIX file is corrupted'));
      }
    });

    unzip.on('error', error => {
      if (error.code === 'ENOENT') {
        console.log('⚠️  unzip command not found, skipping integrity check');
        resolve(); // Don't fail if unzip is not available
      } else {
        reject(error);
      }
    });
  });
}

async function checkVscodeCliAvailability() {
  console.log('\n🔍 Checking VSCode CLI availability...');

  return new Promise((resolve, reject) => {
    const vscode = spawn('code', ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    vscode.stdout.on('data', data => {
      output += data.toString();
    });

    vscode.on('close', code => {
      if (code === 0) {
        const version = output.split('\n')[0];
        console.log(`✅ VSCode CLI available: ${version}`);
        resolve();
      } else {
        reject(new Error('VSCode CLI not available'));
      }
    });

    vscode.on('error', error => {
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            'VSCode CLI not found. Please install VSCode or add it to PATH.'
          )
        );
      } else {
        reject(error);
      }
    });
  });
}

async function installExtension(vsixFile) {
  console.log('\n📦 Installing extension...');

  return new Promise((resolve, reject) => {
    const vscode = spawn('code', ['--install-extension', vsixFile, '--force'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    vscode.stdout.on('data', data => {
      output += data.toString();
    });

    vscode.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    vscode.on('close', code => {
      if (code === 0) {
        console.log('✅ Extension installed successfully');
        console.log(`Output: ${output.trim()}`);
        resolve();
      } else {
        console.error(`❌ Extension installation failed (exit code: ${code})`);
        console.error(`Error output: ${errorOutput}`);
        reject(new Error('Extension installation failed'));
      }
    });
  });
}

async function verifyExtensionInstallation() {
  console.log('\n🔍 Verifying extension installation...');

  return new Promise((resolve, reject) => {
    const vscode = spawn('code', ['--list-extensions'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    vscode.stdout.on('data', data => {
      output += data.toString();
    });

    vscode.on('close', code => {
      if (code === 0) {
        const extensions = output.split('\n').filter(ext => ext.trim());
        const xFidelityExtension = extensions.find(
          ext =>
            ext.includes('x-fidelity-vscode') ||
            ext.includes('zotoio.x-fidelity-vscode')
        );

        if (xFidelityExtension) {
          console.log(
            `✅ Extension verified in installed list: ${xFidelityExtension}`
          );
          console.log(`📊 Total extensions installed: ${extensions.length}`);
          resolve();
        } else {
          console.error('❌ Extension not found in installed extensions list');
          console.log('Installed extensions:');
          extensions.forEach(ext => console.log(`  - ${ext}`));
          reject(new Error('Extension not found in installed list'));
        }
      } else {
        reject(new Error('Failed to list extensions'));
      }
    });
  });
}

async function runTest() {
  try {
    const vsixFile = await findVsixFile();
    await testVsixIntegrity(vsixFile);
    await checkVscodeCliAvailability();
    await installExtension(vsixFile);
    await verifyExtensionInstallation();

    console.log('\n🎉 All tests passed! Extension installation successful.');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);

    if (isCI) {
      console.log('\n💡 This is a CI environment. Consider:');
      console.log('  - Ensuring VSCode CLI is installed in the CI setup');
      console.log('  - Using headless testing with xvfb');
      console.log('  - Checking if extension packaging completed successfully');
    } else {
      console.log('\n💡 For local development:');
      console.log(
        '  1. Install VSCode: https://code.visualstudio.com/download'
      );
      console.log('  2. Add VSCode to PATH or use VSCode CLI');
      console.log('  3. Run "yarn package" to create VSIX file');
      console.log('  4. Try running this test again');
    }

    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Test terminated');
  process.exit(143);
});

// Run the test
runTest();
