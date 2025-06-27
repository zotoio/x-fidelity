import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

/**
 * VSCode Extension Test Runner
 * Loads and executes all test files in the test directory
 */
export function run(): Promise<void> {
	// Get test configuration from environment
	const testPattern = process.env.TEST_PATTERN || '**/**.test.js';
	const testTimeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10);
	
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: testTimeout,
		reporter: process.env.CI ? 'spec' : 'spec',
		bail: false, // Don't stop on first failure
		slow: 5000, // Tests slower than 5s are marked as slow
		grep: process.env.TEST_GREP, // Allow filtering tests via environment variable
		retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise(async (c, e) => {
		try {
			// Find test files based on pattern
			const files = await glob(testPattern, { 
				cwd: testsRoot, 
				absolute: false,
				ignore: ['**/node_modules/**']
			});

			console.log(`Found ${files.length} test files matching pattern "${testPattern}":`);
			files.forEach(f => console.log(`  - ${f}`));

			if (files.length === 0) {
				console.log('✅ No test files found - skipping');
				c();
				return;
			}

			// Add files to the test suite
			for (const f of files) {
				mocha.addFile(path.resolve(testsRoot, f));
			}

			// Run the mocha test
			mocha.run((failures: number) => {
				if (failures > 0) {
					console.error(`❌ ${failures} test(s) failed`);
					e(new Error(`${failures} tests failed.`));
				} else {
					console.log('✅ All tests passed');
					c();
				}
			});
		} catch (err) {
			console.error('❌ Test runner error:', err);
			e(err);
		}
	});
}
