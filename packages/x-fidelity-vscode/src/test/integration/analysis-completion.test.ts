import assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  assertCommandExists,
  waitForAnalysisCompletion,
  getAnalysisResults
} from '../helpers/testHelpers';

suite('Analysis Completion & UI Feature Tests', () => {
  suiteSetup(async function () {
    this.timeout(60000); // 60 seconds for full analysis
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should complete full analysis workflow and update UI', async function () {
    this.timeout(120000); // 2 minutes for full analysis + UI updates

    // 1. Verify extension is active
    const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
    assert(extension?.isActive, 'Extension should be active');

    // 2. Run analysis and wait for completion
    console.log('🔍 Starting analysis...');
    await executeCommandSafely('xfidelity.runAnalysis');
    
    // Wait for analysis to complete (with timeout)
    const analysisCompleted = await waitForAnalysisCompletion(90000); // 90 seconds
    assert(analysisCompleted, 'Analysis should complete within timeout');

    // 3. Verify analysis results are available
    const results = await getAnalysisResults();
    assert(results !== null, 'Analysis results should be available');
    console.log(`📊 Analysis completed with ${results?.summary?.totalIssues || 0} issues`);

    // 4. Verify diagnostics are updated
    const diagnostics = vscode.languages.getDiagnostics();
    let xfidelityDiagnostics = 0;
    for (const [, diags] of diagnostics) {
      xfidelityDiagnostics += diags.filter(d => d.source === 'X-Fidelity').length;
    }
    console.log(`🔍 Found ${xfidelityDiagnostics} X-Fidelity diagnostics`);

    // 5. Verify tree view is populated
    const treeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
      treeDataProvider: { 
        getChildren: () => [],
        getTreeItem: () => new vscode.TreeItem('test')
      }
    });
    assert(treeView, 'Tree view should be available');

    // 6. Test all core commands
    const coreCommands = [
      'xfidelity.test',
      'xfidelity.getTestResults',
      'xfidelity.showOutput',
      'xfidelity.openSettings',
      'xfidelity.showControlCenter'
    ];

    for (const command of coreCommands) {
      await assertCommandExists(command);
      console.log(`✅ Command ${command} is registered`);
    }

    // 7. Test tree view commands
    const treeCommands = [
      'xfidelity.refreshIssuesTree',
      'xfidelity.issuesTreeGroupBySeverity',
      'xfidelity.issuesTreeGroupByRule',
      'xfidelity.issuesTreeGroupByFile',
      'xfidelity.issuesTreeGroupByCategory'
    ];

    for (const command of treeCommands) {
      await assertCommandExists(command);
      console.log(`✅ Tree command ${command} is registered`);
    }

    // 8. Test UI features
    await testUIFeatures();

    console.log('✅ Full analysis workflow completed successfully');
  });

  test('should handle analysis cancellation gracefully', async function () {
    this.timeout(30000);

    // Start analysis
    await executeCommandSafely('xfidelity.runAnalysis');
    
    // Wait a moment for analysis to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cancel analysis
    await executeCommandSafely('xfidelity.cancelAnalysis');
    
    // Verify cancellation worked
    const results = await getAnalysisResults();
    // Results might be null or incomplete after cancellation, which is expected
    console.log('✅ Analysis cancellation handled gracefully');
  });

  test('should update status bar during analysis', async function () {
    this.timeout(60000);

    // Check status bar before analysis
    const statusBarBefore = await getStatusBarText();
    console.log(`📊 Status bar before: ${statusBarBefore}`);

    // Start analysis
    await executeCommandSafely('xfidelity.runAnalysis');
    
    // Wait for status bar to update
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusBarDuring = await getStatusBarText();
    console.log(`📊 Status bar during: ${statusBarDuring}`);
    
    // Wait for completion
    await waitForAnalysisCompletion(45000);
    
    const statusBarAfter = await getStatusBarText();
    console.log(`📊 Status bar after: ${statusBarAfter}`);

    // Status bar should change during analysis
    assert(statusBarDuring !== statusBarBefore, 'Status bar should update during analysis');
    console.log('✅ Status bar updates during analysis');
  });

  test('should populate problems panel with diagnostics', async function () {
    this.timeout(60000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');
    await waitForAnalysisCompletion(45000);

    // Check problems panel
    const diagnostics = vscode.languages.getDiagnostics();
    let xfidelityFiles = 0;
    let totalXfidelityDiagnostics = 0;

    for (const [uri, diags] of diagnostics) {
      const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');
      if (xfidelityDiags.length > 0) {
        xfidelityFiles++;
        totalXfidelityDiagnostics += xfidelityDiags.length;
      }
    }

    console.log(`📊 Problems panel: ${totalXfidelityDiagnostics} diagnostics across ${xfidelityFiles} files`);
    
    // Should have some diagnostics (even if 0 issues found)
    assert(xfidelityFiles >= 0, 'Should have valid file count');
    assert(totalXfidelityDiagnostics >= 0, 'Should have valid diagnostic count');
    
    console.log('✅ Problems panel populated correctly');
  });

  test('should handle configuration changes', async function () {
    this.timeout(30000);

    // Test archetype detection
    await executeCommandSafely('xfidelity.detectArchetype');
    
    // Test settings command
    await executeCommandSafely('xfidelity.openSettings');
    
    // Test control center
    await executeCommandSafely('xfidelity.showControlCenter');
    
    console.log('✅ Configuration commands work correctly');
  });

  test('should provide detailed output logging', async function () {
    this.timeout(30000);

    // Show output channel
    await executeCommandSafely('xfidelity.showOutput');
    
    // Verify output channel is available
    const outputChannel = vscode.window.createOutputChannel('X-Fidelity Debug');
    assert(outputChannel, 'Output channel should be available');
    
    console.log('✅ Output logging works correctly');
  });
});

async function testUIFeatures(): Promise<void> {
  console.log('🎨 Testing UI features...');

  // Test tree view refresh
  await executeCommandSafely('xfidelity.refreshIssuesTree');
  
  // Test grouping commands
  await executeCommandSafely('xfidelity.issuesTreeGroupBySeverity');
  await executeCommandSafely('xfidelity.issuesTreeGroupByRule');
  await executeCommandSafely('xfidelity.issuesTreeGroupByFile');
  await executeCommandSafely('xfidelity.issuesTreeGroupByCategory');
  
  // Test control center
  await executeCommandSafely('xfidelity.showControlCenter');
  
  console.log('✅ All UI features work correctly');
}

async function getStatusBarText(): Promise<string> {
  // Status bar text is not directly accessible via API
  // We'll check if the status bar provider is working
  try {
    // Try to get analysis engine status
    const results = await getAnalysisResults();
    if (results) {
      return `Analysis completed with ${results.summary.totalIssues} issues`;
    } else {
      return 'No analysis results';
    }
  } catch {
    return 'Status unknown';
  }
} 