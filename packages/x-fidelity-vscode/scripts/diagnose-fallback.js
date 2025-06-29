#!/usr/bin/env node

/**
 * X-Fidelity VSCode Extension Fallback Mode Diagnostic Tool
 * 
 * This script helps identify why the extension might be operating in fallback mode.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 X-Fidelity VSCode Extension Diagnostics\n');

// Check 1: Environment Variables
console.log('1️⃣  Checking Environment Variables:');
const fallbackEnv = process.env.XFIDELITY_FALLBACK_MODE;
if (fallbackEnv !== undefined) {
  console.log(`   ⚠️  XFIDELITY_FALLBACK_MODE is set to: "${fallbackEnv}"`);
  if (fallbackEnv.toLowerCase() === 'true') {
    console.log('   🚨 ISSUE: Extension is forced into fallback mode by environment variable!');
    console.log('   💡 FIX: Run: unset XFIDELITY_FALLBACK_MODE');
  }
} else {
  console.log('   ✅ XFIDELITY_FALLBACK_MODE not set (good)');
}

// Check 2: Extension Build Status
console.log('\n2️⃣  Checking Extension Build:');
const distPath = path.resolve(__dirname, '../dist');
const extensionJs = path.join(distPath, 'extension.js');
const wasmFiles = [
  'tree-sitter.wasm',
  'tree-sitter-javascript.wasm', 
  'tree-sitter-typescript.wasm'
];

if (!fs.existsSync(distPath)) {
  console.log('   🚨 ISSUE: dist/ directory missing!');
  console.log('   💡 FIX: Run: yarn build');
} else {
  console.log('   ✅ dist/ directory exists');
  
  if (!fs.existsSync(extensionJs)) {
    console.log('   🚨 ISSUE: extension.js missing!');
    console.log('   💡 FIX: Run: yarn build');
  } else {
    console.log('   ✅ extension.js exists');
  }
  
  wasmFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      console.log(`   🚨 ISSUE: ${file} missing!`);
      console.log('   💡 FIX: Run: yarn build');
    } else {
      console.log(`   ✅ ${file} exists`);
    }
  });
}

// Check 3: Plugin Bundle Status
console.log('\n3️⃣  Checking Plugin Bundle:');
const pluginsPath = path.join(distPath, 'plugins');
if (!fs.existsSync(pluginsPath)) {
  console.log('   🚨 ISSUE: plugins/ directory missing!');
  console.log('   💡 FIX: Run: yarn build');
} else {
  console.log('   ✅ plugins/ directory exists');
}

// Check 4: CLI Bundle Status
console.log('\n4️⃣  Checking CLI Bundle:');
const cliPath = path.join(distPath, 'cli');
const cliIndexPath = path.join(cliPath, 'index.js');
if (!fs.existsSync(cliPath)) {
  console.log('   🚨 ISSUE: cli/ directory missing!');
  console.log('   💡 FIX: Run: yarn build');
} else if (!fs.existsSync(cliIndexPath)) {
  console.log('   🚨 ISSUE: cli/index.js missing!');
  console.log('   💡 FIX: Run: yarn build');
} else {
  console.log('   ✅ CLI bundle exists');
}

// Check 5: VSCode Settings
console.log('\n5️⃣  VSCode Settings Check:');
console.log('   📝 Manual Check Required:');
console.log('   1. Open VSCode Settings (Ctrl+,)');
console.log('   2. Search for: xfidelity.forceFallbackMode');
console.log('   3. Ensure it\'s set to: false');

// Check 6: Extension Manifest
console.log('\n6️⃣  Checking Extension Manifest:');
const manifestPath = path.join(distPath, 'xfidelity-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.log('   ⚠️  Manifest file missing (not critical)');
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('   ✅ Extension manifest:');
    console.log(`      CLI bundled: ${manifest.components?.cli ? '✅' : '❌'}`);
    console.log(`      Plugins bundled: ${manifest.components?.plugins ? '✅' : '❌'}`);
    console.log(`      WASM files: ${manifest.components?.wasm?.treeSitter ? '✅' : '❌'}`);
  } catch (error) {
    console.log('   ⚠️  Could not parse manifest file');
  }
}

console.log('\n🎯 Debugging Steps:');
console.log('1. If any issues found above, run: yarn build');
console.log('2. Open VSCode with extension: F5 (or Extension Development Host)');
console.log('3. Run command: "X-Fidelity: Test Extension"');
console.log('4. Check output: "X-Fidelity: Show Output"');
console.log('5. Look for error messages in the logs');

console.log('\n📋 Common Fallback Triggers:');
console.log('- WASM Tree-sitter initialization failure');
console.log('- Plugin loading errors');
console.log('- Missing workspace folder');
console.log('- Configuration manager errors');
console.log('- Network issues (if using remote config)');

console.log('\n💡 Quick Fixes:');
console.log('- Restart VSCode');
console.log('- Reload window (Ctrl+Shift+P > "Developer: Reload Window")');
console.log('- Clear extension host cache');
console.log('- Check VSCode Developer Tools (Help > Toggle Developer Tools)');

console.log('\n✅ Diagnostic Complete!\n'); 