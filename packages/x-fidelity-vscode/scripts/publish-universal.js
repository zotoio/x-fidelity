#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

async function publishUniversal() {
  console.log('🚀 Publishing universal VSCode extension...');
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = pkg.version;
  
  console.log(`📦 Publishing version ${version}`);

  try {
    // Package universal extension
    console.log('📦 Packaging universal extension...');
    execSync('vsce package --yarn', { stdio: 'inherit' });

    // Publish to VS Code Marketplace
    console.log('🌐 Publishing to VS Code Marketplace...');
    execSync('vsce publish --yarn', { stdio: 'inherit' });

    // Publish to Open VSX Registry
    console.log('🌐 Publishing to Open VSX Registry...');
    execSync('ovsx publish', { stdio: 'inherit' });

    console.log('✅ Successfully published universal extension!');
  } catch (error) {
    console.error('❌ Failed to publish:', error.message);
    process.exit(1);
  }
}

publishUniversal().catch(console.error); 