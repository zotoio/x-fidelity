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
  let mergedCoverage = {};
  if (coverageFiles.length > 0) {
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

  // Generate enhanced coverage summary for consolidated reporting
  if (Object.keys(mergedCoverage).length > 0) {
    console.log('📊 Generating enhanced coverage summary...');
    
    // Calculate totals
    let totalStatements = 0, coveredStatements = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalLines = 0, coveredLines = 0;
    
    for (const file of Object.values(mergedCoverage)) {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter(v => v > 0).length;
      }
      
      if (file.b) {
        totalBranches += Object.keys(file.b).length;
        coveredBranches += Object.values(file.b).filter(branches => 
          Array.isArray(branches) && branches.some(n => n > 0)
        ).length;
      }
      
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter(v => v > 0).length;
      }
      
      if (file.l) {
        totalLines += Object.keys(file.l).length;
        coveredLines += Object.values(file.l).filter(v => v > 0).length;
      }
    }
    
    const summary = {
      total: {
        statements: { 
          total: totalStatements,
          covered: coveredStatements,
          pct: totalStatements ? (coveredStatements / totalStatements * 100) : 0 
        },
        branches: { 
          total: totalBranches,
          covered: coveredBranches,
          pct: totalBranches ? (coveredBranches / totalBranches * 100) : 0 
        },
        functions: { 
          total: totalFunctions,
          covered: coveredFunctions,
          pct: totalFunctions ? (coveredFunctions / totalFunctions * 100) : 0 
        },
        lines: { 
          total: totalLines,
          covered: coveredLines,
          pct: totalLines ? (coveredLines / totalLines * 100) : 0 
        }
      }
    };
    
    fs.writeFileSync('coverage/coverage-summary.json', JSON.stringify(summary, null, 2));
    console.log('✅ Enhanced coverage summary generated');
  }
}

mergeCoverage().catch(console.error); 
