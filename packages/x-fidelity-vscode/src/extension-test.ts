import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('MINIMAL X-Fidelity extension activation started...');
    
    // Register a simple test command
    const testCommand = vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage('X-Fidelity extension is working!');
        console.log('Test command executed successfully');
    });
    
    context.subscriptions.push(testCommand);
    
    // Show activation confirmation
    vscode.window.showInformationMessage('MINIMAL X-Fidelity extension activated!');
    
    console.log('MINIMAL X-Fidelity extension activated successfully');
}

export function deactivate() {
    console.log('MINIMAL X-Fidelity extension deactivated');
} 