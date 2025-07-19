#!/usr/bin/env node

/**
 * VSIX Dependency Validation Script
 * 
 * This script validates that a packaged VSIX contains all necessary dependencies
 * and can detect issues like missing tree-sitter that would cause runtime failures.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

console.log('🔍 X-Fidelity VSIX Dependency Validation');

async function findVsixFile() {
  const files = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
  
  if (files.length === 0) {
    throw new Error('No VSIX file found. Run "yarn package" first.');
  }
  
  if (files.length > 1) {
    console.log(`⚠️  Multiple VSIX files found: ${files.join(', ')}`);
    console.log(`Using: ${files[0]}`);
  }
  
  return files[0];
}

async function extractVsix(vsixFile) {
  const extractDir = 'vsix-validation-temp';
  
  // Clean up any existing extraction
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(extractDir);
  
  try {
    execSync(`unzip -q "${vsixFile}" -d "${extractDir}"`, { stdio: 'inherit' });
    console.log(`✅ Extracted VSIX to ${extractDir}`);
    return extractDir;
  } catch (error) {
    throw new Error(`Failed to extract VSIX: ${error.message}`);
  }
}

function validateCriticalFiles(extractDir) {
  console.log('\n🔍 Validating critical files...');
  
  const criticalFiles = [
    'extension/package.json',
    'extension/dist/extension.js',
    'extension/dist/treeSitterWorker.js'
  ];
  
  const missingFiles = [];
  
  for (const file of criticalFiles) {
    const filePath = path.join(extractDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    } else {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing critical files: ${missingFiles.join(', ')}`);
  }
}

function validateTreeSitterDependencies(extractDir) {
  console.log('\n🔍 Validating Tree-sitter dependencies...');
  
  const extensionDir = path.join(extractDir, 'extension');
  
  // Check for tree-sitter in various possible locations
  const possibleTreeSitterPaths = [
    path.join(extensionDir, 'node_modules', 'tree-sitter'),
    path.join(extensionDir, 'dist', 'node_modules', 'tree-sitter'),
    path.join(extensionDir, 'node_modules', 'tree-sitter-javascript'),
    path.join(extensionDir, 'node_modules', 'tree-sitter-typescript')
  ];
  
  let foundTreeSitter = false;
  const foundPaths = [];
  
  for (const tsPath of possibleTreeSitterPaths) {
    if (fs.existsSync(tsPath)) {
      foundPaths.push(tsPath);
      foundTreeSitter = true;
    }
  }
  
  if (foundTreeSitter) {
    console.log('✅ Tree-sitter dependencies found:');
    foundPaths.forEach(p => console.log(`   - ${path.relative(extensionDir, p)}`));
  } else {
    console.log('❌ Tree-sitter dependencies NOT found');
    console.log('This will cause the AST plugin to fail with "Cannot find module \'tree-sitter\'" error');
    
    // List what's actually in node_modules
    const nodeModulesPath = path.join(extensionDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const nodeModulesContents = fs.readdirSync(nodeModulesPath);
      console.log(`Available node_modules: ${nodeModulesContents.join(', ')}`);
    } else {
      console.log('No node_modules directory found in extension');
    }
    
    // Check if it's in dist
    const distNodeModules = path.join(extensionDir, 'dist', 'node_modules');
    if (fs.existsSync(distNodeModules)) {
      const distContents = fs.readdirSync(distNodeModules);
      console.log(`Dist node_modules: ${distContents.join(', ')}`);
    }
    
    return false;
  }
  
  return true;
}

function validateEmbeddedCLI(extractDir) {
  console.log('\n🔍 Validating embedded CLI...');
  
  const extensionDir = path.join(extractDir, 'extension');
  const cliPaths = [
    path.join(extensionDir, 'dist', 'cli', 'index.js'),
    path.join(extensionDir, 'cli', 'index.js')
  ];
  
  let cliFound = false;
  
  for (const cliPath of cliPaths) {
    if (fs.existsSync(cliPath)) {
      const stats = fs.statSync(cliPath);
      console.log(`✅ Found CLI at ${path.relative(extensionDir, cliPath)} (${Math.round(stats.size / 1024)}KB)`);
      cliFound = true;
      
      // Check if demo config is also there
      const cliDir = path.dirname(cliPath);
      const demoConfigPath = path.join(cliDir, 'demoConfig');
      if (fs.existsSync(demoConfigPath)) {
        const configFiles = fs.readdirSync(demoConfigPath);
        console.log(`   CLI demo config: ${configFiles.length} files`);
      }
      break;
    }
  }
  
  if (!cliFound) {
    console.log('❌ Embedded CLI not found');
    console.log('Extension will fail to analyze code');
    return false;
  }
  
  return true;
}

function validateDemoConfig(extractDir) {
  console.log('\n🔍 Validating demo configuration...');
  
  const extensionDir = path.join(extractDir, 'extension');
  const demoConfigPaths = [
    path.join(extensionDir, 'dist', 'demoConfig'),
    path.join(extensionDir, 'demoConfig')
  ];
  
  let configFound = false;
  
  for (const configPath of demoConfigPaths) {
    if (fs.existsSync(configPath)) {
      const configFiles = fs.readdirSync(configPath);
      console.log(`✅ Found demo config at ${path.relative(extensionDir, configPath)}`);
      console.log(`   Config files: ${configFiles.length} (${configFiles.slice(0, 3).join(', ')}${configFiles.length > 3 ? '...' : ''})`);
      configFound = true;
      break;
    }
  }
  
  if (!configFound) {
    console.log('❌ Demo configuration not found');
    console.log('Extension may fail to configure analysis properly');
    return false;
  }
  
  return true;
}

function analyzePackageJson(extractDir) {
  console.log('\n🔍 Analyzing package.json dependencies...');
  
  const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log(`Extension: ${packageJson.name} v${packageJson.version}`);
  console.log(`Main: ${packageJson.main}`);
  
  // Check for tree-sitter dependencies
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const treeSitterDeps = Object.keys(allDeps).filter(dep => 
    dep.includes('tree-sitter')
  );
  
  if (treeSitterDeps.length > 0) {
    console.log(`✅ Tree-sitter dependencies in package.json: ${treeSitterDeps.join(', ')}`);
  } else {
    console.log('⚠️  No tree-sitter dependencies found in package.json');
  }
  
  // Check activation events
  const activationEvents = packageJson.activationEvents || [];
  console.log(`Activation events: ${activationEvents.length}`);
  
  return true;
}

function checkBundleContents(extractDir) {
  console.log('\n�� Checking bundle contents...');
  
  const extensionPath = path.join(extractDir, 'extension', 'dist', 'extension.js');
  
  if (fs.existsSync(extensionPath)) {
    const bundleContent = fs.readFileSync(extensionPath, 'utf8');
    
    // Check for tree-sitter references
    const hasTreeSitterRefs = bundleContent.includes('tree-sitter');
    const hasRequireTreeSitter = bundleContent.includes('require("tree-sitter")') || 
                                bundleContent.includes("require('tree-sitter')");
    
    console.log(`Bundle size: ${Math.round(bundleContent.length / 1024)}KB`);
    console.log(`Contains tree-sitter references: ${hasTreeSitterRefs}`);
    console.log(`Contains require('tree-sitter'): ${hasRequireTreeSitter}`);
    
    if (hasRequireTreeSitter) {
      console.log('⚠️  Bundle contains direct tree-sitter requires - may fail if not available');
    }
  }
  
  // Check worker bundle
  const workerPath = path.join(extractDir, 'extension', 'dist', 'treeSitterWorker.js');
  
  if (fs.existsSync(workerPath)) {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    const hasRequireTreeSitter = workerContent.includes('require("tree-sitter")') || 
                                workerContent.includes("require('tree-sitter')");
    
    console.log(`Worker bundle size: ${Math.round(workerContent.length / 1024)}KB`);
    console.log(`Worker contains require('tree-sitter'): ${hasRequireTreeSitter}`);
    
    if (hasRequireTreeSitter) {
      console.log('❌ Worker bundle contains tree-sitter requires but dependencies not bundled');
      console.log('   This WILL cause "Cannot find module \'tree-sitter\'" errors in VSIX');
      return false;
    }
  }
  
  return true;
}

function cleanup(extractDir) {
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up ${extractDir}`);
  }
}

async function validateVsix() {
  let extractDir = null;
  
  try {
    const vsixFile = await findVsixFile();
    console.log(`📦 Validating VSIX: ${vsixFile}`);
    
    extractDir = await extractVsix(vsixFile);
    
    // Run all validations
    const validations = [
      () => validateCriticalFiles(extractDir),
      () => validateTreeSitterDependencies(extractDir),
      () => validateEmbeddedCLI(extractDir),
      () => validateDemoConfig(extractDir),
      () => analyzePackageJson(extractDir),
      () => checkBundleContents(extractDir)
    ];
    
    const results = [];
    
    for (const validation of validations) {
      try {
        const result = validation();
        results.push(result);
      } catch (error) {
        console.error(`Validation failed: ${error.message}`);
        results.push(false);
      }
    }
    
    const allPassed = results.every(r => r !== false);
    
    console.log('\n📊 Validation Summary:');
    console.log(`✅ Critical files: ${results[0] ? 'PASS' : 'FAIL'}`);
    console.log(`${results[1] ? '✅' : '❌'} Tree-sitter deps: ${results[1] ? 'PASS' : 'FAIL'}`);
    console.log(`${results[2] ? '✅' : '❌'} Embedded CLI: ${results[2] ? 'PASS' : 'FAIL'}`);
    console.log(`${results[3] ? '✅' : '❌'} Demo config: ${results[3] ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Package.json: ${results[4] ? 'PASS' : 'FAIL'}`);
    console.log(`${results[5] ? '✅' : '❌'} Bundle contents: ${results[5] ? 'PASS' : 'FAIL'}`);
    
    if (!allPassed) {
      console.log('\n❌ VSIX validation FAILED');
      console.log('The packaged extension will have runtime errors when installed');
      process.exit(1);
    } else {
      console.log('\n✅ VSIX validation PASSED');
      console.log('The packaged extension should work correctly when installed');
    }
    
  } catch (error) {
    console.error(`\n❌ Validation failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (extractDir) {
      cleanup(extractDir);
    }
  }
}

// Run validation
validateVsix().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
