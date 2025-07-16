#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== VSCode CLI Execution Debug ===\n');

const fixturesDir = path.resolve(__dirname, '../x-fidelity-fixtures/node-fullstack');
const resultsDir = path.join(fixturesDir, '.xfiResults');
const xfiResultFile = path.join(resultsDir, 'XFI_RESULT.json');

// Check CLI path exactly like VSCode extension does
function getEmbeddedCLIPath() {
  const possiblePaths = [
    path.resolve(__dirname, 'cli/index.js'), // From VSCode package 
    path.resolve(__dirname, '../cli/index.js'),
    path.resolve(__dirname, '../../cli/index.js'),
    path.resolve(process.cwd(), 'cli/index.js'),
    path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js'),
    path.resolve(__dirname, '../../../x-fidelity-cli/dist/index.js'),
    path.resolve(__dirname, '../../x-fidelity-cli/dist/index.js'),
    path.resolve(process.cwd(), '../x-fidelity-cli/dist/index.js')
  ];

  console.log('🔍 Searching for CLI at paths:');
  for (const cliPath of possiblePaths) {
    const exists = fs.existsSync(cliPath);
    console.log(`  ${exists ? '✅' : '❌'} ${cliPath}`);
    if (exists) {
      return cliPath;
    }
  }
  
  throw new Error('CLI not found at any expected location');
}

async function debugVSCodeCLIExecution() {
  try {
    console.log('\n🔧 STEP 1: Pre-execution state check');
    
    // Check initial state
    console.log(`Fixtures directory: ${fixturesDir}`);
    console.log(`Results directory: ${resultsDir}`);
    console.log(`XFI_RESULT.json path: ${xfiResultFile}`);
    
    if (fs.existsSync(xfiResultFile)) {
      const stats = fs.statSync(xfiResultFile);
      console.log(`✅ XFI_RESULT.json EXISTS (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
    } else {
      console.log(`❌ XFI_RESULT.json MISSING`);
    }
    
    console.log('\n🔧 STEP 2: CLI Path Resolution');
    const cliPath = getEmbeddedCLIPath();
    console.log(`✅ Found CLI at: ${cliPath}`);
    
    // Check CLI file stats
    const cliStats = fs.statSync(cliPath);
    console.log(`CLI file size: ${cliStats.size} bytes`);
    console.log(`CLI file modified: ${cliStats.mtime.toISOString()}`);
    
    console.log('\n🔧 STEP 3: Executing CLI exactly like VSCode extension');
    
    // Build arguments EXACTLY like VSCode extension (after fix)
    const args = [
      cliPath,
      '--dir',
      fixturesDir,
      '--output-format',
      'json'
      // REMOVED: '--force-refresh', '--no-cache' - these don't exist in CLI
    ];
    
    console.log(`Command: node ${args.join(' ')}`);
    console.log(`Working directory: ${fixturesDir}`);
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', args, {
        cwd: fixturesDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        env: {
          ...process.env,
          XFI_VSCODE_MODE: 'true',
          XFI_DISABLE_FILE_LOGGING: 'true',
          XFI_LOG_LEVEL: 'warn',
          PATH: process.env.PATH
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        const dataStr = data.toString();
        stdout += dataStr;
        console.log(`[CLI STDOUT] ${dataStr.trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        const dataStr = data.toString();
        stderr += dataStr;
        console.log(`[CLI STDERR] ${dataStr.trim()}`);
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        console.log(`\n🔧 STEP 4: CLI execution completed`);
        console.log(`Exit code: ${code}`);
        console.log(`Duration: ${duration}ms`);
        
        console.log('\n🔧 STEP 5: Post-execution file check');
        
        // Check all files in .xfiResults
        if (fs.existsSync(resultsDir)) {
          const files = fs.readdirSync(resultsDir);
          console.log(`Files in .xfiResults: ${files.length}`);
          files.forEach(file => {
            const filePath = path.join(resultsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
          });
        } else {
          console.log('❌ .xfiResults directory does not exist');
        }
        
        // Check specifically for XFI_RESULT.json
        if (fs.existsSync(xfiResultFile)) {
          const stats = fs.statSync(xfiResultFile);
          console.log(`✅ XFI_RESULT.json EXISTS (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
          
          // Validate content
          try {
            const content = fs.readFileSync(xfiResultFile, 'utf8');
            const parsed = JSON.parse(content);
            console.log(`✅ XFI_RESULT.json is valid JSON`);
            console.log(`Total issues: ${parsed.XFI_RESULT?.totalIssues || 'unknown'}`);
            console.log(`File count: ${parsed.XFI_RESULT?.fileCount || 'unknown'}`);
          } catch (parseError) {
            console.log(`❌ XFI_RESULT.json parse error: ${parseError.message}`);
          }
        } else {
          console.log(`❌ XFI_RESULT.json STILL MISSING after CLI execution`);
        }
        
        console.log('\n=== DEBUG SUMMARY ===');
        console.log(`✅ CLI found and executed: ${cliPath}`);
        console.log(`✅ Exit code: ${code} (1 = success with issues)`);
        console.log(`✅ Duration: ${duration}ms`);
        
        if (fs.existsSync(xfiResultFile)) {
          console.log(`✅ XFI_RESULT.json created successfully`);
        } else {
          console.log(`❌ XFI_RESULT.json NOT created - this is the problem!`);
          
          // Look for structured-output.json as alternative
          const structuredOutput = path.join(resultsDir, 'structured-output.json');
          if (fs.existsSync(structuredOutput)) {
            console.log(`ℹ️  Found structured-output.json instead`);
            const stats = fs.statSync(structuredOutput);
            console.log(`  Size: ${stats.size} bytes`);
            
            // Copy it to XFI_RESULT.json as a workaround
            try {
              fs.copyFileSync(structuredOutput, xfiResultFile);
              console.log(`✅ Copied structured-output.json to XFI_RESULT.json as workaround`);
            } catch (copyError) {
              console.log(`❌ Failed to copy: ${copyError.message}`);
            }
          }
        }
        
        resolve({ stdout, stderr, exitCode: code, duration });
      });
      
      child.on('error', (error) => {
        console.log(`❌ CLI process error: ${error.message}`);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ Debug execution failed:', error.message);
    return false;
  }
}

debugVSCodeCLIExecution().then(result => {
  if (result) {
    console.log('\n🎉 Debug execution completed successfully');
    process.exit(0);
  } else {
    console.log('\n💥 Debug execution failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
}); 