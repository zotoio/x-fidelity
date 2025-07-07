import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

/**
 * Enhanced test suite configuration following VS Code best practices
 * - Individual test progress reporting using built-in spec reporter
 * - Proper timeout handling for extension tests  
 * - Comprehensive error reporting
 * - Console suppression capabilities
 */
export function run(): Promise<void> {
	// Store original console methods for restoration
	const originalConsole = {
		log: console.log,
		info: console.info,
		debug: console.debug,
		warn: console.warn,
		error: console.error
	};

	// Check if console suppression is enabled (default: true, can be disabled with VSCODE_TEST_VERBOSE=true)
	const suppressConsole = process.env.VSCODE_TEST_VERBOSE !== 'true';
	const isVerboseMode = !suppressConsole;

	// Make verbose mode available globally for test files
	(global as any).isVerboseMode = isVerboseMode;
	(global as any).testConsole = originalConsole;

	if (suppressConsole) {
		// Suppress noisy console output during tests, but keep error output
		console.log = () => {};
		console.info = () => {};
		console.debug = () => {};
		console.warn = () => {};
		// Keep console.error for important error messages
	}

	// Create the mocha test runner
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: 60000,
		// Use built-in spec reporter for individual test progress
		reporter: 'spec',
		reporterOptions: {
			// Clean output when console is suppressed
			verbose: isVerboseMode
		}
	});

	return new Promise((resolve, reject) => {
		// Temporarily restore console for test discovery and setup
		if (suppressConsole) {
			console.log = originalConsole.log;
			console.info = originalConsole.info;
		}

		// Define the test root directory
		const testsRoot = path.resolve(__dirname, '../..');
		console.log(`🔍 Discovering tests in: ${testsRoot}`);

		// Glob patterns to find all test files
		const testPatterns = [
			'**/test/unit/**/*.test.js',
			'**/test/integration/**/*.test.js', 
			'**/test/suite/**/*.test.js',
			'**/test/e2e/**/*.test.js'
		];

		Promise.all(
			testPatterns.map(pattern => 
				glob(pattern, { cwd: testsRoot, absolute: true })
			)
		).then(results => {
			const files = results.flat().sort();
			
			if (files.length === 0) {
				console.warn('⚠️  No test files found!');
				return resolve();
			}

			console.log(`📁 Found ${files.length} test files:`);
			files.forEach((file, index) => {
				const relativePath = path.relative(testsRoot, file);
				console.log(`   ${index + 1}. ${relativePath}`);
			});

			// Add test files to mocha
			files.forEach(file => mocha.addFile(file));

			// Re-suppress console if needed before running tests
			if (suppressConsole) {
				console.log = () => {};
				console.info = () => {};
			}

			console.log(`🚀 Running ${files.length} test files...\n`);

			// Run the tests
			try {
				// Test runner events are handled by the built-in spec reporter
				mocha.run(failures => {
					// Restore console for final output
					if (suppressConsole) {
						Object.assign(console, originalConsole);
					}

					if (failures > 0) {
						console.error(`❌ ${failures} test(s) failed`);
						reject(new Error(`${failures} tests failed`));
					} else {
						console.log(`✅ All tests passed!`);
						resolve();
					}
				});

			} catch (err) {
				// Restore console on error
				if (suppressConsole) {
					Object.assign(console, originalConsole);
				}
				console.error('Test runner error:', err);
				reject(err);
			}
		}).catch(err => {
			// Restore console on error
			if (suppressConsole) {
				Object.assign(console, originalConsole);
			}
			console.error('Test discovery error:', err);
			reject(err);
		});
	});
}
