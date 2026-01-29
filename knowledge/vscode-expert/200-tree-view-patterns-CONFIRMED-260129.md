# Topic: Tree View Patterns

## Fact: IssuesTreeProvider Uses Virtual Tree Nodes for Performance
### Modified: 2026-01-29
### Priority: H

The `IssuesTreeProvider` implements `vscode.TreeDataProvider<IssueTreeItem>` with a virtual tree pattern for efficient rendering of large issue sets.

**Virtual Tree Architecture:**
- `virtualTree: VirtualTreeNode[]` - Root-level nodes
- `nodeMap: Map<string, VirtualTreeNode>` - Fast node lookup by ID
- Each node tracks: `parent`, `children`, `visible`, `expanded`, and `data` (IssueTreeItem)

**Grouping Modes** (controlled by `GroupingMode` type):
- `severity` - Groups by error/warning/info/hint/exempt/unhandled
- `rule` - Groups by rule ID
- `file` - Groups by file path (shows basename, dirname as description)
- `category` - Groups by issue category

**Performance Optimizations:**
- Debounced updates (100ms `UPDATE_DEBOUNCE_MS`)
- Early exit if issues haven't changed (`setIssues()` compares IDs)
- Tree rebuild only on actual changes

### References
1. [issuesTreeProvider.ts](../../packages/x-fidelity-vscode/src/ui/treeView/issuesTreeProvider.ts) - Lines 32-676

---

## Fact: IssuesTreeViewManager Bridges Provider and VSCode TreeView
### Modified: 2026-01-29
### Priority: H

The `IssuesTreeViewManager` class manages the tree view lifecycle and coordinates between the `IssuesTreeProvider` and VSCode's `TreeView` API.

**Key Responsibilities:**
1. **TreeView Creation**: Creates `vscode.TreeView` with `showCollapseAll: true`
2. **Event Handling**: Listens for selection changes, visibility changes, config changes
3. **Diagnostic Sync**: Subscribes to `diagnosticProvider.onDidDiagnosticsUpdate` for automatic refresh
4. **Navigation**: `goToIssue()` opens file and navigates to issue location with highlighting

**Direct Update Pattern** (`updateFromProcessedResult()`):
The `ResultCoordinator` can push pre-processed results directly to avoid event-based timing issues. This ensures consistent issue counts between diagnostics and tree view.

**Static Active Instance Pattern:**
```typescript
private static activeInstance: IssuesTreeViewManager | null = null;
```
Commands delegate to `activeInstance` to find the current tree view.

### References
1. [issuesTreeViewManager.ts](../../packages/x-fidelity-vscode/src/ui/treeView/issuesTreeViewManager.ts) - Lines 17-790

---

## Fact: Rich Tooltips with Interactive Command Links
### Modified: 2026-01-29
### Priority: M

Tree item tooltips use `vscode.MarkdownString` with HTML support and trusted command URIs to provide interactive quick actions.

**Tooltip Structure:**
1. **Header**: Severity emoji + rule ID
2. **Message**: Issue description with scope indicator
3. **Details**: File location, severity, category
4. **Enhanced Details**: Type-specific info (dependency versions, complexity metrics)
5. **Actions**: Clickable command links for Explain/Fix/Navigate
6. **Footer**: Tip about hover persistence

**Command Link Pattern:**
```typescript
markdown.appendMarkdown(
  `[🤔 Explain Issue](command:xfidelity.explainIssue?${encodeURIComponent(JSON.stringify(issueContext))})`
);
```

The `markdown.isTrusted = true` and `markdown.supportHtml = true` settings enable command execution from tooltip links.

### References
1. [issuesTreeProvider.ts](../../packages/x-fidelity-vscode/src/ui/treeView/issuesTreeProvider.ts) - Lines 355-490

---

## Fact: ControlCenterTreeViewManager Manages Session State
### Modified: 2026-01-29
### Priority: M

The `ControlCenterTreeViewManager` provides a separate tree view for extension settings and actions. It manages session-level state for diagnostics and autorun toggles.

**Session State Features:**
- `toggleSessionActive()` - Combines diagnostics and autorun toggle
- `isSessionActive()` - Returns whether both are enabled
- `onStateChanged` event - Notifies of toggle changes

**Key Methods (with deprecation notices):**
- `toggleDiagnostics()` - Deprecated, use `toggleSessionActive()`
- `toggleAutorun()` - Deprecated, use `toggleSessionActive()`

The session state is in-memory only, resetting to active on IDE restart.

### References
1. [controlCenterTreeViewManager.ts](../../packages/x-fidelity-vscode/src/ui/treeView/controlCenterTreeViewManager.ts) - Lines 13-155
