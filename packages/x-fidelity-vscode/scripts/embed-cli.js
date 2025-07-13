#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to embed the X-Fidelity CLI into the VSCode extension for bundling
 */

const SCRIPT_DIR = __dirname;
const VSCODE_ROOT = path.resolve(SCRIPT_DIR, '..');
const CLI_PACKAGE_DIR = path.resolve(VSCODE_ROOT, '../x-fidelity-cli');
const CLI_DIST_DIR = path.join(CLI_PACKAGE_DIR, 'dist');
const EMBEDDED_CLI_DIR = path.join(VSCODE_ROOT, 'cli');

console.log('🔧 Embedding X-Fidelity CLI into VSCode extension...');
console.log(`📂 CLI source: ${CLI_DIST_DIR}`);
console.log(`📂 CLI target: ${EMBEDDED_CLI_DIR}`);

// Ensure CLI is built
console.log('📦 Building CLI package...');
try {
  execSync('yarn build', {
    cwd: CLI_PACKAGE_DIR,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Failed to build CLI package:', error.message);
  process.exit(1);
}

// Check if CLI dist directory exists
if (!fs.existsSync(CLI_DIST_DIR)) {
  console.error(`❌ CLI dist directory not found: ${CLI_DIST_DIR}`);
  process.exit(1);
}

// Check if main CLI file exists
const mainCLIFile = path.join(CLI_DIST_DIR, 'index.js');
if (!fs.existsSync(mainCLIFile)) {
  console.error(`❌ Main CLI file not found: ${mainCLIFile}`);
  process.exit(1);
}

// Remove existing embedded CLI directory
if (fs.existsSync(EMBEDDED_CLI_DIR)) {
  console.log('🗑️  Removing existing embedded CLI...');
  fs.rmSync(EMBEDDED_CLI_DIR, { recursive: true, force: true });
}

// Create embedded CLI directory
console.log('📁 Creating embedded CLI directory...');
fs.mkdirSync(EMBEDDED_CLI_DIR, { recursive: true });

// Copy CLI files
console.log('📋 Copying CLI files...');
const copyRecursively = (src, dest) => {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      copyRecursively(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

try {
  copyRecursively(CLI_DIST_DIR, EMBEDDED_CLI_DIR);
  console.log('✅ CLI files copied successfully');
} catch (error) {
  console.error('❌ Failed to copy CLI files:', error.message);
  process.exit(1);
}

// Verify the embedded CLI
const embeddedMainFile = path.join(EMBEDDED_CLI_DIR, 'index.js');
if (!fs.existsSync(embeddedMainFile)) {
  console.error(`❌ Embedded CLI main file not found: ${embeddedMainFile}`);
  process.exit(1);
}

// Get file sizes for reporting
const getFileSize = filePath => {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2) + ' MB';
};

console.log('📊 Embedded CLI information:');
console.log(`   Main file: ${embeddedMainFile}`);
console.log(`   Size: ${getFileSize(embeddedMainFile)}`);

// List all files in embedded CLI
const embeddedFiles = fs.readdirSync(EMBEDDED_CLI_DIR);
console.log(`   Files: ${embeddedFiles.join(', ')}`);

console.log('🎉 CLI embedding completed successfully!');
