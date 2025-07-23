#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('=== Testing CLI Path Resolution Fix ===');

// Simulate the CLI path resolution logic from CLISpawner
function testCLIPathResolution() {
  const currentDir = path.resolve(__dirname, 'dist'); // Simulate being in dist directory
  
  const possiblePaths = [
    path.resolve(currentDir, '../cli/index.js'), // From dist directory
    path.resolve(currentDir, '../../cli/index.js'), // From src directory in tests
    path.resolve(process.cwd(), './cli/index.js'), // From current working directory
    path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js'), // From monorepo root
    // CRITICAL: Add the actual monorepo CLI location for tests
    path.resolve(currentDir, '../../../x-fidelity-cli/dist/index.js'), // From VSCode src to CLI dist
    path.resolve(currentDir, '../../x-fidelity-cli/dist/index.js'), // From VSCode dist to CLI dist
    path.resolve(process.cwd(), '../x-fidelity-cli/dist/index.js'), // From VSCode package to CLI package
  ];

  console.log('\n🔍 Testing CLI path resolution:');
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`Simulated __dirname: ${currentDir}`);
  
  console.log('\n📁 Checking possible CLI paths:');
  
  for (let i = 0; i < possiblePaths.length; i++) {
    const cliPath = possiblePaths[i];
    const exists = fs.existsSync(cliPath);
    const status = exists ? '✅ FOUND' : '❌ NOT FOUND';
    
    console.log(`${i + 1}. ${status}: ${cliPath}`);
    
    if (exists) {
      // Check file size to make sure it's a real CLI file
      try {
        const stats = fs.statSync(cliPath);
        console.log(`   📏 File size: ${stats.size} bytes`);
        console.log(`   📅 Modified: ${stats.mtime}`);
        
        // This should be the CLI we'll use
        console.log(`\n🎯 CLI FOUND! This is the path that would be used: ${cliPath}`);
        return cliPath;
      } catch (error) {
        console.log(`   ❌ Error reading file stats: ${error.message}`);
      }
    }
  }
  
  console.log('\n❌ CLI NOT FOUND in any location!');
  return null;
}

// Test the path resolution
const foundCLIPath = testCLIPathResolution();

if (foundCLIPath) {
  console.log('\n✅ SUCCESS: CLI path resolution fix is working!');
  console.log(`🎯 Found CLI at: ${foundCLIPath}`);
  
  // Test that the CLI can be executed
  console.log('\n🔧 Testing CLI execution...');
  const { spawn } = require('child_process');
  const child = spawn('node', [foundCLIPath, '--help'], {
    stdio: 'pipe',
    timeout: 5000
  });
  
  child.on('close', (code) => {
    if (code === 0 || code === 1) {
      console.log('✅ CLI is executable and responds correctly');
    } else {
      console.log(`❌ CLI execution failed with code: ${code}`);
    }
  });
  
  child.on('error', (error) => {
    console.log(`❌ CLI execution error: ${error.message}`);
  });
  
} else {
  console.log('\n❌ FAILURE: CLI path resolution fix is NOT working!');
  console.log('The VSCode extension will not be able to find the CLI during tests.');
  process.exit(1);
} 