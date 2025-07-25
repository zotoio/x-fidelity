#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

/**
 * Merge coverage reports from all packages into a single unified report
 */
async function mergeCoverage() {
  console.log('🔍 Searching for coverage files...');
  
  // Find all coverage files from packages
  const coverageFiles = glob.sync('packages/*/coverage/coverage-final.json');
  const nycOutputDirs = glob.sync('packages/*/.nyc_output');
  
  console.log(`📊 Found ${coverageFiles.length} coverage files`);
  console.log(`📁 Found ${nycOutputDirs.length} .nyc_output directories`);

  if (coverageFiles.length === 0 && nycOutputDirs.length === 0) {
    console.warn('⚠️  No coverage files found. Run tests with coverage first.');
    return;
  }

  // Create root coverage directories
  if (!fs.existsSync('.nyc_output')) {
    fs.mkdirSync('.nyc_output', { recursive: true });
  }
  if (!fs.existsSync('coverage')) {
    fs.mkdirSync('coverage', { recursive: true });
  }

  // Copy all .nyc_output files to root
  let fileCount = 0;
  for (const nycDir of nycOutputDirs) {
    const files = fs.readdirSync(nycDir);
    for (const file of files) {
      const sourcePath = path.join(nycDir, file);
      const destPath = path.join('.nyc_output', `${fileCount++}-${file}`);
      fs.copyFileSync(sourcePath, destPath);
    }
  }

  // Merge coverage-final.json files if they exist
  if (coverageFiles.length > 0) {
    const mergedCoverage = {};
    
    for (const file of coverageFiles) {
      const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.assign(mergedCoverage, coverage);
    }
    
    fs.writeFileSync(
      path.join('.nyc_output', 'coverage-final.json'),
      JSON.stringify(mergedCoverage, null, 2)
    );
  }

  console.log('✅ Coverage files merged successfully');
  
  // Generate reports
  console.log('📊 Generating unified coverage reports...');
  try {
    execSync('nyc report --reporter=html --reporter=text --reporter=lcov --reporter=json-summary', {
      stdio: 'inherit'
    });
    console.log('✅ Coverage reports generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate coverage reports:', error.message);
    process.exit(1);
  }
}

mergeCoverage().catch(console.error); 