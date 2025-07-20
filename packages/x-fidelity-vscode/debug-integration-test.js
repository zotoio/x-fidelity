const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=== Debug VSCode Extension Integration Test Flow ===');

async function debugIntegrationTestFlow() {
  const testWorkspace = path.resolve('../x-fidelity-fixtures/node-fullstack');
  const resultsDir = path.join(testWorkspace, '.xfiResults');
  const resultFile = path.join(resultsDir, 'XFI_RESULT.json');
  
  console.log('📁 Test workspace:', testWorkspace);
  console.log('📂 Results directory:', resultsDir);
  console.log('📄 Expected result file:', resultFile);
  
  // Step 1: Simulate test cache clearing (like runInitialAnalysis with forceRefresh=true)
  console.log('\n🧹 Step 1: Simulating test cache clearing...');
  // CRITICAL: We NEVER delete XFI_RESULT.json - it should always exist and be overwritten
  // Only clear other cache files to simulate fresh analysis
  const cacheMetadataFile = path.join(resultsDir, 'cache-metadata.json');
  if (fs.existsSync(cacheMetadataFile)) {
    fs.unlinkSync(cacheMetadataFile);
    console.log('✅ Deleted cache metadata file (simulating forceRefresh=true)');
  } else {
    console.log('ℹ️  No cache metadata file to delete');
  }
  
  // List current state
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    console.log('📂 Files in .xfiResults BEFORE analysis:', files.join(', '));
  } else {
    console.log('📂 .xfiResults directory does not exist before analysis');
  }
  
  // Step 2: Run CLI analysis exactly like VSCode extension does
  console.log('\n🚀 Step 2: Running CLI analysis exactly like VSCode extension...');
  
  const cliPath = path.resolve('../x-fidelity-cli/dist/index.js');
  console.log('📍 CLI path:', cliPath);
  
  if (!fs.existsSync(cliPath)) {
    console.error('❌ CLI not found at:', cliPath);
    process.exit(1);
  }
  
  const args = [
    cliPath,
    '--dir',
    testWorkspace,
    '--output-format',
    'json',
    '--mode',
    'vscode', // Use VSCode execution mode
    '--enable-tree-sitter-worker' // Enable WASM tree-sitter for VSCode
  ];
  
  console.log('🔧 CLI command:', 'node', args.join(' '));
  console.log('🌍 Environment variables (updated for mode-based execution):');
  console.log('   XFI_LOG_LEVEL=warn');
  
  const cliResult = await new Promise((resolve, reject) => {
    const child = spawn('node', args, {
      cwd: testWorkspace,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      env: {
        ...process.env,
        XFI_LOG_LEVEL: 'warn' // Use consistent log level for CLI output
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
  
  console.log(`\n📊 CLI completed with exit code: ${cliResult.code}`);
  console.log(`📏 STDOUT length: ${cliResult.stdout.length} chars`);
  console.log(`📏 STDERR length: ${cliResult.stderr.length} chars`);
  
  // Step 3: Check CLI exit code handling (like VSCode extension)
  console.log('\n🔍 Step 3: Checking CLI exit code handling...');
  if (cliResult.code !== 0 && cliResult.code !== 1) {
    console.log(`❌ CLI failed with unexpected exit code: ${cliResult.code}`);
    console.log('📤 STDERR (last 500 chars):', cliResult.stderr.slice(-500));
    return false;
  } else {
    console.log(`✅ CLI exit code ${cliResult.code} is acceptable (0=success, 1=issues found)`);
  }
  
  // Step 4: Check file system state immediately after CLI completion
  console.log('\n📂 Step 4: Checking file system state after CLI...');
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    console.log('📂 Files in .xfiResults AFTER analysis:', files.join(', '));
    
    // Check each file
    files.forEach(file => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file}: ${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toISOString()}`);
    });
  } else {
    console.log('❌ .xfiResults directory does not exist after analysis');
    return false;
  }
  
  // Step 5: Check if XFI_RESULT.json exists (like VSCode parseXFIResultFromFile)
  console.log('\n📄 Step 5: Checking XFI_RESULT.json existence...');
  if (fs.existsSync(resultFile)) {
    const stats = fs.statSync(resultFile);
    console.log('✅ XFI_RESULT.json EXISTS');
    console.log(`📏 File size: ${Math.round(stats.size / 1024)}KB`);
    console.log(`🕐 Modified: ${stats.mtime.toISOString()}`);
    
    // Step 6: Try to parse the file (like VSCode extension)
    console.log('\n📖 Step 6: Attempting to parse XFI_RESULT.json...');
    try {
      const content = fs.readFileSync(resultFile, 'utf8');
      console.log(`📏 File content length: ${content.length} chars`);
      
      if (!content.trim()) {
        console.log('❌ File is empty');
        return false;
      }
      
      const data = JSON.parse(content);
      console.log('✅ JSON parsing successful');
      console.log(`📋 Total issues: ${data.XFI_RESULT?.totalIssues || 'unknown'}`);
      console.log(`📁 Files analyzed: ${data.XFI_RESULT?.fileCount || 'unknown'}`);
      console.log(`⚠️  Warning count: ${data.XFI_RESULT?.warningCount || 0}`);
      console.log(`💀 Fatality count: ${data.XFI_RESULT?.fatalityCount || 0}`);
      console.log(`🔥 Error count: ${data.XFI_RESULT?.errorCount || 0}`);
      
      return true;
    } catch (e) {
      console.log('❌ JSON parsing failed:', e.message);
      return false;
    }
  } else {
    console.log('❌ XFI_RESULT.json does NOT exist');
    return false;
  }
}

// Step 7: Simulate the VSCode extension test timeout issue
async function simulateTestTimeout() {
  console.log('\n⏱️  Step 7: Simulating VSCode extension test timeout scenario...');
  
  const testWorkspace = path.resolve('../x-fidelity-fixtures/node-fullstack');
  const resultFile = path.join(testWorkspace, '.xfiResults', 'XFI_RESULT.json');
  
  // Simulate waitForAnalysisCompletion logic
  const startTime = Date.now();
  const timeout = 90000; // 90 seconds like in tests
  
  console.log('🔄 Simulating waitForAnalysisCompletion with 90s timeout...');
  
  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(resultFile)) {
      console.log(`✅ XFI_RESULT.json found after ${Date.now() - startTime}ms`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`❌ Timeout: XFI_RESULT.json not found within ${timeout}ms`);
  return false;
}

// Run the complete debug flow
async function main() {
  try {
    console.log('🎯 Running complete debug flow...\n');
    
    const analysisSuccess = await debugIntegrationTestFlow();
    
    if (analysisSuccess) {
      console.log('\n✅ Analysis flow completed successfully');
      
      const timeoutTest = await simulateTestTimeout();
      if (timeoutTest) {
        console.log('✅ Timeout simulation successful');
      } else {
        console.log('❌ Timeout simulation failed');
      }
    } else {
      console.log('\n❌ Analysis flow failed');
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('   - XFI_RESULT.json creation: ', analysisSuccess ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   - Test timeout scenario: ', analysisSuccess ? '✅ WOULD PASS' : '❌ WOULD TIMEOUT');
    
    process.exit(analysisSuccess ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Debug script failed:', error);
    process.exit(1);
  }
}

main(); 