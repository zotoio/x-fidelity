#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

/**
 * Merge coverage reports from all packages into a single unified report
 * Works with Jest coverage outputs only
 */
async function mergeCoverage() {
  console.log('🔍 Searching for coverage files...');
  
  // Find all coverage files from packages
  const coverageFiles = glob.sync('packages/*/coverage/coverage-final.json');
  const lcovFiles = glob.sync('packages/*/coverage/lcov.info');
  
  console.log(`📊 Found ${coverageFiles.length} coverage-final.json files`);
  console.log(`📊 Found ${lcovFiles.length} lcov.info files`);

  if (coverageFiles.length === 0) {
    console.warn('⚠️  No coverage files found. Run tests with coverage first.');
    console.log('💡 Try running: yarn test:coverage');
    return;
  }

  // Create root coverage directory
  if (!fs.existsSync('coverage')) {
    fs.mkdirSync('coverage', { recursive: true });
  }

  // Merge coverage-final.json files
  let mergedCoverage = {};
  for (const file of coverageFiles) {
    console.log(`📄 Processing ${file}...`);
    const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(mergedCoverage, coverage);
  }
  
  // Write merged coverage
  const mergedCoveragePath = path.join('coverage', 'coverage-final.json');
  fs.writeFileSync(mergedCoveragePath, JSON.stringify(mergedCoverage, null, 2));
  console.log(`✅ Merged coverage written to ${mergedCoveragePath}`);

  // Merge lcov files if they exist
  if (lcovFiles.length > 0) {
    console.log('📄 Merging lcov files...');
    let mergedLcov = '';
    for (const file of lcovFiles) {
      const lcovContent = fs.readFileSync(file, 'utf8');
      mergedLcov += lcovContent + '\n';
    }
    
    const mergedLcovPath = path.join('coverage', 'lcov.info');
    fs.writeFileSync(mergedLcovPath, mergedLcov);
    console.log(`✅ Merged lcov written to ${mergedLcovPath}`);
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
      
      // Calculate lines coverage from statementMap
      if (file.statementMap) {
        const lineNumbers = new Set();
        Object.values(file.statementMap).forEach(statement => {
          if (statement.start && statement.start.line) {
            lineNumbers.add(statement.start.line);
          }
        });
        totalLines += lineNumbers.size;
        
        // Count covered lines based on statement coverage
        const coveredLineNumbers = new Set();
        Object.entries(file.s || {}).forEach(([statementId, hitCount]) => {
          if (hitCount > 0 && file.statementMap[statementId]) {
            const statement = file.statementMap[statementId];
            if (statement.start && statement.start.line) {
              coveredLineNumbers.add(statement.start.line);
            }
          }
        });
        coveredLines += coveredLineNumbers.size;
      }
    }
    
    const summary = {
      total: {
        statements: { 
          total: totalStatements,
          covered: coveredStatements,
          pct: totalStatements ? Math.round(coveredStatements / totalStatements * 100 * 100) / 100 : 0 
        },
        branches: { 
          total: totalBranches,
          covered: coveredBranches,
          pct: totalBranches ? Math.round(coveredBranches / totalBranches * 100 * 100) / 100 : 0 
        },
        functions: { 
          total: totalFunctions,
          covered: coveredFunctions,
          pct: totalFunctions ? Math.round(coveredFunctions / totalFunctions * 100 * 100) / 100 : 0 
        },
        lines: { 
          total: totalLines,
          covered: coveredLines,
          pct: totalLines ? Math.round(coveredLines / totalLines * 100 * 100) / 100 : 0 
        }
      }
    };
    
    const summaryPath = path.join('coverage', 'coverage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Enhanced coverage summary written to ${summaryPath}`);
    
    // Display summary
    console.log('\n📊 Coverage Summary:');
    console.log(`   Statements: ${summary.total.statements.covered}/${summary.total.statements.total} (${summary.total.statements.pct}%)`);
    console.log(`   Branches:   ${summary.total.branches.covered}/${summary.total.branches.total} (${summary.total.branches.pct}%)`);
    console.log(`   Functions:  ${summary.total.functions.covered}/${summary.total.functions.total} (${summary.total.functions.pct}%)`);
    console.log(`   Lines:      ${summary.total.lines.covered}/${summary.total.lines.total} (${summary.total.lines.pct}%)`);
  }

  console.log('✅ Coverage merge completed successfully');
}

mergeCoverage().catch(console.error); 
