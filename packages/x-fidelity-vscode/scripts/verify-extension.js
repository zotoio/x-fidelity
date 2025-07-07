#!/usr/bin/env node

/**
 * X-Fidelity VSCode Extension Verification Script
 *
 * Comprehensive verification of all extension features following Microsoft's
 * official testing guidelines and industry best practices.
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

class ExtensionVerifier {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
    this.startTime = Date.now();
  }

  log(message, color = COLORS.WHITE) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  success(message) {
    this.results.passed++;
    this.results.total++;
    this.log(`✅ ${message}`, COLORS.GREEN);
  }

  fail(message) {
    this.results.failed++;
    this.results.total++;
    this.log(`❌ ${message}`, COLORS.RED);
  }

  warn(message) {
    this.results.warnings++;
    this.results.total++;
    this.log(`⚠️  ${message}`, COLORS.YELLOW);
  }

  info(message) {
    this.log(`ℹ️  ${message}`, COLORS.BLUE);
  }

  async verifyPackageJson() {
    this.log('\n📦 Verifying package.json configuration...', COLORS.BOLD);

    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check essential fields
      if (packageJson.name === 'x-fidelity-vscode') {
        this.success('Package name is correct');
      } else {
        this.fail('Package name is incorrect');
      }

      if (packageJson.main === './dist/extension.js') {
        this.success('Main entry point is correct');
      } else {
        this.fail('Main entry point is incorrect');
      }

      // Check commands
      const commands = packageJson.contributes?.commands || [];
      if (commands.length >= 24) {
        this.success(`Commands registered: ${commands.length}`);
      } else {
        this.fail(`Expected 24+ commands, found ${commands.length}`);
      }

      // Check activation events
      const activationEvents = packageJson.activationEvents || [];
      if (activationEvents.length > 0) {
        this.success(
          `Activation events configured: ${activationEvents.length}`
        );
      } else {
        this.fail('No activation events configured');
      }

      // Check view contributions
      const views = packageJson.contributes?.views || {};
      if (views.explorer && views.explorer.length > 0) {
        this.success('Tree view contribution found');
      } else {
        this.fail('Tree view contribution missing');
      }
    } catch (error) {
      this.fail(`Package.json verification failed: ${error.message}`);
    }
  }

  async verifyBuildOutput() {
    this.log('\n🔨 Verifying build output...', COLORS.BOLD);

    const distPath = path.join(__dirname, '..', 'dist');
    const extensionJs = path.join(distPath, 'extension.js');

    if (fs.existsSync(distPath)) {
      this.success('Dist directory exists');
    } else {
      this.fail('Dist directory missing');
      return;
    }

    if (fs.existsSync(extensionJs)) {
      this.success('Extension.js built successfully');

      // Check file size (should be reasonable)
      const stats = fs.statSync(extensionJs);
      if (stats.size > 1000 && stats.size < 10000000) {
        // 1KB to 10MB
        this.success(
          `Extension.js size is reasonable: ${Math.round(stats.size / 1024)}KB`
        );
      } else {
        this.warn(
          `Extension.js size unusual: ${Math.round(stats.size / 1024)}KB`
        );
      }
    } else {
      this.fail('Extension.js missing from build output');
    }

    // Check for source maps
    const mapFile = path.join(distPath, 'extension.js.map');
    if (fs.existsSync(mapFile)) {
      this.success('Source maps generated');
    } else {
      this.warn('Source maps not found (debugging may be limited)');
    }
  }

  async verifyTypeScriptCompilation() {
    this.log('\n📝 Verifying TypeScript compilation...', COLORS.BOLD);

    return new Promise(resolve => {
      // Use cross-platform npx command
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const tsc = spawn(npxCmd, ['tsc', '--noEmit'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      tsc.stdout.on('data', data => {
        output += data.toString();
      });

      tsc.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      tsc.on('close', code => {
        if (code === 0) {
          this.success('TypeScript compilation passed');
        } else {
          this.fail('TypeScript compilation errors found');
          if (errorOutput) {
            this.log(`   ${errorOutput}`, COLORS.RED);
          }
        }
        resolve();
      });
    });
  }

  async verifyTestSetup() {
    this.log('\n🧪 Verifying test setup...', COLORS.BOLD);

    const testDirs = [
      path.join(__dirname, '..', 'src', 'test'),
      path.join(__dirname, '..', 'src', 'test', 'suite'),
      path.join(__dirname, '..', 'src', 'test', 'integration')
    ];

    testDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.success(`Test directory exists: ${path.basename(dir)}`);
      } else {
        this.warn(`Test directory missing: ${path.basename(dir)}`);
      }
    });

    // Check for test configuration
    const jestConfig = path.join(__dirname, '..', 'jest.config.js');
    if (fs.existsSync(jestConfig)) {
      this.success('Jest configuration found');
    } else {
      this.warn('Jest configuration missing');
    }

    // Check for test runner
    const runTest = path.join(__dirname, '..', 'src', 'test', 'runTest.ts');
    if (fs.existsSync(runTest)) {
      this.success('Test runner found');
    } else {
      this.warn('Test runner missing');
    }
  }

  async runUnitTests() {
    this.log('\n🔬 Running unit tests...', COLORS.BOLD);

    return new Promise(resolve => {
      // Use cross-platform yarn command
      const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
      const testProcess = spawn(yarnCmd, ['test:unit'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', data => {
        output += data.toString();
      });

      testProcess.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      testProcess.on('close', code => {
        if (code === 0) {
          this.success('Unit tests passed');

          // Extract test results if possible
          const passMatch = output.match(/(\d+) passed/);
          if (passMatch) {
            this.info(`   Tests passed: ${passMatch[1]}`);
          }
        } else {
          this.fail('Unit tests failed');
          if (errorOutput) {
            this.log(`   ${errorOutput.slice(0, 500)}...`, COLORS.RED);
          }
        }
        resolve();
      });
    });
  }

  async verifyVSIXPackage() {
    this.log('\n📦 Verifying VSIX package...', COLORS.BOLD);

    const vsixFiles = fs
      .readdirSync(path.join(__dirname, '..'))
      .filter(file => file.endsWith('.vsix'));

    if (vsixFiles.length > 0) {
      this.success(`VSIX package found: ${vsixFiles[0]}`);

      // Check file size
      const vsixPath = path.join(__dirname, '..', vsixFiles[0]);
      const stats = fs.statSync(vsixPath);
      if (stats.size > 100000) {
        // > 100KB
        this.success(`VSIX package size: ${Math.round(stats.size / 1024)}KB`);
      } else {
        this.warn(
          `VSIX package seems small: ${Math.round(stats.size / 1024)}KB`
        );
      }
    } else {
      this.warn('No VSIX package found (run yarn package to create)');
    }
  }

  async verifyExtensionManifest() {
    this.log('\n📋 Verifying extension manifest completeness...', COLORS.BOLD);

    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check required metadata
      const requiredFields = [
        'name',
        'displayName',
        'description',
        'version',
        'publisher'
      ];
      requiredFields.forEach(field => {
        if (packageJson[field]) {
          this.success(`${field} is present`);
        } else {
          this.fail(`${field} is missing`);
        }
      });

      // Check engine compatibility
      if (packageJson.engines?.vscode) {
        this.success(
          `VSCode engine requirement: ${packageJson.engines.vscode}`
        );
      } else {
        this.fail('VSCode engine requirement missing');
      }

      // Check categories
      if (packageJson.categories && packageJson.categories.length > 0) {
        this.success(`Categories: ${packageJson.categories.join(', ')}`);
      } else {
        this.warn('No categories specified');
      }

      // Check repository info
      if (packageJson.repository) {
        this.success('Repository information present');
      } else {
        this.warn('Repository information missing');
      }
    } catch (error) {
      this.fail(`Manifest verification failed: ${error.message}`);
    }
  }

  async verifyExtensionCommands() {
    this.log('\n⚡ Verifying extension commands...', COLORS.BOLD);

    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      const commands = packageJson.contributes?.commands || [];
      const expectedCommands = [
        'xfidelity.test',
        'xfidelity.runAnalysis',
        'xfidelity.openSettings',
        'xfidelity.showControlCenter'
      ];

      expectedCommands.forEach(cmdId => {
        const found = commands.find(cmd => cmd.command === cmdId);
        if (found) {
          this.success(`Command registered: ${cmdId}`);
        } else {
          this.fail(`Command missing: ${cmdId}`);
        }
      });

      // Check for proper command structure
      commands.forEach(cmd => {
        if (cmd.command && cmd.title) {
          // Command structure is valid
        } else {
          this.fail(`Invalid command structure: ${JSON.stringify(cmd)}`);
        }
      });
    } catch (error) {
      this.fail(`Command verification failed: ${error.message}`);
    }
  }

  async verifyDependencies() {
    this.log('\n📚 Verifying dependencies...', COLORS.BOLD);

    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Check for essential dependencies
    const essentialDeps = [
      '@x-fidelity/core',
      '@x-fidelity/types',
      '@x-fidelity/plugins'
    ];

    essentialDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep]) {
        this.success(`Dependency present: ${dep}`);
      } else {
        this.fail(`Essential dependency missing: ${dep}`);
      }
    });

    // Check dev dependencies
    const essentialDevDeps = [
      '@types/vscode',
      '@vscode/test-electron',
      'typescript'
    ];

    essentialDevDeps.forEach(dep => {
      if (packageJson.devDependencies?.[dep]) {
        this.success(`Dev dependency present: ${dep}`);
      } else {
        this.fail(`Essential dev dependency missing: ${dep}`);
      }
    });

    // Check for node_modules
    const nodeModules = path.join(__dirname, '..', 'node_modules');
    if (fs.existsSync(nodeModules)) {
      this.success('Node modules installed');
    } else {
      this.fail('Node modules missing (run yarn install)');
    }
  }

  generateReport() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);

    this.log('\n' + '='.repeat(60), COLORS.BOLD);
    this.log('📊 VERIFICATION REPORT', COLORS.BOLD + COLORS.CYAN);
    this.log('='.repeat(60), COLORS.BOLD);

    this.log(`\n⏱️  Duration: ${duration}s`);
    this.log(`📈 Total Checks: ${this.results.total}`);
    this.success(`✅ Passed: ${this.results.passed}`);
    if (this.results.failed > 0) {
      this.fail(`❌ Failed: ${this.results.failed}`);
    }
    if (this.results.warnings > 0) {
      this.warn(`⚠️  Warnings: ${this.results.warnings}`);
    }

    const successRate = Math.round(
      (this.results.passed / this.results.total) * 100
    );
    this.log(`\n🎯 Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      this.log(
        '\n🎉 VERIFICATION PASSED! Extension is ready for use.',
        COLORS.GREEN + COLORS.BOLD
      );
      this.log(
        '\n💡 Quick Start: Press F5 in VSCode, then Ctrl+Shift+P → "X-Fidelity: Test Extension"',
        COLORS.CYAN
      );
    } else {
      this.log(
        '\n🔧 VERIFICATION FAILED! Please fix the issues above.',
        COLORS.RED + COLORS.BOLD
      );
    }

    this.log('\n' + '='.repeat(60), COLORS.BOLD);

    return this.results.failed === 0;
  }

  async run() {
    this.log(
      '🚀 X-Fidelity VSCode Extension Verification',
      COLORS.BOLD + COLORS.MAGENTA
    );
    this.log(
      "Following Microsoft's official testing guidelines\n",
      COLORS.CYAN
    );

    await this.verifyPackageJson();
    await this.verifyExtensionManifest();
    await this.verifyExtensionCommands();
    await this.verifyDependencies();
    await this.verifyBuildOutput();
    await this.verifyTypeScriptCompilation();
    await this.verifyTestSetup();
    await this.runUnitTests();
    await this.verifyVSIXPackage();

    return this.generateReport();
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new ExtensionVerifier();
  verifier
    .run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = ExtensionVerifier;
