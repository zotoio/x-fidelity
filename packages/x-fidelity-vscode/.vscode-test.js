const { defineConfig } = require('@vscode/test-cli');
const path = require('path');

// Use node-fullstack fixtures as workspace (consistent with runTest.ts)
const fixturesWorkspace = path.resolve(__dirname, '../x-fidelity-fixtures/node-fullstack');

module.exports = defineConfig([
	{
		label: 'unitTests',
		files: 'out/test/test/suite/basic.test.js',
		workspaceFolder: fixturesWorkspace,
		mocha: {
			ui: 'tdd',
			timeout: 10000,
			reporter: 'spec',
			color: true,
			bail: false
		}
	},
	{
		label: 'integrationTests',
		files: 'out/test/test/suite/*.test.js',
		workspaceFolder: fixturesWorkspace,
		mocha: {
			ui: 'tdd',
			timeout: 20000,
			reporter: 'spec',
			color: true,
			bail: false
		}
	},
	{
		label: 'e2eTests',
		files: 'out/test/test/suite/*.test.js',
		workspaceFolder: fixturesWorkspace,
		mocha: {
			ui: 'tdd',
			timeout: 30000,
			reporter: 'spec',
			color: true,
			bail: false
		}
	},
	{
		label: 'consistencyTests',
		files: 'out/test/test/suite/consistency.test.js',
		workspaceFolder: fixturesWorkspace,
		mocha: {
			ui: 'tdd',
			timeout: 60000,
			reporter: 'spec',
			color: true,
			bail: false
		}
	}
]); 