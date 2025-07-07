import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';
// Import our custom reporter
import '../reporters/testProgress.reporter';

/**
 * Enhanced test suite configuration following VS Code best practices
 * - Proper timeout handling for extension tests
 * - Comprehensive error reporting
 * - Performance monitoring
 * - Memory leak detection
 * - Individual test progress reporting
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
	
	if (suppressConsole) {
		// Suppress console output during tests, except for errors
		console.log = () => {};
		console.info = () => {};
		console.debug = () => {};
		console.warn = () => {};
		// Keep console.error for critical failures
	}

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: 20000, // 20 second timeout for integration tests
		slow: 5000, // Mark tests as slow if they take more than 5 seconds
		reporter: 'TestProgress', // Use our custom reporter
		bail: false, // Continue running tests even if one fails
		grep: process.env.MOCHA_GREP || undefined, // Allow filtering tests via environment variable
		require: [path.resolve(__dirname, '../setup/mocha.setup.js')], // Load setup file for console suppression
	});

	// Enable stack traces for better debugging
	mocha.fullTrace();

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		// Find and load all test files (both .js and .ts patterns)
		const testPatterns = [
			'**/**.test.js',    // Compiled JavaScript test files
			'unit/**/*.test.js', // Unit tests
			'integration/**/*.test.js', // Integration tests  
			'suite/**/*.test.js' // Suite tests
		];

		// Use Promise.all to find all test files
		Promise.all(testPatterns.map(pattern => 
			glob(pattern, { cwd: testsRoot }).catch(() => [])
		)).then(results => {
			// Flatten and deduplicate test files
			const allFiles = [...new Set(results.flat())];
			
			if (allFiles.length === 0) {
				// Restore console for error output
				if (suppressConsole) {
					Object.assign(console, originalConsole);
				}
				originalConsole.error('❌ No test files found!');
				originalConsole.log('🔍 Looking for patterns:', testPatterns);
				originalConsole.log('📁 In directory:', testsRoot);
				reject(new Error('No test files found'));
				return;
			}

			if (!suppressConsole) {
				originalConsole.log(`📄 Found ${allFiles.length} test files:`);
			} else {
				console.log(`📄 Found ${allFiles.length} test files`);
			}
			
			// Add each file to the test suite
			allFiles.forEach(f => {
				const testFile = path.resolve(testsRoot, f);
				if (!suppressConsole) {
					originalConsole.log(`   📝 ${f}`);
				}
				mocha.addFile(testFile);
			});

			// Run the mocha test
			mocha.run((failures: number) => {
				// Restore console for final summary output
				if (suppressConsole) {
					Object.assign(console, originalConsole);
				}

				// Memory usage information (only in verbose mode)
				if (!suppressConsole) {
					const memUsage = process.memoryUsage();
					originalConsole.log('\n💾 Memory Usage:');
					originalConsole.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
					originalConsole.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
					originalConsole.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

					// Performance warnings
					const totalTime = Date.now();
					if (totalTime > 60000) { // 1 minute
						originalConsole.log('⚠️  Warning: Test suite took longer than 1 minute to complete');
					}

					if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
						originalConsole.log('⚠️  Warning: High memory usage detected - potential memory leak');
					}
				}

				if (failures > 0) {
					reject(new Error(`${failures} tests failed`));
				} else {
					resolve();
				}
			});
		}).catch(err => {
			// Restore console for error output
			if (suppressConsole) {
				Object.assign(console, originalConsole);
			}
			originalConsole.error('❌ Error finding test files:', err);
			reject(err);
		});
	});
}
