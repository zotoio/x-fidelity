const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Testing VSCode Extension CLI Execution ===');

async function testVSCodeCLIExecution() {
  const testWorkspace = path.resolve('../x-fidelity-fixtures/node-fullstack');
  const resultsDir = path.join(testWorkspace, '.xfiResults');
  const resultFile = path.join(resultsDir, 'XFI_RESULT.json');
  
  console.log('📁 Test workspace:', testWorkspace);
  console.log('📂 Results directory:', resultsDir);
  console.log('📄 Expected result file:', resultFile);
  
  // Step 1: Clean up existing results (mimicking test behavior)
  console.log('\n🧹 Cleaning up existing results...');
  // CRITICAL: We NEVER delete XFI_RESULT.json - it should always exist and be overwritten
  // Only clear other cache files to simulate fresh analysis
  const cacheMetadataFile = path.join(resultsDir, 'cache-metadata.json');
  if (fs.existsSync(cacheMetadataFile)) {
    fs.unlinkSync(cacheMetadataFile);
    console.log('✅ Deleted cache metadata file');
  } else {
    console.log('ℹ️  No cache metadata file to delete');
  }
  
  // Step 2: Run CLI with same arguments as VSCode extension
  console.log('\n🚀 Running CLI analysis (mimicking VSCode extension)...');
  
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
  console.log('🌍 Environment variables:');
  console.log('   XFI_LOG_LEVEL=warn');
  
  return new Promise((resolve, reject) => {
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
      console.log(`\n📊 CLI completed with exit code: ${code}`);
      
      if (stdout.length > 0) {
        console.log('📤 STDOUT (last 1000 chars):');
        console.log(stdout.slice(-1000));
      }
      
      if (stderr.length > 0) {
        console.log('📤 STDERR (last 1000 chars):');
        console.log(stderr.slice(-1000));
      }
      
      // Step 3: Check if XFI_RESULT.json was created
      console.log('\n🔍 Checking result file creation...');
      
      if (fs.existsSync(resultFile)) {
        const stats = fs.statSync(resultFile);
        console.log('✅ XFI_RESULT.json created successfully!');
        console.log(`📏 File size: ${Math.round(stats.size / 1024)}KB`);
        console.log(`🕐 Created: ${stats.mtime}`);
        
        // Check contents
        try {
          const content = fs.readFileSync(resultFile, 'utf8');
          const data = JSON.parse(content);
          console.log(`📋 Total issues: ${data.XFI_RESULT?.totalIssues || 'unknown'}`);
          console.log(`📁 Files analyzed: ${data.XFI_RESULT?.fileCount || 'unknown'}`);
        } catch (e) {
          console.log('⚠️  File exists but couldn\'t parse JSON:', e.message);
        }
      } else {
        console.log('❌ XFI_RESULT.json was NOT created');
        
        // List what files were created
        if (fs.existsSync(resultsDir)) {
          const files = fs.readdirSync(resultsDir);
          console.log('📂 Files in .xfiResults directory:');
          files.forEach(file => {
            const filePath = path.join(resultsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
          });
        } else {
          console.log('📂 .xfiResults directory does not exist');
        }
      }
      
      resolve(code === 0 && fs.existsSync(resultFile));
    });
    
    child.on('error', (error) => {
      console.error('❌ CLI execution error:', error);
      reject(error);
    });
  });
}

// Run the test
testVSCodeCLIExecution()
  .then(success => {
    console.log(`\n🎯 Test result: ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  }); 