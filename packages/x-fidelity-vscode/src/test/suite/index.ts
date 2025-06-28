import * as path from 'path';
import Mocha from 'mocha';

/**
 * VSCode Extension Test Runner for @vscode/test-cli
 * Properly sets up Mocha with globals and runs the provided test files
 */
export function run(): Promise<void> {
	console.log('🚀 VSCode Test Runner: Starting...');
	
	return new Promise((resolve, reject) => {
		console.log('🔧 VSCode Test Runner: Setting up Mocha...');
		
		// Create a new Mocha instance with proper configuration
		const mocha = new Mocha({
			ui: 'bdd',
			color: true,
			timeout: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
			reporter: 'spec',
			bail: false,
			slow: 5000,
			grep: process.env.TEST_GREP,
			retries: process.env.CI ? 2 : 0,
		});

		console.log('📁 VSCode Test Runner: Finding test files...');
		
		// Set up test directory
		const testsRoot = path.resolve(__dirname, '..');
		console.log(`📍 VSCode Test Runner: Test root directory: ${testsRoot}`);
		
		// Add all test files found by @vscode/test-cli
		// This uses Node.js require.context equivalent
		const glob = require('glob');
		const testFiles = glob.sync('**/**.test.js', {
			cwd: testsRoot,
			absolute: true
		});

		console.log(`📋 VSCode Test Runner: Found ${testFiles.length} test files in ${testsRoot}`);
		testFiles.forEach((f: string) => {
			console.log(`  ➕ Adding test file: ${path.relative(testsRoot, f)}`);
			mocha.addFile(f);
		});

		if (testFiles.length === 0) {
			console.log('⚠️  VSCode Test Runner: No test files found');
			resolve();
			return;
		}

		try {
			console.log('🏃 VSCode Test Runner: Running tests...');
			
			// Run the tests
			mocha.run(failures => {
				if (failures > 0) {
					console.error(`❌ VSCode Test Runner: ${failures} test(s) failed`);
					reject(new Error(`${failures} tests failed`));
				} else {
					console.log('✅ VSCode Test Runner: All tests passed');
					resolve();
				}
			});
		} catch (err) {
			console.error('❌ VSCode Test Runner: Error running tests:', err);
			reject(err);
		}
	});
}
