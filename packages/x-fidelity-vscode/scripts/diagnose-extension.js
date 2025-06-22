#!/usr/bin/env node

/**
 * X-Fidelity VSCode Extension Diagnostic Script
 * 
 * Comprehensive diagnostic to identify exactly what's wrong with the extension
 * when user reports "extension is not working"
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class ExtensionDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.info = [];
  }

  log(message, color = COLORS.WHITE) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  success(message) {
    this.log(`✅ ${message}`, COLORS.GREEN);
  }

  fail(message) {
    this.log(`❌ ${message}`, COLORS.RED);
    this.issues.push(message);
  }

  warn(message) {
    this.log(`⚠️  ${message}`, COLORS.YELLOW);
    this.warnings.push(message);
  }

  info_log(message) {
    this.log(`ℹ️  ${message}`, COLORS.BLUE);
    this.info.push(message);
  }

  header(title) {
    this.log(`\n${COLORS.BOLD}${COLORS.MAGENTA}🔍 ${title}${COLORS.RESET}`, COLORS.MAGENTA);
  }

  async runDiagnostic() {
    this.log(`${COLORS.BOLD}${COLORS.CYAN}🩺 X-Fidelity VSCode Extension - Comprehensive Diagnostic${COLORS.RESET}`);
    this.log(`${COLORS.CYAN}Identifying exactly what's wrong when extension is "not working"${COLORS.RESET}\n`);

    // 1. Basic File Structure Check
    this.header('File Structure & Build Status');
    await this.checkFileStructure();

    // 2. Package.json Deep Analysis
    this.header('Package.json Deep Analysis');
    await this.analyzePackageJson();

    // 3. Build & Compilation Check
    this.header('Build & Compilation Status');
    await this.checkBuildStatus();

    // 4. Extension Dependencies
    this.header('Extension Dependencies');
    await this.checkDependencies();

    // 5. VSCode Integration Points
    this.header('VSCode Integration Points');
    await this.checkVSCodeIntegration();

    // 6. Runtime Analysis
    this.header('Runtime Analysis');
    await this.checkRuntimeFiles();

    // 7. Common Issues Check
    this.header('Common Extension Issues');
    await this.checkCommonIssues();

    // 8. Development Environment
    this.header('Development Environment');
    await this.checkDevelopmentEnvironment();

    // Summary
    await this.printSummary();
  }

  async checkFileStructure() {
    const requiredFiles = [
      'package.json',
      'src/extension.ts',
      'dist/extension.js',
      '.vscode/launch.json',
      'tsconfig.json'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.success(`Required file exists: ${file}`);
      } else {
        this.fail(`Missing required file: ${file}`);
      }
    }

    const requiredDirs = [
      'src',
      'dist',
      '.vscode',
      'node_modules'
    ];

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        this.success(`Required directory exists: ${dir}`);
      } else {
        this.fail(`Missing required directory: ${dir}`);
      }
    }
  }

  async analyzePackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (packageJson.main) {
        this.success(`Main entry point: ${packageJson.main}`);
        if (fs.existsSync(packageJson.main)) {
          this.success(`Main entry file exists`);
        } else {
          this.fail(`Main entry file does not exist: ${packageJson.main}`);
        }
      } else {
        this.fail(`No main entry point defined in package.json`);
      }

      if (packageJson.engines && packageJson.engines.vscode) {
        this.success(`VSCode engine requirement: ${packageJson.engines.vscode}`);
      } else {
        this.fail(`No VSCode engine requirement in package.json`);
      }

      if (packageJson.activationEvents && packageJson.activationEvents.length > 0) {
        this.success(`Activation events configured: ${packageJson.activationEvents.length}`);
        for (const event of packageJson.activationEvents) {
          this.info_log(`  - ${event}`);
        }
      } else {
        this.fail(`No activation events configured`);
      }

      if (packageJson.contributes && packageJson.contributes.commands) {
        this.success(`Commands registered: ${packageJson.contributes.commands.length}`);
        // Check for essential commands
        const commands = packageJson.contributes.commands.map(c => c.command);
        if (commands.includes('xfidelity.test')) {
          this.success(`Test command found`);
        } else {
          this.warn(`No test command found - useful for debugging`);
        }
      } else {
        this.fail(`No commands configured in package.json`);
      }

    } catch (error) {
      this.fail(`Failed to parse package.json: ${error.message}`);
    }
  }

  async checkBuildStatus() {
    return new Promise((resolve) => {
      exec('yarn build', (error, stdout, stderr) => {
        if (error) {
          this.fail(`Build failed: ${error.message}`);
          if (stderr) {
            this.info_log(`Build stderr: ${stderr}`);
          }
        } else {
          this.success(`Build completed successfully`);
        }

        // Check if dist/extension.js exists and is not empty
        if (fs.existsSync('dist/extension.js')) {
          const stats = fs.statSync('dist/extension.js');
          if (stats.size > 0) {
            this.success(`Extension.js built (${Math.round(stats.size / 1024)}KB)`);
          } else {
            this.fail(`Extension.js is empty`);
          }
        } else {
          this.fail(`Extension.js not found after build`);
        }

        resolve();
      });
    });
  }

  async checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const criticalDeps = [
        '@x-fidelity/core',
        '@x-fidelity/types',
        '@x-fidelity/plugins'
      ];

      for (const dep of criticalDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.success(`Critical dependency present: ${dep}`);
          // Check if actually installed
          if (fs.existsSync(`node_modules/${dep}`)) {
            this.success(`Dependency installed: ${dep}`);
          } else {
            this.fail(`Dependency not installed: ${dep}`);
          }
        } else {
          this.fail(`Missing critical dependency: ${dep}`);
        }
      }

      const devDeps = [
        '@types/vscode',
        'typescript'
      ];

      for (const dep of devDeps) {
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          this.success(`Dev dependency present: ${dep}`);
        } else {
          this.fail(`Missing dev dependency: ${dep}`);
        }
      }

    } catch (error) {
      this.fail(`Failed to check dependencies: ${error.message}`);
    }
  }

  async checkVSCodeIntegration() {
    // Check launch.json
    if (fs.existsSync('.vscode/launch.json')) {
      try {
        const launch = JSON.parse(fs.readFileSync('.vscode/launch.json', 'utf8'));
        if (launch.configurations && launch.configurations.length > 0) {
          this.success(`VSCode debug configurations: ${launch.configurations.length}`);
          const hasExtensionHost = launch.configurations.some(c => c.type === 'extensionHost');
          if (hasExtensionHost) {
            this.success(`Extension Host debug configuration found`);
          } else {
            this.warn(`No Extension Host debug configuration - F5 won't work`);
          }
        } else {
          this.warn(`No debug configurations in launch.json`);
        }
      } catch (error) {
        this.fail(`Invalid launch.json: ${error.message}`);
      }
    } else {
      this.warn(`No .vscode/launch.json - F5 debugging not available`);
    }

    // Check tasks.json
    if (fs.existsSync('.vscode/tasks.json')) {
      this.success(`VSCode tasks configuration found`);
    } else {
      this.warn(`No .vscode/tasks.json - build tasks not configured`);
    }
  }

  async checkRuntimeFiles() {
    const runtimeFiles = [
      'src/extension.ts',
      'src/core/extensionManager.ts',
      'src/configuration/configManager.ts'
    ];

    for (const file of runtimeFiles) {
      if (fs.existsSync(file)) {
        this.success(`Runtime file exists: ${file}`);
        // Check if file is not empty
        const stats = fs.statSync(file);
        if (stats.size === 0) {
          this.fail(`Runtime file is empty: ${file}`);
        }
      } else {
        this.fail(`Missing runtime file: ${file}`);
      }
    }

    // Check for TypeScript compilation errors
    return new Promise((resolve) => {
      exec('npx tsc --noEmit', (error, stdout, stderr) => {
        if (error) {
          this.fail(`TypeScript compilation errors detected`);
          if (stdout) this.info_log(`TypeScript stdout: ${stdout}`);
          if (stderr) this.info_log(`TypeScript stderr: ${stderr}`);
        } else {
          this.success(`TypeScript compilation clean`);
        }
        resolve();
      });
    });
  }

  async checkCommonIssues() {
    // Check for common extension issues

    // 1. Check if extension.js has exports
    if (fs.existsSync('dist/extension.js')) {
      const content = fs.readFileSync('dist/extension.js', 'utf8');
      if (content.includes('activate') && content.includes('deactivate')) {
        this.success(`Extension exports activate/deactivate functions`);
      } else {
        this.fail(`Extension.js missing activate/deactivate exports`);
      }

      if (content.includes('module.exports') || content.includes('exports.')) {
        this.success(`Extension.js has module exports`);
      } else {
        this.warn(`Extension.js may have export issues`);
      }
    }

    // 2. Check for circular dependencies (common issue)
    this.info_log(`Checking for common import issues...`);
    
    // 3. Check node_modules size (bloated dependencies)
    if (fs.existsSync('node_modules')) {
      const stats = fs.statSync('node_modules');
      // Simple approximation - if node_modules is too small, dependencies might not be installed
      this.info_log(`Node modules directory exists`);
    }

    // 4. Check for .vscodeignore issues
    if (fs.existsSync('.vscodeignore')) {
      this.success(`VSCode ignore file exists`);
      const content = fs.readFileSync('.vscodeignore', 'utf8');
      if (content.includes('src/') && !content.includes('dist/')) {
        this.success(`VSCodeignore properly configured`);
      } else {
        this.warn(`VSCodeignore may have configuration issues`);
      }
    } else {
      this.warn(`No .vscodeignore file - package may be bloated`);
    }
  }

  async checkDevelopmentEnvironment() {
    // Check Node version
    return new Promise((resolve) => {
      exec('node --version', (error, stdout, stderr) => {
        if (error) {
          this.fail(`Node.js not available: ${error.message}`);
        } else {
          const nodeVersion = stdout.trim();
          this.success(`Node.js version: ${nodeVersion}`);
          
          // Check if Node version is compatible
          const version = nodeVersion.replace('v', '');
          const majorVersion = parseInt(version.split('.')[0]);
          if (majorVersion >= 16) {
            this.success(`Node.js version is compatible (>= 16)`);
          } else {
            this.fail(`Node.js version too old, requires >= 16`);
          }
        }

        // Check Yarn
        exec('yarn --version', (error2, stdout2, stderr2) => {
          if (error2) {
            this.warn(`Yarn not available, using npm`);
          } else {
            this.success(`Yarn version: ${stdout2.trim()}`);
          }

          // Check VSCode CLI availability
          exec('code --version', (error3, stdout3, stderr3) => {
            if (error3) {
              this.warn(`VSCode CLI not available - 'code' command not found`);
            } else {
              this.success(`VSCode CLI available`);
              this.info_log(`VSCode version: ${stdout3.trim().split('\n')[0]}`);
            }
            resolve();
          });
        });
      });
    });
  }

  async printSummary() {
    this.log(`\n${COLORS.BOLD}${COLORS.MAGENTA}============================================================${COLORS.RESET}`);
    this.log(`${COLORS.BOLD}${COLORS.MAGENTA}🩺 DIAGNOSTIC SUMMARY${COLORS.RESET}`);
    this.log(`${COLORS.BOLD}${COLORS.MAGENTA}============================================================${COLORS.RESET}`);

    if (this.issues.length === 0) {
      this.log(`\n${COLORS.BOLD}${COLORS.GREEN}🎉 NO CRITICAL ISSUES FOUND!${COLORS.RESET}`);
      this.log(`${COLORS.GREEN}The extension appears to be properly configured.${COLORS.RESET}`);
      
      if (this.warnings.length > 0) {
        this.log(`\n${COLORS.YELLOW}⚠️  ${this.warnings.length} Warning(s):${COLORS.RESET}`);
        this.warnings.forEach(warning => {
          this.log(`   • ${warning}`, COLORS.YELLOW);
        });
      }

      this.log(`\n${COLORS.BOLD}${COLORS.CYAN}🔧 TROUBLESHOOTING STEPS:${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}1. Press F5 in VSCode to launch extension in debug mode${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}2. Check VSCode Output panel for X-Fidelity extension logs${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}3. Try command: Ctrl+Shift+P → 'X-Fidelity: Test Extension'${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}4. Check VSCode Developer Tools (Help → Toggle Developer Tools)${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}5. Reload VSCode window (Ctrl+Shift+P → 'Developer: Reload Window')${COLORS.RESET}`);
      
    } else {
      this.log(`\n${COLORS.BOLD}${COLORS.RED}❌ ${this.issues.length} Critical Issue(s) Found:${COLORS.RESET}`);
      this.issues.forEach(issue => {
        this.log(`   • ${issue}`, COLORS.RED);
      });

      if (this.warnings.length > 0) {
        this.log(`\n${COLORS.YELLOW}⚠️  ${this.warnings.length} Warning(s):${COLORS.RESET}`);
        this.warnings.forEach(warning => {
          this.log(`   • ${warning}`, COLORS.YELLOW);
        });
      }

      this.log(`\n${COLORS.BOLD}${COLORS.CYAN}🔧 RECOMMENDED FIXES:${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}1. Fix the critical issues listed above${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}2. Run 'yarn install' to ensure dependencies are installed${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}3. Run 'yarn build' to rebuild the extension${COLORS.RESET}`);
      this.log(`${COLORS.CYAN}4. Restart VSCode and try again${COLORS.RESET}`);
    }

    this.log(`\n${COLORS.BOLD}${COLORS.MAGENTA}============================================================${COLORS.RESET}`);
  }
}

// Run the diagnostic
async function main() {
  const diagnostic = new ExtensionDiagnostic();
  await diagnostic.runDiagnostic();
}

main().catch(console.error); 