import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createCLISpawner } from './cliSpawner';
import { getAnalysisTargetDirectory } from './workspaceUtils';
import type { AnalysisResult } from '../analysis/types';

export async function diagnoseCLIResultIssue(): Promise<string> {
  const diagnostics: string[] = [];

  try {
    const workspacePath = getAnalysisTargetDirectory();
    if (!workspacePath) {
      diagnostics.push('❌ No workspace directory found');
      return diagnostics.join('\n');
    }

    diagnostics.push(`📁 Workspace Path: ${workspacePath}`);

    // Check .xfiResults directory
    const xfiResultsDir = path.join(workspacePath, '.xfiResults');
    const xfiResultsDirExists = fs.existsSync(xfiResultsDir);
    diagnostics.push(
      `📁 .xfiResults Directory: ${xfiResultsDirExists ? '✅ Exists' : '❌ Missing'}`
    );

    if (xfiResultsDirExists) {
      try {
        const files = fs.readdirSync(xfiResultsDir);
        diagnostics.push(
          `📄 Files in .xfiResults: ${files.length === 0 ? 'None' : files.join(', ')}`
        );

        // Check specifically for XFI_RESULT.json
        const xfiResultFile = path.join(xfiResultsDir, 'XFI_RESULT.json');
        const xfiResultExists = fs.existsSync(xfiResultFile);
        diagnostics.push(
          `📄 XFI_RESULT.json: ${xfiResultExists ? '✅ Exists' : '❌ Missing'}`
        );

        if (xfiResultExists) {
          try {
            const stats = fs.statSync(xfiResultFile);
            const content = fs.readFileSync(xfiResultFile, 'utf8');
            diagnostics.push(`📊 XFI_RESULT.json Size: ${stats.size} bytes`);
            diagnostics.push(
              `🕒 XFI_RESULT.json Modified: ${stats.mtime.toISOString()}`
            );
            diagnostics.push(
              `📝 XFI_RESULT.json Content Length: ${content.length}`
            );

            if (content.trim()) {
              try {
                const parsed = JSON.parse(content);
                diagnostics.push(`✅ XFI_RESULT.json is valid JSON`);
                diagnostics.push(
                  `🔍 XFI_RESULT.json Keys: ${Object.keys(parsed).join(', ')}`
                );
              } catch (parseError) {
                diagnostics.push(
                  `❌ XFI_RESULT.json parse error: ${parseError}`
                );
                diagnostics.push(
                  `📝 First 200 chars: ${content.substring(0, 200)}`
                );
              }
            } else {
              diagnostics.push(`❌ XFI_RESULT.json is empty`);
            }
          } catch (readError) {
            diagnostics.push(`❌ Error reading XFI_RESULT.json: ${readError}`);
          }
        }
      } catch (dirError) {
        diagnostics.push(`❌ Error reading .xfiResults directory: ${dirError}`);
      }
    }

    // Test CLI spawner
    diagnostics.push('\n🔧 CLI Spawner Diagnostics:');
    try {
      const cliSpawner = createCLISpawner();
      const cliDiagnostics = await cliSpawner.getDiagnostics();

      diagnostics.push(`🔧 Node.js Path: ${cliDiagnostics.nodePath}`);
      diagnostics.push(`🔧 CLI Path: ${cliDiagnostics.cliPath}`);
      diagnostics.push(
        `🔧 Node.js Exists: ${cliDiagnostics.nodeExists ? '✅' : '❌'}`
      );
      diagnostics.push(
        `🔧 CLI Exists: ${cliDiagnostics.cliExists ? '✅' : '❌'}`
      );
      diagnostics.push(
        `🔧 Working Directory: ${cliDiagnostics.workingDirectory}`
      );

      if (cliDiagnostics.cliExists) {
        diagnostics.push(
          `🔧 CLI Size: ${(cliDiagnostics as any).cliSize || 'Unknown'} bytes`
        );
        diagnostics.push(
          `🔧 CLI Modified: ${(cliDiagnostics as any).cliModified || 'Unknown'}`
        );
      }
    } catch (cliError) {
      diagnostics.push(`❌ CLI Spawner Error: ${cliError}`);
    }

    // Test if we can run a simple CLI command
    diagnostics.push('\n🧪 CLI Test Execution:');
    try {
      const cliSpawner = createCLISpawner();

      // Try to validate the CLI
      await cliSpawner.validateCLI();
      diagnostics.push('✅ CLI validation passed');

      // Try to run analysis on a small directory
      const testDir = path.join(workspacePath, 'src');
      if (fs.existsSync(testDir)) {
        diagnostics.push(`🧪 Testing CLI analysis on: ${testDir}`);

        // Run with a very short timeout for testing
        const testResult = (await Promise.race([
          cliSpawner.runAnalysis({
            workspacePath,
            args: ['--file-cache-ttl', '1'],
            timeout: 30000 // 30 seconds
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Test timeout')), 30000)
          )
        ])) as AnalysisResult;

        diagnostics.push('✅ CLI execution completed successfully');
        diagnostics.push(
          `📊 Analysis Summary: ${testResult.summary?.totalIssues || 0} issues found`
        );

        // Check if the result file was created
        const resultFileAfterTest = path.join(
          workspacePath,
          '.xfiResults',
          'XFI_RESULT.json'
        );
        const resultExistsAfterTest = fs.existsSync(resultFileAfterTest);
        diagnostics.push(
          `📄 XFI_RESULT.json after test: ${resultExistsAfterTest ? '✅ Created' : '❌ Still missing'}`
        );
      } else {
        diagnostics.push(
          `⚠️ No src directory found for testing, skipping CLI execution test`
        );
      }
    } catch (testError) {
      diagnostics.push(`❌ CLI Test Error: ${testError}`);

      // Check if partial files were created
      const resultFileAfterError = path.join(
        workspacePath,
        '.xfiResults',
        'XFI_RESULT.json'
      );
      const resultExistsAfterError = fs.existsSync(resultFileAfterError);
      diagnostics.push(
        `📄 XFI_RESULT.json after error: ${resultExistsAfterError ? '✅ Exists' : '❌ Missing'}`
      );
    }
  } catch (error) {
    diagnostics.push(`💥 Critical diagnostic error: ${error}`);
  }

  return diagnostics.join('\n');
}

export async function showCLIDiagnosticsDialog(): Promise<void> {
  const result = await diagnoseCLIResultIssue();

  const choice = await vscode.window.showInformationMessage(
    'CLI Diagnostics completed. Check the output for details.',
    'Show Details',
    'Copy to Clipboard'
  );

  if (choice === 'Show Details') {
    // Create a new document with the diagnostics
    const doc = await vscode.workspace.openTextDocument({
      content: result,
      language: 'plaintext'
    });
    await vscode.window.showTextDocument(doc);
  } else if (choice === 'Copy to Clipboard') {
    await vscode.env.clipboard.writeText(result);
    vscode.window.showInformationMessage('Diagnostics copied to clipboard');
  }
}
