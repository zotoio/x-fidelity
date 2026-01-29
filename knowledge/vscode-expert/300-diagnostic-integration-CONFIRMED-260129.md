# Topic: Diagnostic Integration

## Fact: DiagnosticProvider Converts XFI Results to VSCode Problems Panel
### Modified: 2026-01-29
### Priority: H

The `DiagnosticProvider` class is responsible for converting X-Fidelity analysis results into VSCode's native `Diagnostic` objects that appear in the Problems panel.

**Key Conversion Steps:**
1. **Extract Issues**: `extractIssuesFromResult()` validates `ResultMetadata.XFI_RESULT` structure
2. **Location Extraction**: Uses `DiagnosticLocationExtractor` for precise line/column from rule failures
3. **Coordinate Conversion**: XFI uses 1-based; VSCode uses 0-based coordinates
4. **Range Validation**: `validateRange()` ensures valid ranges that don't exceed line boundaries
5. **Severity Mapping**: Maps XFI levels (error/warning/fatality/info) to VSCode severities
6. **File Resolution**: `FileSourceTranslator.resolveFileUri()` handles `REPO_GLOBAL_CHECK` translation

**Diagnostic Metadata Storage:**
Each diagnostic stores comprehensive metadata in `(diagnostic as any).xfidelity` for command providers:
- `ruleId`, `issueId`, `category`
- `filePath`, `line`, `column`, `endLine`, `endColumn`
- `fixable`, `exempted`, `originalLevel`
- `documentation`, `ruleDocUrl`, `suggestedFix`
- `originalData` for advanced providers

### References
1. [diagnosticProvider.ts](../../packages/x-fidelity-vscode/src/diagnostics/diagnosticProvider.ts) - Lines 60-1014

---

## Fact: XFI_RESULT Structure Validation is Comprehensive
### Modified: 2026-01-29
### Priority: H

The `DiagnosticProvider` performs thorough validation of the `XFI_RESULT` structure before processing issues.

**Required Fields Validated:**
- `archetype`, `repoPath`, `repoUrl`, `xfiVersion`
- `fileCount`, `totalIssues`, `warningCount`, `errorCount`, `fatalityCount`, `exemptCount`
- `startTime`, `finishTime`, `startTimeString`, `finishTimeString`, `durationSeconds`
- `issueDetails` (must be an array of `ScanResult` objects)

**ScanResult Structure:**
```typescript
interface ScanResult {
  filePath: string;
  errors: RuleFailure[];
}
```

**RuleFailure Structure:**
```typescript
interface RuleFailure {
  ruleFailure: string;  // Rule ID
  level?: string;       // Severity level
  details?: {
    message?: string;
    // ... additional rule-specific data
  };
}
```

### References
1. [diagnosticProvider.ts](../../packages/x-fidelity-vscode/src/diagnostics/diagnosticProvider.ts) - Lines 517-656

---

## Fact: Code Action Provider Enables Lightbulb Quick Fixes
### Modified: 2026-01-29
### Priority: M

The `XFidelityCodeActionProvider` implements `vscode.CodeActionProvider` to show quick fix actions in the lightbulb menu when the cursor is on an X-Fidelity diagnostic.

**Actions Provided:**
1. **Explain Issue** - Always available; calls `xfidelity.explainIssue` command
2. **Fix Issue** - Only if `xfidelity.fixable === true`; calls `xfidelity.fixIssue` command (marked as preferred)
3. **View Documentation** - Only if `xfidelity.ruleDocUrl` exists; opens external URL

**Registration:**
```typescript
vscode.languages.registerCodeActionsProvider(
  { scheme: 'file' },
  codeActionProvider,
  { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
);
```

The provider filters `context.diagnostics` to only process those with `source === 'X-Fidelity'`.

### References
1. [codeActionProvider.ts](../../packages/x-fidelity-vscode/src/diagnostics/codeActionProvider.ts) - Lines 1-105

---

## Fact: Diagnostic Validation Methods Ensure Accuracy
### Modified: 2026-01-29
### Priority: M

The `DiagnosticProvider` includes comprehensive validation methods to ensure 100% accuracy in Problems panel population.

**Validation Methods:**
1. **`validateDiagnosticCoordinates()`** - Checks all coordinates are 0-based, non-negative, and ranges are consistent
2. **`validateDiagnosticNavigation()`** - Verifies files exist and line/column are within document bounds
3. **`validateSeverityMapping()`** - Validates severity distribution matches expected counts
4. **`validateProblemsPanel()`** - Confirms diagnostics are registered with VSCode's global diagnostics

**Comprehensive Validation:**
```typescript
const result = await diagnosticProvider.runComprehensiveValidation({
  errors: expectedErrorCount,
  warnings: expectedWarningCount,
  info: expectedInfoCount
});
```

Returns detailed `{ isValid, coordinateValidation, navigationValidation, severityValidation, problemsPanelValidation, summary }`.

### References
1. [diagnosticProvider.ts](../../packages/x-fidelity-vscode/src/diagnostics/diagnosticProvider.ts) - Lines 1600-1986
