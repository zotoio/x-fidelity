# Subtask: Browser-Compatible Plugin Wrappers

## Metadata
- **Subtask ID**: 02
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-plugin-expert
- **Dependencies**: None
- **Created**: 20260118

## Objective
Create browser-compatible wrappers for the core X-Fidelity plugins (filesystem, ast, dependency, react-patterns) that can execute in a browser environment without Node.js dependencies. These wrappers will enable full rule simulation in the Rule Builder GUI.

## Deliverables Checklist
- [ ] Create browser plugin adapter layer
- [ ] Implement filesystem plugin browser wrapper
  - [ ] Replace `fs` operations with fixture data access
  - [ ] Implement `fileData` fact for browser
  - [ ] Implement `fileContains` operator for browser
- [ ] Implement dependency plugin browser wrapper
  - [ ] Parse bundled package.json fixtures
  - [ ] Implement `repoDependencies` fact for browser
  - [ ] Implement `outdatedFramework` operator for browser
- [ ] Implement AST plugin browser wrapper
  - [ ] Configure web-tree-sitter WASM loading
  - [ ] Implement `astNodes` fact for browser
  - [ ] Implement `functionComplexity` fact for browser
  - [ ] Implement AST operators for browser
- [ ] Implement react-patterns plugin browser wrapper
  - [ ] Leverage AST plugin wrapper
  - [ ] Implement hook analysis facts for browser
- [ ] Create mock ExecutionContext for browser logging
- [ ] Export unified browser plugin registry

## Files to Create
```
website/rule-builder/src/lib/plugins/
├── index.ts                          # Plugin registry export
├── types.ts                          # Browser plugin types
├── browserContext.ts                 # Mock ExecutionContext
├── browserPluginAdapter.ts           # Adapter interface
├── filesystem/
│   ├── index.ts
│   ├── browserFilesystemPlugin.ts    # Main wrapper
│   ├── facts/
│   │   └── fileDataFact.ts
│   └── operators/
│       └── fileContains.ts
├── dependency/
│   ├── index.ts
│   ├── browserDependencyPlugin.ts
│   ├── facts/
│   │   └── repoDependenciesFact.ts
│   └── operators/
│       └── outdatedFramework.ts
├── ast/
│   ├── index.ts
│   ├── browserAstPlugin.ts
│   ├── wasmLoader.ts                 # Tree-sitter WASM initialization
│   ├── facts/
│   │   ├── astNodesFact.ts
│   │   └── functionComplexityFact.ts
│   └── operators/
│       └── astComplexity.ts
└── react-patterns/
    ├── index.ts
    ├── browserReactPatternsPlugin.ts
    └── facts/
        ├── hookDependencyFact.ts
        └── effectCleanupFact.ts
```

## Definition of Done
- [ ] All four plugin wrappers compile without errors
- [ ] Plugins can be imported in browser environment
- [ ] web-tree-sitter WASM loads successfully in browser
- [ ] Facts return expected data structures
- [ ] Operators perform correct comparisons
- [ ] Mock ExecutionContext provides console logging
- [ ] No Node.js-specific imports remain in browser code
- [ ] TypeScript types match original plugin interfaces

## Implementation Notes

### Browser Plugin Interface
```typescript
interface BrowserPlugin {
  name: string;
  facts: Map<string, BrowserFact>;
  operators: Map<string, BrowserOperator>;
  initialize(fixtures: FixtureData): Promise<void>;
}

interface BrowserFact {
  name: string;
  calculate(params: any, almanac: BrowserAlmanac): Promise<any>;
}

interface BrowserOperator {
  name: string;
  evaluate(factValue: any, compareValue: any): boolean;
}
```

### WASM Loading Strategy
```typescript
// wasmLoader.ts
import Parser from 'web-tree-sitter';

let initialized = false;

export async function initTreeSitter(): Promise<typeof Parser> {
  if (!initialized) {
    await Parser.init({
      locateFile: (file: string) => `/x-fidelity/rule-builder/wasm/${file}`,
    });
    initialized = true;
  }
  return Parser;
}
```

### Fixture Data Interface
```typescript
interface FixtureData {
  files: Map<string, string>;           // fileName -> content
  packageJson: Record<string, any>;     // Parsed package.json
  fileList: string[];                   // All file paths
}
```

### Key Differences from Node.js Plugins
1. No `fs` module - use pre-loaded fixture data
2. No `path` module for resolution - use simple string operations
3. Synchronous-only tree-sitter operations (WASM is async init only)
4. Simplified logging via console instead of ExecutionContext

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create unit tests in `website/rule-builder/src/lib/plugins/__tests__/`
- Test each plugin wrapper in isolation
- Mock fixture data for tests
- Defer integration testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
