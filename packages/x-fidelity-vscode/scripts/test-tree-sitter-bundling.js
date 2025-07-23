#!/usr/bin/env node

/**
 * Test Tree-sitter Bundling Script
 * 
 * This script tests if tree-sitter dependencies are properly bundled
 * in the treeSitterWorker.js file to prevent VSIX runtime errors.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Tree-sitter Bundling...');

const workerPath = path.join(__dirname, '..', 'dist', 'treeSitterWorker.js');

if (!fs.existsSync(workerPath)) {
  console.error('❌ treeSitterWorker.js not found. Run "yarn build" first.');
  process.exit(1);
}

const workerContent = fs.readFileSync(workerPath, 'utf8');
const workerSizeKB = Math.round(workerContent.length / 1024);

console.log(`📦 Worker bundle size: ${workerSizeKB}KB`);

// Check for problematic external requires
const hasExternalTreeSitter = workerContent.includes('require("tree-sitter")') || 
                              workerContent.includes("require('tree-sitter')");

const hasExternalJavaScript = workerContent.includes('require("tree-sitter-javascript")') || 
                             workerContent.includes("require('tree-sitter-javascript')");

const hasExternalTypeScript = workerContent.includes('require("tree-sitter-typescript")') || 
                             workerContent.includes("require('tree-sitter-typescript')");

// Check for bundled tree-sitter code (should contain tree-sitter implementation)
const hasBundledTreeSitter = workerContent.includes('Parser') && 
                            workerContent.includes('Language') &&
                            workerContent.length > 50000; // Bundled version should be substantial

console.log('\n📊 Bundling Analysis:');
console.log(`${hasExternalTreeSitter ? '❌' : '✅'} External tree-sitter requires: ${hasExternalTreeSitter ? 'FOUND (BAD)' : 'NOT FOUND (GOOD)'}`);
console.log(`${hasExternalJavaScript ? '❌' : '✅'} External JavaScript grammar requires: ${hasExternalJavaScript ? 'FOUND (BAD)' : 'NOT FOUND (GOOD)'}`);
console.log(`${hasExternalTypeScript ? '❌' : '✅'} External TypeScript grammar requires: ${hasExternalTypeScript ? 'FOUND (BAD)' : 'NOT FOUND (GOOD)'}`);
console.log(`${hasBundledTreeSitter ? '✅' : '❌'} Bundled tree-sitter code: ${hasBundledTreeSitter ? 'FOUND (GOOD)' : 'NOT FOUND (BAD)'}`);

const hasAnyExternalRequires = hasExternalTreeSitter || hasExternalJavaScript || hasExternalTypeScript;

if (hasAnyExternalRequires) {
  console.log('\n❌ BUNDLING FAILED');
  console.log('The worker still contains external requires that will fail in VSIX installations');
  console.log('This will cause "Cannot find module" errors when the extension is packaged');
  
  // Show sample of problematic code
  const lines = workerContent.split('\n');
  const problematicLines = lines.filter(line => 
    line.includes('require("tree-sitter') || line.includes("require('tree-sitter")
  );
  
  if (problematicLines.length > 0) {
    console.log('\nProblematic code samples:');
    problematicLines.slice(0, 3).forEach((line, i) => {
      console.log(`  ${i + 1}. ${line.trim()}`);
    });
  }
  
  process.exit(1);
} else if (!hasBundledTreeSitter) {
  console.log('\n⚠️  WARNING: Tree-sitter code may not be properly bundled');
  console.log('Bundle size seems too small for a complete tree-sitter implementation');
  process.exit(1);
} else {
  console.log('\n✅ BUNDLING SUCCESSFUL');
  console.log('Tree-sitter dependencies are properly bundled and should work in VSIX installations');
}
