#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Consolidated test runner with linting, autofixing, and unified Jest reporting
 */
class ConsolidatedTestRunner {
  constructor() {
    this.results = {
      linting: { passed: 0, failed: 0, total: 0 },
      tests: { passed: 0, failed: 0, skipped: 0, cached: 0, total: 0 },
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 },
      packages: {},
      totalTime: 0,
      cacheInfo: { hit: 0, miss: 0, total: 0 }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const now = new Date();
    
    // Format timestamp as local time (HH:MM format)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      cache: '💾'
    }[type] || '📋';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runLinting() {
    this.log('Starting linting and autofix across all packages...', 'info');
    
    try {
      // Run linting with autofix
      const lintOutput = execSync('turbo lint:fix --summarize=true', { 
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      this.log('Linting and autofix completed successfully', 'success');
      
      // Parse turbo output for cache information and package counts
      this.parseTurboOutput(lintOutput, 'lint');
      
    } catch (error) {
      this.log(`Linting had issues: ${error.message}`, 'warning');
      this.results.linting.failed++;
      
      // Parse output even on failure to get package counts
      if (error.stdout) {
        this.parseTurboOutput(error.stdout, 'lint');
      }
      
      // Continue with tests even if linting fails
      console.log('\n--- Linting Output ---');
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
      console.log('--- End Linting Output ---\n');
    }
  }

  async runTests() {
    this.log('Running comprehensive test suite...', 'info');
    
    try {
      // Run tests with coverage
      const testOutput = execSync('turbo test:coverage --summarize=true', { 
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      this.log('Test execution completed', 'success');
      
      // Parse turbo output for cache information
      this.parseTurboOutput(testOutput, 'test');
      
      // Collect Jest results from each package
      await this.collectJestResults();
      
      // Merge coverage reports
      await this.mergeCoverage();
      
    } catch (error) {
      this.log(`Some tests failed: ${error.message}`, 'warning');
      
      // Parse output even on failure
      if (error.stdout) {
        this.parseTurboOutput(error.stdout, 'test');
      }
      
      // Still try to collect results
      await this.collectJestResults();
      
      console.log('\n--- Test Output ---');
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
      console.log('--- End Test Output ---\n');
    }
  }

  parseTurboOutput(output, taskType) {
    // Parse turbo summary for cache hits/misses and totals
    const lines = output.split('\n');
    let inSummary = false;
    let taskCount = 0;
    
    for (const line of lines) {
      if (line.includes('Tasks:')) {
        inSummary = true;
        continue;
      }
      
      if (inSummary && line.includes('cached')) {
        const match = line.match(/(\d+)\s+cached/);
        if (match) {
          const cached = parseInt(match[1]);
          this.results.cacheInfo.hit += cached;
          taskCount += cached;
          this.log(`${cached} ${taskType} tasks used cache`, 'cache');
        }
      }
      
      if (inSummary && line.includes('successful')) {
        const match = line.match(/(\d+)\s+successful/);
        if (match) {
          const successful = parseInt(match[1]);
          const executed = successful - (this.results.cacheInfo.hit || 0);
          this.results.cacheInfo.miss += executed;
          taskCount += executed;
          
          if (taskType === 'lint') {
            this.results.linting.passed = successful;
            this.results.linting.total = successful;
          }
        }
      }
      
      if (inSummary && line.includes('total')) {
        const match = line.match(/(\d+)\s+total/);
        if (match) {
          taskCount = parseInt(match[1]);
        }
      }
    }
    
    this.results.cacheInfo.total += taskCount;
  }

  async collectJestResults() {
    this.log('Collecting Jest results from all packages...', 'info');
    
    // Find all Jest output files and coverage files
    const testResultFiles = glob.sync('packages/*/jest-results.json');
    const coverageFiles = glob.sync('packages/*/coverage/coverage-summary.json');
    
    // Define packages that should have tests
    const packages = [
      'x-fidelity-cli',
      'x-fidelity-core', 
      'x-fidelity-types',
      'x-fidelity-plugins',
      'x-fidelity-server',
      'x-fidelity-vscode'
    ];

    for (const pkg of packages) {
      const packagePath = `packages/${pkg}`;
      if (!fs.existsSync(packagePath)) continue;

      this.results.packages[pkg] = {
        tests: { passed: 0, failed: 0, skipped: 0, total: 0 },
        coverage: null,
        executed: false
      };

      // Try to find Jest results
      const jestResultPath = `${packagePath}/jest-results.json`;
      const coveragePath = `${packagePath}/coverage/coverage-summary.json`;
      
      if (fs.existsSync(jestResultPath)) {
        try {
          const jestResults = JSON.parse(fs.readFileSync(jestResultPath, 'utf8'));
          this.results.packages[pkg].tests = {
            passed: jestResults.numPassedTests || 0,
            failed: jestResults.numFailedTests || 0,
            skipped: jestResults.numPendingTests || 0,
            total: (jestResults.numPassedTests || 0) + (jestResults.numFailedTests || 0) + (jestResults.numPendingTests || 0)
          };
          this.results.packages[pkg].executed = true;
        } catch (error) {
          this.log(`Failed to parse Jest results for ${pkg}: ${error.message}`, 'warning');
        }
      } else {
        // Try to parse from console output if available - fallback method
        try {
          const packageJson = JSON.parse(fs.readFileSync(`${packagePath}/package.json`, 'utf8'));
          if (packageJson.scripts && packageJson.scripts.test) {
            // Package has tests but no results file - assume cached
            this.results.packages[pkg].executed = false;
          }
        } catch (error) {
          // Ignore packages without package.json
        }
      }

      if (fs.existsSync(coveragePath)) {
        try {
          const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          this.results.packages[pkg].coverage = coverage.total;
        } catch (error) {
          this.log(`Failed to parse coverage for ${pkg}: ${error.message}`, 'warning');
        }
      }
    }

    // Aggregate results and calculate totals
    for (const pkg of Object.keys(this.results.packages)) {
      const pkgResults = this.results.packages[pkg];
      this.results.tests.passed += pkgResults.tests.passed;
      this.results.tests.failed += pkgResults.tests.failed;
      this.results.tests.skipped += pkgResults.tests.skipped;
      
      if (!pkgResults.executed) {
        this.results.tests.cached++;
      }
    }
    
    // Calculate total tests
    this.results.tests.total = this.results.tests.passed + this.results.tests.failed + this.results.tests.skipped;
  }

  async mergeCoverage() {
    this.log('Merging coverage reports...', 'info');
    
    try {
      // Use existing merge script
      execSync('yarn coverage:merge', { stdio: 'inherit' });
      
      // Read merged coverage summary
      const coveragePath = 'coverage/coverage-summary.json';
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        if (coverage.total) {
          this.results.coverage = {
            statements: Math.round(coverage.total.statements.pct * 10) / 10,
            branches: Math.round(coverage.total.branches.pct * 10) / 10,
            functions: Math.round(coverage.total.functions.pct * 10) / 10,
            lines: Math.round(coverage.total.lines.pct * 10) / 10
          };
        }
      }
    } catch (error) {
      this.log(`Coverage merge failed: ${error.message}`, 'warning');
    }
  }

  generateMarkdownReport() {
    this.log('Generating markdown report...', 'info');
    
    const now = new Date();
    // Get timezone offset in minutes and convert to GMT offset format
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-'; // Note: getTimezoneOffset returns positive for behind UTC
    const offsetString = `GMT${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`;
    
    // Format as local date and time with GMT offset
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes} ${offsetString}`;
    
    const cacheRate = this.results.cacheInfo.hit + this.results.cacheInfo.miss > 0 
      ? ((this.results.cacheInfo.hit / (this.results.cacheInfo.hit + this.results.cacheInfo.miss)) * 100).toFixed(1)
      : 0;
    const overallStatus = this.results.tests.failed === 0 && this.results.linting.failed === 0 ? 'PASSED ✅' : 'FAILED ❌';
    
    let markdown = `# Consolidated Test Report

> **Generated:** ${timestamp}  
> **Duration:** ${this.results.totalTime.toFixed(2)}s  
> **Status:** ${overallStatus}

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Status** | ${overallStatus} |
| **Total Tests** | ${this.results.tests.total} |
| **Test Success Rate** | ${this.results.tests.total > 0 ? ((this.results.tests.passed / this.results.tests.total) * 100).toFixed(1) : 0}% |
| **Packages Tested** | ${Object.keys(this.results.packages).length} |
| **Cache Hit Rate** | ${cacheRate}% |
| **Total Execution Time** | ${this.results.totalTime.toFixed(2)}s |

## 🔧 Linting & Code Formatting

| Status | Count |
|--------|-------|
| ✅ **Passed** | ${this.results.linting.passed} packages |
| ❌ **Failed** | ${this.results.linting.failed} packages |
| 📊 **Total** | ${this.results.linting.total} packages |

## 🧪 Unit Test Results

| Metric | Count | Percentage |
|--------|-------|------------|
| ✅ **Passed** | ${this.results.tests.passed} | ${this.results.tests.total > 0 ? ((this.results.tests.passed / this.results.tests.total) * 100).toFixed(1) : 0}% |
| ❌ **Failed** | ${this.results.tests.failed} | ${this.results.tests.total > 0 ? ((this.results.tests.failed / this.results.tests.total) * 100).toFixed(1) : 0}% |
| ⏭️ **Skipped** | ${this.results.tests.skipped} | ${this.results.tests.total > 0 ? ((this.results.tests.skipped / this.results.tests.total) * 100).toFixed(1) : 0}% |
| 💾 **Cached Packages** | ${this.results.tests.cached} | - |
| 📊 **Total Tests** | ${this.results.tests.total} | 100% |

`;

    // Coverage Section
    if (this.results.coverage.statements > 0) {
      markdown += `## 📊 Code Coverage

| Coverage Type | Percentage |
|---------------|------------|
| 📝 **Statements** | ${this.results.coverage.statements}% |
| 🌿 **Branches** | ${this.results.coverage.branches}% |
| 🔧 **Functions** | ${this.results.coverage.functions}% |
| 📏 **Lines** | ${this.results.coverage.lines}% |

`;
    }

    // Cache Performance
    markdown += `## 💾 Turbo Cache Performance

| Metric | Value |
|--------|-------|
| 🎯 **Cache Hits** | ${this.results.cacheInfo.hit} tasks |
| 🔄 **Cache Misses** | ${this.results.cacheInfo.miss} tasks |
| 📊 **Total Tasks** | ${this.results.cacheInfo.hit + this.results.cacheInfo.miss} tasks |
| 📈 **Cache Hit Rate** | ${cacheRate}% |

## 📦 Package Details

| Package | Status | Passed | Failed | Skipped | Total | Coverage |
|---------|--------|--------|--------|---------|-------|----------|
`;

    // Package breakdown table
    for (const [pkg, results] of Object.entries(this.results.packages)) {
      const status = results.executed ? '🏃 Executed' : '💾 Cached';
      const coverage = results.coverage && results.coverage.statements 
        ? `${results.coverage.statements.pct.toFixed(1)}%` 
        : 'N/A';
      
      markdown += `| \`${pkg}\` | ${status} | ${results.tests.passed} | ${results.tests.failed} | ${results.tests.skipped} | ${results.tests.total} | ${coverage} |\n`;
    }

    // Additional Details
    markdown += `
## 📋 Additional Information

### Test Execution Summary
- **Total packages with tests:** ${Object.keys(this.results.packages).length}
- **Packages executed (not cached):** ${Object.values(this.results.packages).filter(p => p.executed).length}
- **Packages cached:** ${Object.values(this.results.packages).filter(p => !p.executed).length}

### Performance Metrics
- **Average time per package:** ${Object.keys(this.results.packages).length > 0 ? (this.results.totalTime / Object.keys(this.results.packages).length).toFixed(2) : 0}s
- **Cache efficiency:** ${cacheRate}% (higher is better)

### Status Indicators
- ✅ **Passed:** All tests successful
- ❌ **Failed:** One or more tests failed  
- ⏭️ **Skipped:** Tests were skipped/pending
- 🏃 **Executed:** Package tests were run
- 💾 **Cached:** Package tests used cached results

---

*Report generated by X-Fidelity Consolidated Test Runner*
`;

    // Write the markdown file
    const reportPath = path.join(process.cwd(), 'CONSOLIDATED-TEST-REPORT.md');
    try {
      fs.writeFileSync(reportPath, markdown, 'utf8');
      this.log(`Markdown report written to: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`Failed to write markdown report: ${error.message}`, 'error');
    }
  }

  printSummary() {
    this.results.totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONSOLIDATED TEST REPORT');
    console.log('='.repeat(80));
    
    // Linting Summary
    console.log('\n🔧 LINTING & CODE FORMATTING:');
    console.log(`   ✅ Passed: ${this.results.linting.passed} packages`);
    console.log(`   ❌ Failed: ${this.results.linting.failed} packages`);
    console.log(`   📊 Total: ${this.results.linting.total} packages`);
    
    // Test Summary
    console.log('\n🧪 UNIT TESTS:');
    console.log(`   ✅ Passed: ${this.results.tests.passed} tests`);
    console.log(`   ❌ Failed: ${this.results.tests.failed} tests`);
    console.log(`   ⏭️  Skipped: ${this.results.tests.skipped} tests`);
    console.log(`   💾 Cached: ${this.results.tests.cached} packages (assumed passing)`);
    console.log(`   📊 Total: ${this.results.tests.total} tests across ${Object.keys(this.results.packages).length} packages`);
    
    // Cache Summary  
    console.log('\n💾 TURBO CACHE PERFORMANCE:');
    console.log(`   🎯 Cache Hits: ${this.results.cacheInfo.hit} tasks`);
    console.log(`   🔄 Cache Misses: ${this.results.cacheInfo.miss} tasks`);
    console.log(`   📊 Total Tasks: ${this.results.cacheInfo.hit + this.results.cacheInfo.miss} tasks`);
    const cacheRate = this.results.cacheInfo.hit + this.results.cacheInfo.miss > 0 
      ? ((this.results.cacheInfo.hit / (this.results.cacheInfo.hit + this.results.cacheInfo.miss)) * 100).toFixed(1)
      : 0;
    console.log(`   📈 Cache Hit Rate: ${cacheRate}%`);
    
    // Coverage Summary
    if (this.results.coverage.statements > 0) {
      console.log('\n📊 CODE COVERAGE:');
      console.log(`   📝 Statements: ${this.results.coverage.statements}%`);
      console.log(`   🌿 Branches: ${this.results.coverage.branches}%`);
      console.log(`   🔧 Functions: ${this.results.coverage.functions}%`);
      console.log(`   📏 Lines: ${this.results.coverage.lines}%`);
    }
    
    // Package Breakdown
    console.log('\n📦 PACKAGE BREAKDOWN:');
    for (const [pkg, results] of Object.entries(this.results.packages)) {
      const status = results.executed ? '🏃 Executed' : '💾 Cached';
      const testSummary = `${results.tests.passed}P/${results.tests.failed}F/${results.tests.skipped}S (${results.tests.total} total)`;
      console.log(`   ${pkg.padEnd(20)} ${status.padEnd(12)} Tests: ${testSummary}`);
    }
    
    // Overall Summary with totals
    console.log('\n' + '='.repeat(80));
    const overallStatus = this.results.tests.failed === 0 && this.results.linting.failed === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`🎯 OVERALL STATUS: ${overallStatus}`);
    console.log(`📊 TOTAL SUMMARY: ${this.results.tests.total} tests (${this.results.tests.passed} passed, ${this.results.tests.failed} failed, ${this.results.tests.skipped} skipped)`);
    console.log(`📦 PACKAGES: ${Object.keys(this.results.packages).length} total (${this.results.linting.passed} lint passed, ${this.results.linting.failed} lint failed)`);
    console.log(`💾 CACHE: ${this.results.cacheInfo.hit + this.results.cacheInfo.miss} tasks (${cacheRate}% cached)`);
    console.log(`⏱️  Total Time: ${this.results.totalTime.toFixed(2)}s`);
    console.log('='.repeat(80));
    
    // Generate markdown report
    this.generateMarkdownReport();
    
    // Exit with appropriate code
    const exitCode = this.results.tests.failed > 0 || this.results.linting.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  }

  async run() {
    console.log('🚀 Starting Consolidated Test Suite\n');
    
    await this.runLinting();
    await this.runTests();
    this.printSummary();
  }
}

// Run the consolidated test suite
const runner = new ConsolidatedTestRunner();
runner.run().catch(console.error);
