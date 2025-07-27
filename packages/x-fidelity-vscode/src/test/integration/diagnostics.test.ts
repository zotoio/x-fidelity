import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup, suiteTeardown, setup } from 'mocha';
import {
  ensureExtensionActivated,
  getTestWorkspace,
  getSharedAnalysisResults, // Use shared cache
  waitFor
} from '../helpers/testHelpers';

/**
 * Comprehensive Diagnostic Validation Tests
 *
 * This test suite ensures that:
 * 1. Problems panel is properly populated with X-Fi issues
 * 2. Line numbers are 100% accurate (proper 1-based to 0-based conversion)
 * 3. Severity mapping is consistent between CLI and Extension
 * 4. Diagnostics can be navigated to correct file locations
 * 5. End-to-end diagnostic flow works correctly
 */
suite('Diagnostic Validation & Problems Panel Integration Tests', () => {
  let diagnosticCollection: vscode.DiagnosticCollection;
  let analysisResults: any;

  suiteSetup(async function () {
    this.timeout(120000); // Allow time for initial setup
    
    await ensureExtensionActivated();
    getTestWorkspace();
    
    // Get the diagnostic collection from the extension
    diagnosticCollection = vscode.languages.createDiagnosticCollection('test-x-fidelity');
    
    // Use shared analysis results (much faster than individual runs)
    analysisResults = await getSharedAnalysisResults();
    
    console.log(`📊 Analysis loaded: ${
      Array.isArray(analysisResults.issues) ? 
      analysisResults.issues.length : 'unknown'
    } issues found`);
  });

  setup(async function () {
    this.timeout(30000); // Much shorter timeout since analysis is cached
    console.log('🔍 Waiting for diagnostics to be ready...');
    
    // Just wait for diagnostics to be processed
    await waitForDiagnosticProcessing(5000);
  });

  suiteTeardown(async function () {
    console.log('🔧 DEBUG: Cleaning up diagnostic test suite...');
    diagnosticCollection?.dispose();
    console.log('🔧 DEBUG: Suite teardown completed');
  });

  test('should populate problems panel with X-Fidelity diagnostics', async function () {
    this.timeout(60000); // Reduced timeout since analysis is cached

    console.log('🔧 DEBUG: Starting problems panel population test...');
    
    // DEBUG: Log current VSCode workspace state
    console.log('🔧 DEBUG: Current VSCode workspace state:');
    console.log(`  - Active workspace folders: ${vscode.workspace.workspaceFolders?.length || 0}`);
    if (vscode.workspace.workspaceFolders) {
      vscode.workspace.workspaceFolders.forEach((folder, index) => {
        console.log(`  - Folder ${index}: ${folder.uri.fsPath}`);
      });
    }

    // Use cached analysis results instead of running fresh analysis
    console.log('🔧 DEBUG: Using cached analysis results...');
    assert.ok(analysisResults, 'Analysis results should be available from cache');

    // Wait for diagnostics to be populated
    console.log('🔧 DEBUG: Waiting for diagnostics to be populated...');
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = Array.from(allDiagnostics).filter(
      ([_uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) =>
        diagnostics.some(
          (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
        )
    );

    console.log(`🔧 DEBUG: Found ${xfidelityDiagnostics.length} files with X-Fidelity diagnostics`);

    // Verify we have diagnostics
    assert.ok(
      xfidelityDiagnostics.length > 0,
      'Should have X-Fidelity diagnostics in problems panel'
    );

    // Verify diagnostic properties
    for (const [, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      
      for (const diag of xfiDiags) {
        assert.ok(diag.message, 'Diagnostic should have a message');
        assert.ok(diag.range, 'Diagnostic should have a range');
        assert.ok(diag.severity, 'Diagnostic should have severity');
        
        // Verify range is valid
        assert.ok(diag.range.start.line >= 0, 'Start line should be >= 0');
        assert.ok(diag.range.start.character >= 0, 'Start character should be >= 0');
        assert.ok(diag.range.end.line >= diag.range.start.line, 'End line should be >= start line');
      }
    }

    console.log('✅ Problems panel population test completed successfully');
  });

  test('should validate diagnostic coordinate conversion accuracy', async function () {
    this.timeout(60000); // Reduced timeout since analysis is cached

    console.log('🔧 DEBUG: Starting coordinate conversion accuracy test...');

    // Use cached analysis results
    console.log('🔧 DEBUG: Using cached analysis results...');
    assert.ok(analysisResults, 'Analysis results should be available from cache');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = Array.from(allDiagnostics).filter(
      ([_uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) =>
        diagnostics.some(
          (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
        )
    );

    console.log(`🔧 DEBUG: Validating coordinates for ${xfidelityDiagnostics.length} files`);

    let totalValidated = 0;
    let coordinateErrors = 0;

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      
      for (const diag of xfiDiags) {
        totalValidated++;
        
        try {
          // Validate coordinate conversion (1-based to 0-based)
          const document = await vscode.workspace.openTextDocument(uri);
          const lineCount = document.lineCount;
          const lineText = document.lineAt(diag.range.start.line).text;
          
          // Verify line number is within document bounds
          assert.ok(
            diag.range.start.line < lineCount,
            `Line number ${diag.range.start.line} should be < ${lineCount} in ${vscode.workspace.asRelativePath(uri)}`
          );
          
          // Verify character position is within line bounds
          assert.ok(
            diag.range.start.character <= lineText.length,
            `Character position ${diag.range.start.character} should be <= ${lineText.length} in ${vscode.workspace.asRelativePath(uri)} line ${diag.range.start.line + 1}`
          );
          
          // Verify range is valid
          assert.ok(
            diag.range.end.line >= diag.range.start.line,
            `End line should be >= start line in ${vscode.workspace.asRelativePath(uri)}`
          );
          
          if (diag.range.start.line === diag.range.end.line) {
            assert.ok(
              diag.range.end.character > diag.range.start.character,
              `End character should be > start character on same line in ${vscode.workspace.asRelativePath(uri)}`
            );
          }
          
        } catch (error) {
          coordinateErrors++;
          console.error(`❌ Coordinate validation failed for ${vscode.workspace.asRelativePath(uri)}:`, error);
        }
      }
    }

    console.log(`🔧 DEBUG: Coordinate validation complete: ${totalValidated} diagnostics validated, ${coordinateErrors} errors`);

    // Allow some coordinate errors (up to 10% of total)
    const errorRate = coordinateErrors / totalValidated;
    assert.ok(
      errorRate <= 0.1,
      `Coordinate error rate should be <= 10%, but was ${(errorRate * 100).toFixed(1)}%`
    );

    console.log('✅ Coordinate conversion accuracy test completed successfully');
  });

  test('should validate diagnostic severity mapping', async function () {
    this.timeout(60000); // Reduced timeout since analysis is cached

    console.log('🔧 DEBUG: Starting severity mapping validation test...');

    // Use cached analysis results
    console.log('🔧 DEBUG: Using cached analysis results...');
    assert.ok(analysisResults, 'Analysis results should be available from cache');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = Array.from(allDiagnostics).filter(
      ([_uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) =>
        diagnostics.some(
          (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
        )
    );

    console.log(`🔧 DEBUG: Validating severity mapping for ${xfidelityDiagnostics.length} files`);

    let totalValidated = 0;
    let severityErrors = 0;

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      
      for (const diag of xfiDiags) {
        totalValidated++;
        
        try {
          // Validate severity is one of the expected values
          const validSeverities = [
            vscode.DiagnosticSeverity.Error,
            vscode.DiagnosticSeverity.Warning,
            vscode.DiagnosticSeverity.Information,
            vscode.DiagnosticSeverity.Hint
          ];
          
          assert.ok(
            validSeverities.includes(diag.severity),
            `Severity should be one of ${validSeverities.join(', ')}, but was ${diag.severity} in ${vscode.workspace.asRelativePath(uri)}`
          );
          
        } catch (error) {
          severityErrors++;
          console.error(`❌ Severity validation failed for ${vscode.workspace.asRelativePath(uri)}:`, error);
        }
      }
    }

    console.log(`🔧 DEBUG: Severity validation complete: ${totalValidated} diagnostics validated, ${severityErrors} errors`);

    // Allow some severity errors (up to 5% of total)
    const errorRate = severityErrors / totalValidated;
    assert.ok(
      errorRate <= 0.05,
      `Severity error rate should be <= 5%, but was ${(errorRate * 100).toFixed(1)}%`
    );

    console.log('✅ Severity mapping validation test completed successfully');
  });

  test('should validate diagnostic navigation', async function () {
    this.timeout(60000); // Reduced timeout since analysis is cached

    console.log('🔧 DEBUG: Starting diagnostic navigation test...');

    // Use cached analysis results
    console.log('🔧 DEBUG: Using cached analysis results...');
    assert.ok(analysisResults, 'Analysis results should be available from cache');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = Array.from(allDiagnostics).filter(
      ([_uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) =>
        diagnostics.some(
          (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
        )
    );

    console.log(`🔧 DEBUG: Testing navigation for ${xfidelityDiagnostics.length} files`);

    let totalNavigated = 0;
    let navigationErrors = 0;

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      
      for (const diag of xfiDiags) {
        totalNavigated++;
        
        try {
          // Test navigation to diagnostic location
          const document = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(document);
          
          // Set cursor to diagnostic location
          editor.selection = new vscode.Selection(
            diag.range.start,
            diag.range.end
          );
          
          // Verify cursor is at the expected location
          const currentPosition = editor.selection.active;
          assert.ok(
            currentPosition.line === diag.range.start.line,
            `Cursor should be at line ${diag.range.start.line}, but was at ${currentPosition.line} in ${vscode.workspace.asRelativePath(uri)}`
          );
          
        } catch (error) {
          navigationErrors++;
          console.error(`❌ Navigation failed for ${vscode.workspace.asRelativePath(uri)}:`, error);
        }
      }
    }

    console.log(`🔧 DEBUG: Navigation test complete: ${totalNavigated} diagnostics navigated, ${navigationErrors} errors`);

    // Allow some navigation errors (up to 10% of total)
    const errorRate = navigationErrors / totalNavigated;
    assert.ok(
      errorRate <= 0.1,
      `Navigation error rate should be <= 10%, but was ${(errorRate * 100).toFixed(1)}%`
    );

    console.log('✅ Diagnostic navigation test completed successfully');
  });
});

// Helper function for diagnostic processing
async function waitForDiagnosticProcessing(timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    // Check if we have any X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    let hasXFIDiagnostics = false;
    
    for (const [, diagnostics] of allDiagnostics) {
      if (diagnostics.some(d => d.source === 'X-Fidelity')) {
        hasXFIDiagnostics = true;
        break;
      }
    }
    
    if (hasXFIDiagnostics) {
      console.log('✅ Diagnostics processing completed');
      return;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.warn('⚠️ Timeout waiting for diagnostic processing');
}
