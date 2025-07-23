#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Testing XFI_RESULT.json Persistence After Each Test ===\n');

const fixturesDir = path.resolve(__dirname, '../x-fidelity-fixtures/node-fullstack');
const resultsDir = path.join(fixturesDir, '.xfiResults');
const xfiResultFile = path.join(resultsDir, 'XFI_RESULT.json');

// First, ensure XFI_RESULT.json exists before any tests
async function ensureXFIResultExists() {
  console.log('🔧 Setting up initial XFI_RESULT.json...');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Run CLI to create initial XFI_RESULT.json
  const cliPath = path.resolve(__dirname, 'dist/cli/index.js');
  console.log(`Running CLI: node ${cliPath} --dir ${fixturesDir} --output-format json`);
  
  const cliResult = spawn('node', [cliPath, '--dir', fixturesDir, '--output-format', 'json'], {
    stdio: 'pipe',
    cwd: __dirname
  });
  
  await new Promise((resolve, reject) => {
    cliResult.on('close', (code) => {
      if (fs.existsSync(xfiResultFile)) {
        const stats = fs.statSync(xfiResultFile);
        console.log(`✅ Initial XFI_RESULT.json created: ${stats.size} bytes`);
        resolve();
      } else {
        reject(new Error('Failed to create initial XFI_RESULT.json'));
      }
    });
  });
}

// Check if XFI_RESULT.json exists and log details
function checkXFIResult(testName) {
  if (fs.existsSync(xfiResultFile)) {
    const stats = fs.statSync(xfiResultFile);
    console.log(`✅ ${testName}: XFI_RESULT.json EXISTS (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
    return true;
  } else {
    console.log(`❌ ${testName}: XFI_RESULT.json MISSING!`);
    return false;
  }
}

// Run a specific test file
async function runTest(testFile) {
  console.log(`\n🧪 Running test: ${testFile}`);
  
  const testProcess = spawn('npx', ['mocha', testFile, '--timeout', '60000'], {
    stdio: 'pipe',
    cwd: __dirname
  });
  
  let stdout = '';
  let stderr = '';
  
  testProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  testProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  return new Promise((resolve) => {
    testProcess.on('close', (code) => {
      console.log(`Test completed with exit code: ${code}`);
      if (code !== 0) {
        console.log('STDOUT:', stdout.slice(-500)); // Last 500 chars
        console.log('STDERR:', stderr.slice(-500)); // Last 500 chars
      }
      
      const exists = checkXFIResult(path.basename(testFile));
      resolve({ testFile, exitCode: code, exists, stdout, stderr });
    });
  });
}

// Main test execution
async function main() {
  try {
    // Setup initial file
    await ensureXFIResultExists();
    
    // Check before any tests
    checkXFIResult('INITIAL STATE');
    
    // List of integration test files to check
    const testFiles = [
      'src/test/integration/diagnostics.test.ts',
      'src/test/integration/navigation.test.ts', 
      'src/test/integration/ui-comprehensive.test.ts'
    ];
    
    const results = [];
    
    // Run each test individually and check XFI_RESULT.json after each
    for (const testFile of testFiles) {
      if (fs.existsSync(testFile)) {
        const result = await runTest(testFile);
        results.push(result);
        
        // If file is missing, try to understand why
        if (!result.exists) {
          console.log(`\n🔍 INVESTIGATING: Why was XFI_RESULT.json deleted by ${testFile}?`);
          
          // Check if stderr/stdout mentions deletion
          if (result.stderr.includes('XFI_RESULT') || result.stdout.includes('XFI_RESULT')) {
            console.log('Found XFI_RESULT mentions in test output:');
            console.log(result.stderr + result.stdout);
          }
        }
      } else {
        console.log(`⚠️  Test file not found: ${testFile}`);
      }
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    const failedTests = results.filter(r => !r.exists);
    
    if (failedTests.length === 0) {
      console.log('🎉 SUCCESS: XFI_RESULT.json persisted after all tests!');
    } else {
      console.log(`❌ FAILURE: ${failedTests.length} tests caused XFI_RESULT.json to be deleted:`);
      failedTests.forEach(test => {
        console.log(`  - ${test.testFile}`);
      });
    }
    
    return failedTests.length === 0;
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    return false;
  }
}

main().then(success => {
  process.exit(success ? 0 : 1);
}); 