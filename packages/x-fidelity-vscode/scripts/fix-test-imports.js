#!/usr/bin/env node

/**
 * Post-compilation script to fix workspace import paths in test files
 * Transforms require('@x-fidelity/core') to require('../../x-fidelity-core/dist/index')
 * This ensures tests work in CI environments where workspace symlinks may not be properly established
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const testDir = path.join(__dirname, '..', 'out', 'test');

// Mapping of workspace imports to relative paths
// Note: Different test directories have different depths, so we need multiple mappings
const baseMappings = {
  "@x-fidelity/core": "x-fidelity-core/dist/index.js",
  "@x-fidelity/types": "x-fidelity-types/dist/index.js", 
  "@x-fidelity/plugins": "x-fidelity-plugins/dist/index.js"
};

// Generate mappings for different directory depths
const importMappings = {};
for (let levels = 4; levels <= 8; levels++) {
  const prefix = '../'.repeat(levels);
  for (const [pkg, relativePath] of Object.entries(baseMappings)) {
    importMappings[`${pkg}_${levels}`] = prefix + relativePath;
  }
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Calculate relative path depth from this file to packages directory
    // Count directory levels from the file to the package root
    const relativePath = path.relative(testDir, filePath);
    const pathParts = relativePath.split(path.sep);
    // Remove the filename from the count, add 3 for out/test/vscode-package to packages
    const levelsUp = pathParts.length - 1 + 3;

    // Transform require statements for each workspace package
    for (const [pkg, relativePath] of Object.entries(baseMappings)) {
      const correctPath = '../'.repeat(levelsUp) + relativePath;
      const requirePattern = new RegExp(`require\\("${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\)`, 'g');
      
      if (requirePattern.test(content)) {
        content = content.replace(requirePattern, `require("${correctPath}")`);
        changed = true;
        console.log(`  ✅ Fixed import in ${path.relative(testDir, filePath)}: ${pkg} -> ${correctPath}`);
      }
    }

    // Write back if changed
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return changed;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing workspace imports in compiled test files...');

  if (!fs.existsSync(testDir)) {
    console.log('⚠️ Test directory not found, skipping import fixes');
    return;
  }

  // Find all .js files in the test output directory
  const jsFiles = glob.sync(path.join(testDir, '**', '*.js'));
  
  if (jsFiles.length === 0) {
    console.log('⚠️ No JavaScript test files found');
    return;
  }

  console.log(`📁 Found ${jsFiles.length} test files to process`);

  let totalFixed = 0;
  for (const file of jsFiles) {
    if (fixImportsInFile(file)) {
      totalFixed++;
    }
  }

  if (totalFixed > 0) {
    console.log(`✅ Fixed workspace imports in ${totalFixed} test files`);
  } else {
    console.log('✅ No workspace imports found to fix');
  }

  console.log('🎯 Import fixing completed successfully');
}

if (require.main === module) {
  main();
}

module.exports = { fixImportsInFile, baseMappings };
