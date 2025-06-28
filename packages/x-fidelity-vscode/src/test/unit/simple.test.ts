import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteTeardown } from 'mocha';

suite('Simple Extension Test Suite', () => {
	suiteTeardown(() => {
		vscode.window.showInformationMessage('Simple test done!');
	});

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
}); 