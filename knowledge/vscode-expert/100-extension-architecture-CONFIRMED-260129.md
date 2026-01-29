# Topic: Extension Architecture

## Fact: ExtensionManager Is the Central Coordinator
### Modified: 2026-01-29
### Priority: H

The `ExtensionManager` class serves as the main coordinator for the X-Fidelity VSCode extension. It initializes all core components in a specific order and manages their lifecycle through the `vscode.Disposable` interface.

**Initialization Order (Critical):**
1. **LoggerProvider** - Universal logging must be initialized first
2. **ConfigManager** - Configuration management
3. **DiagnosticProvider** - Problems panel integration
4. **CLIAnalysisManager** - Analysis workflow via embedded CLI
5. **StatusBarProvider** - Status bar item management
6. **IssuesTreeViewManager** - Sidebar tree view for issues
7. **ControlCenterTreeViewManager** - Settings/actions panel
8. **CommandDelegationRegistry** - Issue explain/fix command routing
9. **ResultCoordinator** - Analysis result distribution

After initialization, the constructor calls:
- `setupEventListeners()` - Wire up component communication
- `registerCommands()` - Register 40+ VSCode commands
- `registerCodeActionProvider()` - Quick fix lightbulb menu
- `scheduleStartupAnalysis()` - Run analysis on activation
- `setupAutomationFeatures()` - File save watching, periodic analysis

### References
1. [extensionManager.ts](../../packages/x-fidelity-vscode/src/core/extensionManager.ts) - Lines 49-130

---

## Fact: Extension Entry Point Handles macOS Safe Mode
### Modified: 2026-01-29
### Priority: M

The `extension.ts` entry point implements robust activation with special handling for macOS native module issues. If file descriptor errors occur during initialization on macOS, the extension retries in "safe mode" with native features disabled.

**Key Functions:**
- `activate(context)` - Called when extension activates; creates ExtensionManager
- `deactivate()` - Cleans up ExtensionManager on deactivation
- `isExtensionReady()` - Returns true when extension is fully activated

**Performance Tracking:**
- Activation time is measured with `performance.now()`
- Slow activations (>30s) are logged as warnings
- Development mode shows activation time in notification

### References
1. [extension.ts](../../packages/x-fidelity-vscode/src/extension.ts) - Lines 17-153

---

## Fact: CLIAnalysisManager Spawns Embedded CLI for Analysis
### Modified: 2026-01-29
### Priority: H

The `CLIAnalysisManager` class runs analysis by spawning the embedded X-Fidelity CLI with `--mode vscode` for clean output. This architecture ensures CLI-Extension consistency and avoids duplicating analysis logic.

**Key Capabilities:**
- **State Machine**: Tracks `idle | analyzing | complete | error` states
- **Concurrent Execution Prevention**: Uses `isAnalysing` flag and `AnalysisResultCache.isAnalysisRunning()`
- **Cancellation**: Supports `vscode.CancellationToken` for user-initiated cancellation
- **Cache Management**: Clears cache before each analysis for fresh results
- **Trigger Sources**: Tracks whether analysis is `manual`, `automatic`, `periodic`, or `file-save`

**Events Emitted:**
- `onStateChanged` - State transitions
- `onComplete` - Analysis results ready (fires ResultCoordinator distribution)

**Side Panel Opening**: For manual analysis triggers, the X-Fidelity sidebar is automatically opened after completion.

### References
1. [cliAnalysisManager.ts](../../packages/x-fidelity-vscode/src/analysis/cliAnalysisManager.ts) - Lines 18-486

---

## Fact: Command Registration Pattern with Global Deduplication
### Modified: 2026-01-29
### Priority: M

The extension registers 40+ commands via `vscode.commands.registerCommand()`. Tree view managers use a **static registration pattern** to prevent duplicate registration when multiple instances exist.

**Pattern Used:**
```typescript
private static commandsRegistered = false;
private static globalDisposables: vscode.Disposable[] = [];

private registerCommands(): void {
  if (!IssuesTreeViewManager.commandsRegistered) {
    IssuesTreeViewManager.commandsRegistered = true;
    // Register commands to globalDisposables
  }
}
```

**Key Commands:**
- `xfidelity.runAnalysis` - Manual analysis trigger
- `xfidelity.toggleSession` - Pause/resume diagnostics and autorun
- `xfidelity.explainIssue` / `xfidelity.fixIssue` - AI-powered issue handling
- `xfidelity.goToIssue` - Navigate to issue location
- `xfidelity.refreshIssuesTree` - Force tree view refresh

### References
1. [extensionManager.ts](../../packages/x-fidelity-vscode/src/core/extensionManager.ts) - Lines 206-968
2. [issuesTreeViewManager.ts](../../packages/x-fidelity-vscode/src/ui/treeView/issuesTreeViewManager.ts) - Lines 83-203
