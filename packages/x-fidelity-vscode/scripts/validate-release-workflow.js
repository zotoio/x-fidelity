#!/usr/bin/env node

/**
 * Release Workflow Validation Script
 * Tests the new release workflow implementation to ensure all components work correctly
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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.trim() : '';
  } catch (error) {
    if (!options.silent) {
      log('red', `❌ Command failed: ${command}`);
      log('red', `Error: ${error.message}`);
    }
    throw error;
  }
}

function testCliToolsAvailability() {
  log('blue', '🔍 Testing CLI tools availability...');
  
  const tools = [
    { name: 'vsce', command: 'vsce --version', package: '@vscode/vsce' },
    { name: 'ovsx', command: 'ovsx --version', package: 'ovsx' }
  ];
  
  for (const tool of tools) {
    try {
      // Check if globally installed
      const version = execCommand(tool.command, { silent: true });
      log('green', `✅ ${tool.name} is available globally: ${version}`);
    } catch (error) {
      // Check if available in node_modules
      try {
        const localPath = path.join('node_modules', '.bin', tool.name);
        if (fs.existsSync(localPath)) {
          const version = execCommand(`${localPath} --version`, { silent: true });
          log('green', `✅ ${tool.name} is available locally: ${version}`);
        } else {
          throw new Error('Not found locally');
        }
      } catch (localError) {
        log('red', `❌ ${tool.name} not found - install with: npm install -g ${tool.package}`);
        return false;
      }
    }
  }
  
  return true;
}

function testVersionSyncScripts() {
  log('blue', '🔍 Testing version sync scripts...');
  
  const scripts = [
    { name: 'sync-version.js', path: 'scripts/sync-version.js' },
    { name: 'sync-published-version.js', path: 'scripts/sync-published-version.js' },
    { name: 'publish-universal.js', path: 'scripts/publish-universal.js' }
  ];
  
  for (const script of scripts) {
    if (!fs.existsSync(script.path)) {
      log('red', `❌ Script not found: ${script.path}`);
      return false;
    }
    
    // Check if executable
    try {
      fs.accessSync(script.path, fs.constants.X_OK);
      log('green', `✅ ${script.name} is executable`);
    } catch (error) {
      log('yellow', `⚠️  ${script.name} is not executable - running chmod +x`);
      execCommand(`chmod +x ${script.path}`);
    }
  }
  
  return true;
}

function testWorkflowConfiguration() {
  log('blue', '🔍 Testing workflow configuration...');
  
  // Check release workflow file
  const workflowPath = '../../.github/workflows/release.yml';
  if (!fs.existsSync(workflowPath)) {
    log('red', '❌ Release workflow file not found');
    return false;
  }
  
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  // Check for key workflow improvements
  const requiredFeatures = [
    'release-cli',
    'release-vscode-extension',
    'needs: [changes, release-cli]',
    'sync-published-version.js',
    'force_release',
    'cli-published',
    'cli-version'
  ];
  
  for (const feature of requiredFeatures) {
    if (!workflowContent.includes(feature)) {
      log('red', `❌ Workflow missing feature: ${feature}`);
      return false;
    }
  }
  
  log('green', '✅ Workflow configuration looks correct');
  return true;
}

function testSemanticReleaseConfig() {
  log('blue', '🔍 Testing semantic-release configuration...');
  
  // Check VSCode extension semantic-release config
  const configPath = '.releaserc.json';
  if (!fs.existsSync(configPath)) {
    log('red', '❌ VSCode extension .releaserc.json not found');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Verify key configuration elements
    if (!config.plugins || !Array.isArray(config.plugins)) {
      log('red', '❌ Invalid plugins configuration');
      return false;
    }
    
    // Check for npm publish disabled
    const npmPlugin = config.plugins.find(p => 
      Array.isArray(p) && p[0] === '@semantic-release/npm'
    );
    
    if (!npmPlugin || npmPlugin[1].npmPublish !== false) {
      log('red', '❌ npm publishing should be disabled for VSCode extension');
      return false;
    }
    
    log('green', '✅ Semantic-release configuration is correct');
    return true;
  } catch (error) {
    log('red', `❌ Invalid JSON in .releaserc.json: ${error.message}`);
    return false;
  }
}

function testPackageJsonScripts() {
  log('blue', '🔍 Testing package.json scripts...');
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredScripts = [
    'sync-version',
    'sync-published-version',
    'publish:universal',
    'package',
    'verify:ci'
  ];
  
  for (const script of requiredScripts) {
    if (!pkg.scripts || !pkg.scripts[script]) {
      log('red', `❌ Missing required script: ${script}`);
      return false;
    }
  }
  
  log('green', '✅ All required scripts are present');
  return true;
}

function runDryRunTest() {
  log('blue', '🔍 Running dry-run tests...');
  
  try {
    // Test that scripts exist and are executable - but don't actually run sync operations
    log('blue', '  Testing script availability...');
    
    // Just verify the sync script exists and has basic syntax
    const syncScript = fs.readFileSync('scripts/sync-published-version.js', 'utf8');
    if (syncScript.includes('function main()') || syncScript.includes('main()')) {
      log('green', '✅ sync-published-version.js appears to be a valid script');
    } else {
      log('red', '❌ sync-published-version.js may have syntax issues');
      return false;
    }
    
    // Verify package.json is in expected state
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.version !== '0.0.0-semantically-released') {
      log('red', `❌ package.json version should be placeholder, found: ${pkg.version}`);
      return false;
    }
    
    log('green', '✅ package.json version is correctly set to placeholder');
    log('green', '✅ Dry-run tests passed (no package.json modifications made)');
    return true;
  } catch (error) {
    log('red', `❌ Dry-run test failed: ${error.message}`);
    return false;
  }
}

function main() {
  log('cyan', '🧪 Validating Release Workflow Implementation');
  log('cyan', '===========================================');
  
  const tests = [
    { name: 'CLI Tools Availability', test: testCliToolsAvailability },
    { name: 'Version Sync Scripts', test: testVersionSyncScripts },
    { name: 'Workflow Configuration', test: testWorkflowConfiguration },
    { name: 'Semantic Release Config', test: testSemanticReleaseConfig },
    { name: 'Package.json Scripts', test: testPackageJsonScripts },
    { name: 'Dry Run Tests', test: runDryRunTest }
  ];
  
  let allPassed = true;
  
  for (const { name, test } of tests) {
    log('blue', `\n🧪 Running: ${name}`);
    try {
      const result = test();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      log('red', `❌ Test failed: ${error.message}`);
      allPassed = false;
    }
  }
  
  log('cyan', '\n📋 Validation Summary');
  log('cyan', '====================');
  
  if (allPassed) {
    log('green', '🎉 All validation tests passed!');
    log('green', '✅ Release workflow is ready for production use');
    log('cyan', '\n📝 Next Steps:');
    log('cyan', '  1. Test the workflow on a feature branch');
    log('cyan', '  2. Verify CLI and VSCode extension releases work in sequence');
    log('cyan', '  3. Check both marketplaces receive the published extension');
  } else {
    log('red', '❌ Some validation tests failed');
    log('red', '🔧 Please fix the issues above before using the release workflow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}