import { Base, reporters } from 'mocha';

/**
 * Custom test progress reporter that shows individual test results
 * while respecting console suppression for test content
 */
export class TestProgressReporter extends Base {
  private testCount = 0;
  private passCount = 0;
  private failCount = 0;
  private pendingCount = 0;
  private startTime = Date.now();
  private suppressConsole: boolean;

  constructor(runner: any, options?: any) {
    super(runner, options);
    
    this.suppressConsole = process.env.VSCODE_TEST_VERBOSE !== 'true';
    
    // Set up event listeners
    this.setupEventListeners(runner);
  }

  private setupEventListeners(runner: any) {
    runner.on('start', () => {
      if (!this.suppressConsole) {
        console.log('🧪 X-Fidelity VS Code Extension Test Suite Starting...');
      } else {
        console.log('🧪 Running VSCode Integration Tests...');
      }
    });

    runner.on('suite', (suite: any) => {
      if (suite.title && suite.title !== '') {
        if (!this.suppressConsole) {
          console.log(`\n📂 Suite: ${suite.title}`);
        } else {
          console.log(`\n📂 ${suite.title}`);
        }
      }
    });

    runner.on('test', (test: any) => {
      this.testCount++;
      if (!this.suppressConsole) {
        console.log(`  🏃 Running: ${test.title}`);
      } else {
        // Show minimal progress
        process.stdout.write('.');
      }
    });

    runner.on('pass', (test: any) => {
      this.passCount++;
      const duration = test.duration || 0;
      
      if (!this.suppressConsole) {
        const icon = duration > 5000 ? '🐌' : '✅';
        console.log(`  ${icon} ✓ ${test.title} (${duration}ms)`);
      } else {
        // Replace the dot with a checkmark for passed tests
        process.stdout.write('\b✓');
      }
    });

    runner.on('fail', (test: any, err: any) => {
      this.failCount++;
      
      if (!this.suppressConsole) {
        console.log(`  ❌ ✗ ${test.title}`);
        console.log(`     Error: ${err.message}`);
        if (err.stack && err.stack.length < 500) {
          console.log(`     Stack: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      } else {
        // Replace the dot with an X for failed tests
        process.stdout.write('\b✗');
        console.log(`\n  ❌ ✗ ${test.title}: ${err.message}`);
      }
    });

    runner.on('pending', (test: any) => {
      this.pendingCount++;
      
      if (!this.suppressConsole) {
        console.log(`  ⏸️  - ${test.title}`);
      } else {
        process.stdout.write('\b-');
      }
    });

    runner.on('end', () => {
      const endTime = Date.now();
      const totalTime = endTime - this.startTime;
      
      // Always show final summary
      console.log('\n\n📊 Test Results Summary:');
      console.log(`   Total Tests: ${this.testCount}`);
      console.log(`   ✅ Passed: ${this.passCount}`);
      console.log(`   ❌ Failed: ${this.failCount}`);
      if (this.pendingCount > 0) {
        console.log(`   ⏸️  Pending: ${this.pendingCount}`);
      }
      console.log(`   ⏱️  Total Time: ${totalTime}ms`);
      console.log(`   📈 Average Time: ${this.testCount > 0 ? (totalTime / this.testCount).toFixed(2) : 0}ms per test`);

      if (this.failCount === 0) {
        console.log('\n🎉 All tests passed!');
      } else {
        console.log(`\n💥 ${this.failCount} test(s) failed`);
      }
    });
  }
}

// Register the custom reporter
reporters.TestProgress = TestProgressReporter; 