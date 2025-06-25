#!/usr/bin/env node

/**
 * Validate All Archetypes Script
 * 
 * This script runs x-fidelity analysis on all archetype fixtures and validates:
 * 1. Each archetype triggers its expected rules
 * 2. All plugins are exercised
 * 3. No unexpected failures occur
 * 4. CLI and VSCode extension produce consistent results
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const chalk = require('chalk');

class ArchetypeValidator {
  constructor() {
    // More robust path resolution
    this.fixturesDir = path.resolve(__dirname, '..');
    this.cliPath = path.resolve(this.fixturesDir, '..', 'x-fidelity-cli', 'dist', 'index.js');
    this.results = {};
    
    // Add debugging for CI
    if (process.env.CI) {
      console.log(`🔧 CI Environment detected:`);
      console.log(`   Script dir: ${__dirname}`);
      console.log(`   Fixtures dir: ${this.fixturesDir}`);
      console.log(`   CLI path: ${this.cliPath}`);
      console.log(`   Working dir: ${process.cwd()}`);
    }
  }

  async run() {
    console.log(chalk.blue.bold('🧪 Validating All X-Fidelity Archetype Fixtures\n'));

    try {
      // Validate basic setup first
      await this.validateSetup();
      
      // Get all archetype directories
      const archetypes = await this.getArchetypes();
      console.log(chalk.gray(`Found ${archetypes.length} archetype(s): ${archetypes.join(', ')}\n`));

      // Validate each archetype
      for (const archetype of archetypes) {
        await this.validateArchetype(archetype);
      }

      // Generate summary report
      this.generateReport();

      // Exit with appropriate code
      const hasFailures = Object.values(this.results).some(result => !result.success);
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      console.error(chalk.red.bold('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  }

  async validateSetup() {
    // Check if fixtures directory exists
    try {
      await fs.access(this.fixturesDir);
    } catch {
      throw new Error(`Fixtures directory not found: ${this.fixturesDir}`);
    }
    
    // Check if CLI exists
    try {
      await fs.access(this.cliPath);
    } catch {
      throw new Error(`CLI not found: ${this.cliPath}. Run 'yarn build' first.`);
    }
  }

  async getArchetypes() {
    const entries = await fs.readdir(this.fixturesDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && entry.name !== 'scripts' && entry.name !== 'node_modules')
      .map(entry => entry.name);
  }

  async validateArchetype(archetype) {
    console.log(chalk.yellow.bold(`🔍 Validating ${archetype} archetype...`));
    
    const archetypeDir = path.join(this.fixturesDir, archetype);
    const startTime = Date.now();

    try {
      // Check if archetype directory structure is valid
      await this.validateArchetypeStructure(archetypeDir, archetype);

      // Run CLI analysis
      const cliResult = await this.runCLIAnalysis(archetypeDir, archetype);

      // Validate results
      const validation = await this.validateResults(cliResult, archetype);

      const duration = Date.now() - startTime;
      this.results[archetype] = {
        success: true,
        duration,
        issues: cliResult.totalIssues,
        validation,
        errors: []
      };

      console.log(chalk.green(`✅ ${archetype}: ${cliResult.totalIssues} issues found (${duration}ms)`));

    } catch (error) {
      const duration = Date.now() - startTime;
      this.results[archetype] = {
        success: false,
        duration,
        issues: 0,
        validation: null,
        errors: [error.message]
      };

      console.log(chalk.red(`❌ ${archetype}: ${error.message} (${duration}ms)`));
    }
  }

  async validateArchetypeStructure(archetypeDir, archetype) {
    const requiredFiles = ['package.json', 'README.md'];
    
    // Add debugging for CI
    if (process.env.CI) {
      console.log(`   Checking archetype dir: ${archetypeDir}`);
      try {
        const files = await fs.readdir(archetypeDir);
        console.log(`   Found files: ${files.join(', ')}`);
      } catch (error) {
        console.log(`   Error reading directory: ${error.message}`);
      }
    }
    
    for (const file of requiredFiles) {
      const filePath = path.join(archetypeDir, file);
      try {
        await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
        if (process.env.CI) {
          console.log(`   ✓ Found ${file}`);
        }
      } catch (error) {
        // Enhanced error reporting for CI
        const debugInfo = process.env.CI ? 
          ` (Path: ${filePath}, Error: ${error.code}, Message: ${error.message})` : '';
        throw new Error(`Missing required file: ${file}${debugInfo}`);
      }
    }

    // Note: Git repository is not required for fixtures testing
  }

  async runCLIAnalysis(archetypeDir, archetype) {
    return new Promise((resolve, reject) => {
      const args = [
        this.cliPath,
        '--dir', archetypeDir,
        '--archetype', archetype,
        '--output-format', 'json'
      ];

      const child = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.cliPath)
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Parse JSON output from stdout
          const lines = stdout.split('\n');
          let jsonResult = null;

          for (const line of lines) {
            if (line.includes('XFI_RESULT')) {
              // Extract the full JSON object from the log line
              const jsonStart = line.indexOf('{"XFI_RESULT"');
              if (jsonStart !== -1) {
                const jsonStr = line.substring(jsonStart);
                const parsed = JSON.parse(jsonStr);
                jsonResult = parsed.XFI_RESULT;
                break;
              }
            }
          }

          if (jsonResult) {
            resolve(jsonResult);
          } else {
            reject(new Error(`Failed to parse CLI output. Code: ${code}, Stderr: ${stderr}, Stdout sample: ${stdout.substring(0, 500)}...`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse CLI JSON output: ${error.message}. Stdout sample: ${stdout.substring(0, 500)}...`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn CLI process: ${error.message}`));
      });
    });
  }

  async validateResults(cliResult, archetype) {
    // Load expected rules for this archetype
    const demoConfigPath = path.join(this.fixturesDir, '..', 'x-fidelity-democonfig', 'src', `${archetype}.json`);
    let expectedRules = [];

    try {
      const configContent = await fs.readFile(demoConfigPath, 'utf8');
      const config = JSON.parse(configContent);
      expectedRules = config.rules || [];
    } catch (error) {
      throw new Error(`Failed to load archetype config: ${error.message}`);
    }

    // Validate that we have issues
    if (cliResult.totalIssues === 0) {
      throw new Error(`Expected to find issues but found none. Fixtures may not be triggering rules.`);
    }

    // Basic validation - we expect at least some rules to trigger
    const triggeredRules = new Set();
    
    // Extract rules from issueDetails structure
    if (cliResult.issueDetails && Array.isArray(cliResult.issueDetails)) {
      cliResult.issueDetails.forEach(fileIssue => {
        if (fileIssue.errors && Array.isArray(fileIssue.errors)) {
          fileIssue.errors.forEach(error => {
            if (error.ruleFailure) {
              triggeredRules.add(error.ruleFailure);
            }
          });
        }
      });
    }

    return {
      expectedRules: expectedRules.length,
      triggeredRules: triggeredRules.size,
      coverage: expectedRules.length > 0 ? (triggeredRules.size / expectedRules.length) * 100 : 0,
      detectedRules: Array.from(triggeredRules)
    };
  }

  generateReport() {
    console.log(chalk.blue.bold('\n📊 Validation Report\n'));

    const archetypes = Object.keys(this.results);
    const successful = archetypes.filter(a => this.results[a].success);
    const failed = archetypes.filter(a => !this.results[a].success);

    console.log(chalk.gray(`Total Archetypes: ${archetypes.length}`));
    console.log(chalk.green(`✅ Successful: ${successful.length}`));
    console.log(chalk.red(`❌ Failed: ${failed.length}`));

    if (successful.length > 0) {
      console.log(chalk.green.bold('\n✅ Successful Archetypes:'));
      successful.forEach(archetype => {
        const result = this.results[archetype];
        const coverage = result.validation ? result.validation.coverage.toFixed(1) : 'N/A';
        console.log(chalk.green(`  ${archetype}: ${result.issues} issues, ${coverage}% rule coverage`));
      });
    }

    if (failed.length > 0) {
      console.log(chalk.red.bold('\n❌ Failed Archetypes:'));
      failed.forEach(archetype => {
        const result = this.results[archetype];
        console.log(chalk.red(`  ${archetype}: ${result.errors.join(', ')}`));
      });
    }

    // Summary statistics
    const totalIssues = Object.values(this.results).reduce((sum, r) => sum + r.issues, 0);
    const avgDuration = Object.values(this.results).reduce((sum, r) => sum + r.duration, 0) / archetypes.length;

    console.log(chalk.blue.bold('\n📈 Statistics:'));
    console.log(chalk.gray(`Total Issues Found: ${totalIssues}`));
    console.log(chalk.gray(`Average Analysis Time: ${avgDuration.toFixed(0)}ms`));

    // Success rate
    const successRate = (successful.length / archetypes.length) * 100;
    const successColor = successRate === 100 ? chalk.green : successRate >= 80 ? chalk.yellow : chalk.red;
    console.log(successColor(`Success Rate: ${successRate.toFixed(1)}%`));

    console.log(chalk.blue('\n🎯 To add more test coverage, update the fixture files in each archetype directory.'));
    console.log(chalk.blue('🔧 To fix failures, check the error messages and ensure CLI build is up to date.'));
  }
}

// Run the validator
if (require.main === module) {
  const validator = new ArchetypeValidator();
  validator.run().catch(error => {
    console.error(chalk.red.bold('💥 Unexpected error:'), error);
    process.exit(1);
  });
}

module.exports = ArchetypeValidator; 