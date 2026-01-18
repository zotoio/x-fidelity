# Subtask: Comprehensive Testing

## Metadata
- **Subtask ID**: 11
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-testing-expert
- **Dependencies**: 05, 06, 07, 08, 09, 10 (All UI components)
- **Created**: 20260118

## Objective
Create comprehensive test coverage for the Rule Builder GUI, including unit tests, integration tests, and end-to-end tests. Ensure all components work correctly individually and together.

## Deliverables Checklist
- [ ] Set up testing infrastructure in rule-builder SPA:
  - [ ] Jest + React Testing Library
  - [ ] Test utilities and helpers
  - [ ] Mock providers for Zustand store
- [ ] Create unit tests for:
  - [ ] State management (store, selectors, actions)
  - [ ] Validation logic
  - [ ] Template search/filter
  - [ ] Simulation engine
- [ ] Create component tests for:
  - [ ] RuleTree navigation and selection
  - [ ] RuleForm field editing
  - [ ] JsonEditor sync behavior
  - [ ] TemplateLibrary browsing
  - [ ] SimulationPanel results display
- [ ] Create integration tests for:
  - [ ] Bidirectional sync between all panels
  - [ ] Template loading workflow
  - [ ] Simulation end-to-end flow
- [ ] Add accessibility tests (axe-core)
- [ ] Configure coverage thresholds
- [ ] Update package.json test scripts

## Files to Create
```
website/rule-builder/
├── jest.config.js
├── jest.setup.js
├── src/
│   ├── test-utils/
│   │   ├── index.ts                  # Re-export all utilities
│   │   ├── renderWithProviders.tsx   # Wrapper with store
│   │   ├── mockStore.ts              # Pre-configured mock stores
│   │   ├── mockPlugins.ts            # Mock browser plugins
│   │   └── mockFixtures.ts           # Mock fixture data
│   ├── store/__tests__/
│   │   ├── ruleStore.test.ts
│   │   ├── selectors.test.ts
│   │   └── historyMiddleware.test.ts
│   ├── components/
│   │   ├── RuleTree/__tests__/
│   │   │   ├── RuleTree.test.tsx
│   │   │   └── TreeNode.test.tsx
│   │   ├── RuleForm/__tests__/
│   │   │   ├── ConditionForm.test.tsx
│   │   │   └── FactSelector.test.tsx
│   │   ├── JsonEditor/__tests__/
│   │   │   └── JsonEditor.test.tsx
│   │   ├── TemplateLibrary/__tests__/
│   │   │   └── TemplateLibrary.test.tsx
│   │   └── SimulationPanel/__tests__/
│   │       └── SimulationPanel.test.tsx
│   ├── lib/
│   │   ├── simulation/__tests__/
│   │   │   └── simulationEngine.test.ts
│   │   ├── validation/__tests__/
│   │   │   └── validator.test.ts
│   │   └── plugins/__tests__/
│   │       └── browserPlugins.test.ts
│   └── integration/__tests__/
│       ├── bidirectionalSync.test.tsx
│       ├── templateWorkflow.test.tsx
│       └── simulationFlow.test.tsx
```

## Definition of Done
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage ≥ 80% for core logic
- [ ] No accessibility violations (axe-core)
- [ ] Tests run in CI (via yarn test)
- [ ] Coverage report generated
- [ ] Mock utilities documented

## Implementation Notes

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-utils/**',
  ],
};
```

### Test Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock Monaco Editor (complex to test)
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <textarea
      data-testid="mock-monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});
```

### Render with Providers
```typescript
// test-utils/renderWithProviders.tsx
import { render } from '@testing-library/react';
import { RuleStoreProvider } from '../store';

export function renderWithProviders(
  ui: React.ReactElement,
  { initialState = {}, ...options } = {}
) {
  return render(
    <RuleStoreProvider initialState={initialState}>
      {ui}
    </RuleStoreProvider>,
    options
  );
}
```

### Key Test Scenarios

#### Bidirectional Sync Test
```typescript
// integration/__tests__/bidirectionalSync.test.tsx
describe('Bidirectional Sync', () => {
  it('updates form when tree selection changes', async () => {
    const { getByTestId } = renderWithProviders(<App />, {
      initialState: { rule: sampleRule },
    });
    
    // Click on condition in tree
    fireEvent.click(getByTestId('tree-node-conditions-0'));
    
    // Verify form shows correct fact
    expect(getByTestId('fact-selector')).toHaveValue('fileData');
  });
  
  it('updates tree when JSON is edited', async () => {
    const { getByTestId } = renderWithProviders(<App />, {
      initialState: { rule: sampleRule },
    });
    
    // Edit JSON in Monaco (mocked)
    const editor = getByTestId('mock-monaco-editor');
    fireEvent.change(editor, {
      target: { value: JSON.stringify(modifiedRule) },
    });
    
    // Wait for debounce
    await waitFor(() => {
      expect(getByTestId('tree-node-root')).toHaveTextContent(modifiedRule.name);
    });
  });
  
  it('does not create infinite update loop', async () => {
    const updateSpy = jest.spyOn(console, 'log');
    const { getByTestId } = renderWithProviders(<App />);
    
    // Trigger update
    fireEvent.change(getByTestId('rule-name-input'), {
      target: { value: 'new-name' },
    });
    
    await waitFor(() => {
      // Should settle within reasonable number of updates
      expect(updateSpy).toHaveBeenCalledTimes(expect.any(Number));
      expect(updateSpy.mock.calls.length).toBeLessThan(10);
    });
  });
});
```

#### Template Workflow Test
```typescript
describe('Template Workflow', () => {
  it('loads template and populates editor', async () => {
    const { getByTestId, getByText } = renderWithProviders(<App />);
    
    // Open template library
    fireEvent.click(getByText('Templates'));
    
    // Select a template
    fireEvent.click(getByText('Hello World'));
    fireEvent.click(getByText('Use Template'));
    
    // Verify rule is loaded
    expect(getByTestId('rule-name-input')).toHaveValue('hello-world-iterative');
  });
});
```

#### Accessibility Test
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Testing Strategy
**Note**: This subtask IS the testing phase. Run tests only within the rule-builder directory:
```bash
cd website/rule-builder && yarn test
```

Do NOT run global `yarn test` from workspace root during this subtask.

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
