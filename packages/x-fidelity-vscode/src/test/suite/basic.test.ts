import * as assert from 'assert';
import * as vscode from 'vscode';
import { isXFidelityDevelopmentContext, getAnalysisTargetDirectory, getXFidelityMonorepoRoot } from '../../utils/workspaceUtils';

suite('Basic Extension Tests (Monorepo Workspace)', () => {
	let extension: vscode.Extension<any> | undefined;

	suiteSetup(async function() {
		this.timeout(30000);
		
		// Get the extension and wait for it to be ready
		extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
		assert.ok(extension, 'Extension should be found');
		
		// Verify we're testing against the actual monorepo workspace
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			console.log('Testing workspace:', workspaceFolder.uri.fsPath);
			console.log('Workspace name:', workspaceFolder.name);
		}
		
		// Wait for VSCode to be fully ready
		await new Promise(resolve => setTimeout(resolve, 2000));
	});

	test('Extension should be present', function() {
		assert.ok(extension, 'Extension should be present');
	});

	test('Extension should activate in monorepo workspace', async function() {
		this.timeout(45000);
		
		if (!extension) {
			throw new Error('Extension not found');
		}

		// Activate the extension with proper error handling
		try {
			if (!extension.isActive) {
				console.log('Activating extension in monorepo workspace...');
				await extension.activate();
				
				// Wait a bit for activation to complete
				await new Promise(resolve => setTimeout(resolve, 3000));
			}
		} catch (error) {
			console.error('Extension activation error:', error);
			throw error;
		}

		assert.ok(extension.isActive, 'Extension should be active after activation');
	});

	test('Commands should be registered', async function() {
		this.timeout(15000);
		
		if (!extension) {
			throw new Error('Extension not found');
		}

		// Ensure extension is activated first
		if (!extension.isActive) {
			console.log('Activating extension for commands test...');
			await extension.activate();
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Wait for commands to be registered
		await new Promise(resolve => setTimeout(resolve, 1000));

		const commands = await vscode.commands.getCommands(true);
		const xfidelityCommands = commands.filter(cmd => cmd.startsWith('xfidelity.'));
		
		console.log(`Found ${xfidelityCommands.length} X-Fidelity commands:`, xfidelityCommands);
		
		// We expect at least some basic commands to be registered
		assert.ok(xfidelityCommands.length > 0, 'Should have X-Fidelity commands registered');
	});

	test('Status bar should be available', async function() {
		this.timeout(15000);
		
		if (!extension) {
			throw new Error('Extension not found');
		}

		// Ensure extension is activated
		if (!extension.isActive) {
			console.log('Activating extension for status bar test...');
			await extension.activate();
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Give some time for status bar to initialize
		await new Promise(resolve => setTimeout(resolve, 2000));
		
		// This test just verifies the extension activated without error
		// In a real scenario, we would check for the status bar item
		assert.ok(extension.isActive, 'Extension should be active for status bar');
	});

	test('Extension should handle real monorepo workspace', async function() {
		this.timeout(15000);
		
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'Should have a workspace folder');
		
		// Verify we're in the correct workspace by checking for monorepo structure
		const workspacePath = workspaceFolder.uri.fsPath;
		console.log('Workspace path:', workspacePath);
		
		// The workspace should contain typical monorepo files
		const expectedFiles = ['package.json', 'packages', '.xfi-config.json', 'yarn.lock'];
		for (const file of expectedFiles) {
			try {
				const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, file);
				await vscode.workspace.fs.stat(fileUri);
				console.log(`Found expected file/directory: ${file}`);
			} catch (error) {
				assert.fail(`Expected file/directory not found: ${file}`);
			}
		}
	});

	test('Workspace detection should work correctly for development context', function() {
		// Test that we can detect when we're in development context
		const isDev = isXFidelityDevelopmentContext();
		console.log('Is X-Fidelity development context:', isDev);
		
		// In our test environment, this should be true
		assert.ok(isDev, 'Should detect X-Fidelity development context');
		
		// Get the monorepo root
		const monorepoRoot = getXFidelityMonorepoRoot();
		console.log('Monorepo root:', monorepoRoot);
		assert.ok(monorepoRoot, 'Should find monorepo root');
		
		// Get analysis target directory
		const analysisTarget = getAnalysisTargetDirectory();
		console.log('Analysis target:', analysisTarget);
		assert.ok(analysisTarget, 'Should have analysis target');
		
		// In development context, analysis target should be monorepo root
		assert.strictEqual(analysisTarget, monorepoRoot, 'Analysis target should be monorepo root in development context');
	});
}); import * as assert from 'assert';
import * as vscode from 'vscode';
import { before, after, describe, it } from 'mocha';

suite('Basic Extension Test Suite', () => {
    let extension: vscode.Extension<any>;
    
    before(async function() {
        this.timeout(30000);
        
        // Get the extension
        extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode')!;
        assert.ok(extension, 'Extension should be present');
        
        // Activate the extension
        if (!extension.isActive) {
            await extension.activate();
        }
        
        // Wait for activation to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    describe('Extension Activation', () => {
        it('should be present and activated', () => {
            assert.ok(extension);
            assert.ok(extension.isActive);
        });

        it('should have correct package information', () => {
            const packageJson = extension.packageJSON;
            assert.strictEqual(packageJson.name, 'x-fidelity-vscode');
            assert.ok(packageJson.displayName);
            assert.ok(packageJson.description);
            assert.ok(packageJson.version);
        });
    });

    describe('Basic Commands', () => {
        it('should register test command', async function() {
            this.timeout(5000);
            
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('xfidelity.test'), 'Test command should be registered');
        });

        it('should execute test command without errors', async function() {
            this.timeout(5000);
            
            try {
                await vscode.commands.executeCommand('xfidelity.test');
                assert.ok(true, 'Test command executed successfully');
            } catch (error) {
                assert.fail(`Test command failed: ${error}`);
            }
        });
    });

    describe('Extension Configuration', () => {
        it('should have default configuration values', () => {
            const config = vscode.workspace.getConfiguration('xfidelity');
            
            // Test that configuration exists and has expected types
            const archetype = config.get('archetype');
            assert.ok(typeof archetype === 'string', 'Archetype should be a string');
            
            const runInterval = config.get('runInterval');
            assert.ok(typeof runInterval === 'number', 'Run interval should be a number');
            
            const autoAnalyzeOnSave = config.get('autoAnalyzeOnSave');
            assert.ok(typeof autoAnalyzeOnSave === 'boolean', 'Auto analyze on save should be a boolean');
        });
    });

    after(async function() {
        this.timeout(5000);
        
        // Clean up any open editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
});
