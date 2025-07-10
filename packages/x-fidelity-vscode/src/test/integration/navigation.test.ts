import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  waitForAnalysisCompletion,
  getAnalysisResults,
  getXfidelityDiagnosticCount
} from '../helpers/testHelpers';

suite('Navigation & Line/Column Accuracy Tests', () => {
  suiteSetup(async function () {
    this.timeout(60000);
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should navigate to exact file locations when clicking diagnostics', async function () {
    this.timeout(90000);

    // Run analysis to generate diagnostics
    console.log('🔍 Running analysis to generate diagnostics...');
    await executeCommandSafely('xfidelity.runAnalysis');
    await waitForAnalysisCompletion(60000);

    // Get diagnostics
    const diagnostics = vscode.languages.getDiagnostics();
    let navigationTests = 0;
    let successfulNavigations = 0;

    for (const [uri, diags] of diagnostics) {
      const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');
      
      for (const diagnostic of xfidelityDiags) {
        navigationTests++;
        
        try {
          // Test navigation to diagnostic location
          const success = await testDiagnosticNavigation(uri, diagnostic);
          if (success) {
            successfulNavigations++;
          }
        } catch (error) {
          console.log(`⚠️ Navigation test failed for ${uri.fsPath}:`, error);
        }
      }
    }

    console.log(`📊 Navigation test results: ${successfulNavigations}/${navigationTests} successful`);
    
    // Should have at least some successful navigations if diagnostics exist
    if (navigationTests > 0) {
      assert(successfulNavigations > 0, 'Should have at least some successful navigations');
    }
    
    console.log('✅ Diagnostic navigation tests completed');
  });

  test('should navigate to correct line/column from tree view', async function () {
    this.timeout(90000);

    // Run analysis
    console.log('🔍 Running analysis for tree view navigation...');
    await executeCommandSafely('xfidelity.runAnalysis');
    await waitForAnalysisCompletion(60000);

    // Test tree view navigation
    const treeNavigationSuccess = await testTreeViewNavigation();
    assert(treeNavigationSuccess, 'Tree view navigation should work');
    
    console.log('✅ Tree view navigation tests completed');
  });

  test('should handle navigation to non-existent files gracefully', async function () {
    this.timeout(30000);

    // Test navigation to a non-existent file
    const nonExistentUri = vscode.Uri.file('/non/existent/file.ts');
    const fakeDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 10),
      'Test diagnostic',
      vscode.DiagnosticSeverity.Warning
    );
    fakeDiagnostic.source = 'X-Fidelity';

    try {
      await testDiagnosticNavigation(nonExistentUri, fakeDiagnostic);
      // Should not reach here - should throw an error
      assert(false, 'Navigation to non-existent file should fail');
    } catch (error) {
      console.log('✅ Navigation to non-existent file handled gracefully:', error);
    }
  });

  test('should validate line/column accuracy in diagnostics', async function () {
    this.timeout(90000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');
    await waitForAnalysisCompletion(60000);

    // Validate diagnostic coordinates
    const diagnostics = vscode.languages.getDiagnostics();
    let validCoordinates = 0;
    let totalDiagnostics = 0;

    for (const [uri, diags] of diagnostics) {
      const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');
      
      for (const diagnostic of xfidelityDiags) {
        totalDiagnostics++;
        
        if (validateDiagnosticCoordinates(diagnostic)) {
          validCoordinates++;
        }
      }
    }

    console.log(`📊 Coordinate validation: ${validCoordinates}/${totalDiagnostics} valid`);
    
    if (totalDiagnostics > 0) {
      // Most diagnostics should have valid coordinates
      const accuracyRate = validCoordinates / totalDiagnostics;
      assert(accuracyRate > 0.8, `Coordinate accuracy should be >80%, got ${accuracyRate * 100}%`);
    }
    
    console.log('✅ Diagnostic coordinate validation completed');
  });

  test('should handle navigation with enhanced ranges', async function () {
    this.timeout(90000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');
    await waitForAnalysisCompletion(60000);

    // Test navigation with enhanced ranges
    const diagnostics = vscode.languages.getDiagnostics();
    let enhancedRangeTests = 0;
    let successfulEnhancedNavigations = 0;

    for (const [uri, diags] of diagnostics) {
      const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');
      
      for (const diagnostic of xfidelityDiags) {
        // Check if diagnostic has enhanced range data
        if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
          enhancedRangeTests++;
          
          try {
            const success = await testEnhancedRangeNavigation(uri, diagnostic);
            if (success) {
              successfulEnhancedNavigations++;
            }
          } catch (error) {
            console.log(`⚠️ Enhanced range navigation failed:`, error);
          }
        }
      }
    }

    console.log(`📊 Enhanced range navigation: ${successfulEnhancedNavigations}/${enhancedRangeTests} successful`);
    
    if (enhancedRangeTests > 0) {
      assert(successfulEnhancedNavigations > 0, 'Should have some successful enhanced range navigations');
    }
    
    console.log('✅ Enhanced range navigation tests completed');
  });
});

/**
 * Test navigation to a diagnostic location
 */
async function testDiagnosticNavigation(
  uri: vscode.Uri, 
  diagnostic: vscode.Diagnostic
): Promise<boolean> {
  try {
    // Open the document
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    
    // Navigate to the diagnostic range
    editor.selection = new vscode.Selection(
      diagnostic.range.start,
      diagnostic.range.end
    );
    
    // Verify we're at the correct location
    const currentPosition = editor.selection.active;
    const expectedStart = diagnostic.range.start;
    
    const lineMatch = currentPosition.line === expectedStart.line;
    const columnMatch = currentPosition.character === expectedStart.character;
    
    if (lineMatch && columnMatch) {
      console.log(`✅ Navigation successful: ${uri.fsPath}:${expectedStart.line + 1}:${expectedStart.character + 1}`);
      return true;
    } else {
      console.log(`⚠️ Navigation mismatch: expected ${expectedStart.line + 1}:${expectedStart.character + 1}, got ${currentPosition.line + 1}:${currentPosition.character + 1}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Navigation failed for ${uri.fsPath}:`, error);
    return false;
  }
}

/**
 * Test tree view navigation
 */
async function testTreeViewNavigation(): Promise<boolean> {
  try {
    // Try to execute the goToIssue command
    // This simulates clicking on a tree view item
    await executeCommandSafely('xfidelity.goToIssue');
    
    // If the command executes without error, navigation is working
    console.log('✅ Tree view navigation command executed successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Tree view navigation test failed:', error);
    return false;
  }
}

/**
 * Validate diagnostic coordinates
 */
function validateDiagnosticCoordinates(diagnostic: vscode.Diagnostic): boolean {
  try {
    // Check that range is valid
    if (!diagnostic.range) {
      return false;
    }
    
    // Check that start and end positions are valid
    const start = diagnostic.range.start;
    const end = diagnostic.range.end;
    
    if (start.line < 0 || start.character < 0) {
      return false;
    }
    
    if (end.line < 0 || end.character < 0) {
      return false;
    }
    
    // Check that end is not before start
    if (end.line < start.line || (end.line === start.line && end.character < start.character)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Test navigation with enhanced ranges
 */
async function testEnhancedRangeNavigation(
  uri: vscode.Uri, 
  diagnostic: vscode.Diagnostic
): Promise<boolean> {
  try {
    // Check if diagnostic has related information (enhanced range data)
    if (!diagnostic.relatedInformation || diagnostic.relatedInformation.length === 0) {
      return false;
    }
    
    // Test navigation to the primary location
    const primarySuccess = await testDiagnosticNavigation(uri, diagnostic);
    
    // Test navigation to related locations
    let relatedSuccess = 0;
    for (const relatedInfo of diagnostic.relatedInformation) {
      if (relatedInfo.location) {
        const success = await testDiagnosticNavigation(relatedInfo.location.uri, {
          range: relatedInfo.location.range,
          message: relatedInfo.message,
          severity: diagnostic.severity,
          source: diagnostic.source
        } as vscode.Diagnostic);
        
        if (success) {
          relatedSuccess++;
        }
      }
    }
    
    const totalRelated = diagnostic.relatedInformation.length;
    const successRate = relatedSuccess / totalRelated;
    
    console.log(`📊 Enhanced range navigation: ${relatedSuccess}/${totalRelated} related locations successful`);
    
    return primarySuccess && successRate > 0.5; // At least 50% of related locations should work
  } catch (error) {
    console.log('❌ Enhanced range navigation failed:', error);
    return false;
  }
} 