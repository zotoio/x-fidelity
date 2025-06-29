import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

/**
 * Enhanced test suite configuration following VS Code best practices
 * - Proper timeout handling for extension tests
 * - Comprehensive error reporting
 * - Performance monitoring
 * - Memory leak detection
 */
export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 20000, // 20 second timeout for integration tests
		slow: 5000, // Mark tests as slow if they take more than 5 seconds
		reporter: 'spec', // Use spec reporter for detailed output
		bail: false, // Continue running tests even if one fails
		grep: process.env.MOCHA_GREP || undefined, // Allow filtering tests via environment variable
	});

	// Enable stack traces for better debugging
	mocha.fullTrace();

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		// Performance monitoring
		const startTime = Date.now();
		let testCount = 0;
		let passCount = 0;
		let failCount = 0;

		// Setup test event handlers
		mocha.suite.on('pre-require', () => {
			console.log('🧪 X-Fidelity VS Code Extension Test Suite Starting...');
			console.log(`📁 Tests root: ${testsRoot}`);
			console.log(`⏱️  Timeout: ${mocha.options.timeout}ms`);
			console.log(`🐌 Slow threshold: ${mocha.options.slow}ms`);
		});

		// Track test results
		mocha.suite.on('test', (test) => {
			testCount++;
			console.log(`🏃 Running: ${test.title}`);
		});

		mocha.suite.on('pass', (test) => {
			passCount++;
			const duration = test.duration || 0;
			const icon = duration > (mocha.options.slow || 5000) ? '🐌' : '✅';
			console.log(`${icon} Passed: ${test.title} (${duration}ms)`);
		});

		mocha.suite.on('fail', (test, err) => {
			failCount++;
			console.log(`❌ Failed: ${test.title}`);
			console.log(`   Error: ${err.message}`);
			if (err.stack) {
				console.log(`   Stack: ${err.stack}`);
			}
		});

		    // Find and load all test files
    glob('**/**.test.js', { cwd: testsRoot })
      .then(files => {
        console.log(`📄 Found ${files.length} test files:`);
        
        // Add each file to the test suite
        files.forEach(f => {
          const testFile = path.resolve(testsRoot, f);
          console.log(`   📝 ${f}`);
          mocha.addFile(testFile);
        });

        // Run the mocha test
			mocha.run(failures => {
				const endTime = Date.now();
				const totalTime = endTime - startTime;
				
				console.log('\n📊 Test Results Summary:');
				console.log(`   Total Tests: ${testCount}`);
				console.log(`   ✅ Passed: ${passCount}`);
				console.log(`   ❌ Failed: ${failCount}`);
				console.log(`   ⏱️  Total Time: ${totalTime}ms`);
				console.log(`   📈 Average Time: ${testCount > 0 ? (totalTime / testCount).toFixed(2) : 0}ms per test`);

				// Memory usage information
				const memUsage = process.memoryUsage();
				console.log('\n💾 Memory Usage:');
				console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
				console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
				console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

				// Performance warnings
				if (totalTime > 60000) { // 1 minute
					console.log('⚠️  Warning: Test suite took longer than 1 minute to complete');
				}

				if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
					console.log('⚠️  Warning: High memory usage detected - potential memory leak');
				}

				if (failures > 0) {
					console.log(`\n💥 ${failures} test(s) failed`);
					reject(new Error(`${failures} tests failed`));
				} else {
					console.log('\n🎉 All tests passed!');
					          resolve();
        }
      });
    })
    .catch(err => {
      console.error('❌ Error finding test files:', err);
      reject(err);
    });
  });
}
