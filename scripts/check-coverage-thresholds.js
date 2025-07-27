#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCoverageThresholds } = require('../coverage-thresholds.config');

/**
 * Check coverage thresholds against merged coverage data
 */
function checkCoverageThresholds() {
  console.log('🔍 Checking coverage thresholds...');
  
  // Check if merged coverage exists
  const coveragePath = path.join('coverage', 'coverage-final.json');
  const summaryPath = path.join('coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ No merged coverage data found. Run yarn coverage:merge first.');
    process.exit(1);
  }

  if (!fs.existsSync(summaryPath)) {
    console.error('❌ No coverage summary found. Run yarn coverage:merge first.');
    process.exit(1);
  }

  // Load coverage summary
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const totalCoverage = summary.total;

  // Get thresholds
  const thresholds = createCoverageThresholds();
  const globalThresholds = thresholds.global;

  console.log('\n📊 Coverage Report:');
  console.log(`   Statements: ${totalCoverage.statements.covered}/${totalCoverage.statements.total} (${totalCoverage.statements.pct}%)`);
  console.log(`   Branches:   ${totalCoverage.branches.covered}/${totalCoverage.branches.total} (${totalCoverage.branches.pct}%)`);
  console.log(`   Functions:  ${totalCoverage.functions.covered}/${totalCoverage.functions.total} (${totalCoverage.functions.pct}%)`);
  console.log(`   Lines:      ${totalCoverage.lines.covered}/${totalCoverage.lines.total} (${totalCoverage.lines.pct}%)`);

  console.log('\n🎯 Threshold Check:');
  
  let failed = false;
  const checks = [
    { name: 'Statements', actual: totalCoverage.statements.pct, threshold: globalThresholds.statements },
    { name: 'Branches', actual: totalCoverage.branches.pct, threshold: globalThresholds.branches },
    { name: 'Functions', actual: totalCoverage.functions.pct, threshold: globalThresholds.functions },
    { name: 'Lines', actual: totalCoverage.lines.pct, threshold: globalThresholds.lines }
  ];

  checks.forEach(check => {
    const status = check.actual >= check.threshold ? '✅' : '❌';
    const message = `   ${status} ${check.name}: ${check.actual}% (threshold: ${check.threshold}%)`;
    
    console.log(message);
    
    if (check.actual < check.threshold) {
      failed = true;
    }
  });

  if (failed) {
    console.log('\n❌ Coverage thresholds not met!');
    console.log('💡 Run yarn test:coverage to improve coverage, or adjust thresholds in coverage-thresholds.config.js');
    process.exit(1);
  } else {
    console.log('\n✅ All coverage thresholds met!');
  }
}

checkCoverageThresholds(); 