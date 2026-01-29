# Topic: Test Organization and Patterns

## Fact: Test File Co-location Strategy
### Modified: 2026-01-29
### Priority: H

X-Fidelity follows a co-location strategy for test files where tests are placed adjacent to the source files they test:

- **Unit tests**: Named `*.test.ts` or `*.unit.test.ts`, located in the same directory as source files
- **Integration tests**: Named `*.integration.test.ts`, may be in dedicated directories

Example structure in `x-fidelity-core`:
```
src/
├── utils/
│   ├── loggerProvider.ts
│   ├── loggerProvider.test.ts
│   ├── configLoader.ts
│   └── configLoader.test.ts
├── engine/
│   ├── analyzer.ts
│   └── analyzer.test.ts
```

VSCode extension uses a dedicated test hierarchy:
```
src/
├── test/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── mocks/          # Mock implementations
│   └── setup/          # Jest setup files
```

### References
1. [Core package structure](../../packages/x-fidelity-core/src/)
2. [VSCode test structure](../../packages/x-fidelity-vscode/src/test/)

---

## Fact: Shared Test Utilities in test-utils Directory
### Modified: 2026-01-29
### Priority: H

The `packages/x-fidelity-core/src/test-utils/` directory provides reusable mock patterns:

**mockCore.ts** - Core module mock factory:
```typescript
export const createCoreMock = () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), ... },
  options: { dir: '/mock/dir', archetype: 'node-fullstack', mode: 'client' },
  safeStringify: jest.fn().mockImplementation(obj => JSON.stringify(obj)),
  analyzeCodebase: jest.fn().mockResolvedValue({ XFI_RESULT: { totalIssues: 0, ... } }),
  pluginRegistry: { registerPlugin: jest.fn(), getPluginFacts: jest.fn().mockReturnValue([]) }
});
```

**Helper factories**:
- `createExpressMocks()` - Mock request/response for Express handlers
- `createGitHubWebhookMocks()` - Mock GitHub webhook payloads with HMAC signatures
- `createMockAlmanac()` - Mock json-rules-engine almanac for fact testing
- `createMockEngine()` - Mock rules engine for rule testing

### References
1. [mockCore.ts](../../packages/x-fidelity-core/src/test-utils/mockCore.ts)
2. [test-utils index](../../packages/x-fidelity-core/src/test-utils/index.ts)

---

## Fact: VSCode API Mocking Pattern
### Modified: 2026-01-29
### Priority: H

The VSCode extension uses a comprehensive mock at `src/test/mocks/vscode.mock.ts` that replaces the `vscode` module entirely. Key components:

**Mock Classes**: `Uri`, `Range`, `Position`, `Diagnostic`, `DiagnosticSeverity`

**Mock Namespaces**:
- `window` - Output channels, tree views, status bar, message dialogs
- `workspace` - Configuration, workspace folders, file events
- `commands` - Command registration and execution
- `languages` - Diagnostic collections

**Configuration Mock with State**:
```typescript
const mockConfigStore = {
  archetype: 'node-fullstack',
  configServer: '',
  // ... all extension settings with defaults
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: (key) => mockConfigStore[key],
    update: async (key, value) => { mockConfigStore[key] = value; }
  }))
};

export const resetMockConfigStore = () => { /* restore defaults */ };
```

Jest maps the module: `'^vscode$': '<rootDir>/src/test/mocks/vscode.mock.ts'`

### References
1. [vscode.mock.ts](../../packages/x-fidelity-vscode/src/test/mocks/vscode.mock.ts)
2. [VSCode jest.config.js](../../packages/x-fidelity-vscode/jest.config.js)

---

## Fact: Test Fixtures Workspace for Integration Testing
### Modified: 2026-01-29
### Priority: M

The `packages/x-fidelity-fixtures/node-fullstack` directory serves as the standard test workspace for integration testing across packages. It provides:

- A realistic project structure for analysis
- Known file patterns for rule testing
- Package.json with testable dependencies
- Source files with various patterns (React, TypeScript, etc.)

This fixture is used by:
- VSCode extension integration tests
- CLI end-to-end tests
- Consistency testing between CLI and extension

Test files reference it via relative paths:
```typescript
const fixturesPath = path.join(__dirname, '../../../../x-fidelity-fixtures/node-fullstack');
```

### References
1. [Fixtures package](../../packages/x-fidelity-fixtures/)
2. [node-fullstack fixture](../../packages/x-fidelity-fixtures/node-fullstack/)
