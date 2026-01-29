# Subtask: Bidirectional State Management

## Metadata
- **Subtask ID**: 04
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: 01 (SPA Scaffold)
- **Created**: 20260118

## Objective
Implement the core state management system using Zustand that enables bidirectional synchronization between the rule tree, form editor, and JSON editor. Changes in any panel should reflect in the others in real-time without causing infinite update loops.

## Deliverables Checklist
- [x] Install and configure Zustand
- [x] Create rule state store with:
  - [x] Current rule JSON state
  - [x] Selected node path
  - [x] Validation state
  - [x] Dirty/saved state
- [x] Implement JSON Schema validation
- [x] Create update actions that prevent infinite loops
- [x] Implement undo/redo history
- [x] Create derived selectors for:
  - [x] Tree structure from JSON
  - [x] Current node data from path
  - [x] Validation errors
- [x] Add debouncing for expensive operations

## Files to Create
```
website/rule-builder/src/
├── store/
│   ├── index.ts                      # Store exports
│   ├── ruleStore.ts                  # Main rule state
│   ├── selectors.ts                  # Derived state selectors
│   ├── actions.ts                    # State update actions
│   └── middleware/
│       ├── validationMiddleware.ts   # JSON Schema validation
│       └── historyMiddleware.ts      # Undo/redo support
├── hooks/
│   ├── useRuleState.ts               # Main hook for components
│   ├── useSelectedNode.ts            # Current selection hook
│   ├── useValidation.ts              # Validation state hook
│   └── useHistory.ts                 # Undo/redo hook
├── lib/
│   └── validation/
│       ├── ruleSchema.ts             # JSON Schema for rules
│       └── validator.ts              # Ajv validator setup
```

## Definition of Done
- [x] Zustand store initializes correctly
- [x] Rule JSON can be updated from any source
- [x] Tree selection updates form panel
- [x] Form changes update JSON
- [x] JSON editor changes update tree/form
- [x] No infinite update loops occur
- [x] Validation runs on every change
- [x] Undo/redo works correctly
- [x] TypeScript types are complete

## Implementation Notes

### Store Structure
```typescript
interface RuleStore {
  // State
  rule: RuleDefinition | null;
  selectedPath: string[];           // Path to selected node
  validationErrors: ValidationError[];
  isDirty: boolean;
  
  // History
  history: RuleDefinition[];
  historyIndex: number;
  
  // Actions
  setRule: (rule: RuleDefinition) => void;
  updateNode: (path: string[], value: any) => void;
  selectNode: (path: string[]) => void;
  addCondition: (parentPath: string[], type: 'all' | 'any') => void;
  removeNode: (path: string[]) => void;
  undo: () => void;
  redo: () => void;
  
  // Computed (via selectors)
  getSelectedNode: () => any;
  getTreeStructure: () => TreeNode[];
}
```

### Preventing Infinite Loops
```typescript
// Use source tracking to prevent loops
type UpdateSource = 'tree' | 'form' | 'json' | 'external';

const useRuleState = create<RuleStore>((set, get) => ({
  updateNode: (path, value, source) => {
    set(state => {
      // Only update if value actually changed
      const current = getNodeAtPath(state.rule, path);
      if (deepEqual(current, value)) return state;
      
      return {
        ...state,
        rule: setNodeAtPath(state.rule, path, value),
        lastUpdateSource: source,
      };
    });
  },
}));
```

### JSON Schema for Rules
```typescript
// Based on json-rules-engine schema
const ruleSchema = {
  type: 'object',
  required: ['name', 'conditions', 'event'],
  properties: {
    name: { type: 'string', pattern: '^[a-z]+-[a-z]+$' },
    conditions: {
      type: 'object',
      properties: {
        all: { type: 'array', items: { $ref: '#/$defs/condition' } },
        any: { type: 'array', items: { $ref: '#/$defs/condition' } },
        not: { $ref: '#/$defs/condition' },
      },
    },
    event: {
      type: 'object',
      required: ['type', 'params'],
      properties: {
        type: { enum: ['warning', 'fatality'] },
        params: { type: 'object' },
      },
    },
  },
};
```

### Debouncing Strategy
- Tree selection: immediate
- Form field changes: 100ms debounce
- JSON editor typing: 300ms debounce
- Validation: 200ms debounce after any change

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create unit tests in `website/rule-builder/src/store/__tests__/`
- Test store actions in isolation
- Test selectors with mock state
- Verify no infinite loops with integration test
- Defer comprehensive testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: xfi-engineer
- Started: 2026-01-18T21:00:00Z
- Completed: 2026-01-18T21:07:00Z

### Work Log
1. Installed dependencies: zustand, ajv, ajv-formats, immer
2. Created validation schema (`ruleSchema.ts`) for json-rules-engine format
3. Created Ajv validator (`validator.ts`) with detailed error formatting
4. Created path utilities (`pathUtils.ts`) for navigating/modifying nested structures
5. Created debounce utilities (`debounce.ts`) with configurable delays for different operations
6. Created history middleware (`historyMiddleware.ts`) for undo/redo with max 50 states
7. Created validation middleware (`validationMiddleware.ts`) with debounced validation
8. Created main Zustand store (`ruleStore.ts`) with:
   - Bidirectional sync support via source tracking (`UpdateSource`)
   - Immer integration for immutable updates
   - MapSet plugin for Set operations (expandedPaths)
   - subscribeWithSelector for reactive updates
9. Created selectors (`selectors.ts`) for derived state including tree structure from JSON
10. Created action helpers (`actions.ts`) for convenience operations
11. Created custom hooks:
    - `useRuleState` - Main hook for rule state access
    - `useSelectedNode` - Current selection management
    - `useValidation` - Validation state and error checking
    - `useHistory` - Undo/redo with keyboard shortcuts (Cmd/Ctrl+Z/Y)
12. Added vitest testing infrastructure with 64 passing tests
13. Fixed immer compatibility issues with structuredClone and MapSet

### Key Implementation Decisions
- Used JSON.parse/stringify for deep cloning instead of structuredClone (immer compatibility)
- Enabled immer MapSet plugin for Set operations in expandedPaths
- Source tracking ('tree' | 'form' | 'json' | 'external' | 'history') prevents infinite loops
- Debounce delays: Tree=0ms, Form=100ms, JSON=300ms, Validation=200ms
- History limited to 50 states to prevent memory issues

### Blockers Encountered
- structuredClone failed with immer draft objects - resolved by using JSON serialization
- immer required MapSet plugin for Set operations - added enableMapSet() call
- loadRule was setting isDirty=true via pushHistory - fixed by initializing history inline

### Files Modified/Created
**New Files:**
- `website/rule-builder/src/lib/validation/ruleSchema.ts`
- `website/rule-builder/src/lib/validation/validator.ts`
- `website/rule-builder/src/lib/validation/index.ts`
- `website/rule-builder/src/lib/utils/pathUtils.ts`
- `website/rule-builder/src/lib/utils/debounce.ts`
- `website/rule-builder/src/lib/utils/index.ts`
- `website/rule-builder/src/store/ruleStore.ts`
- `website/rule-builder/src/store/selectors.ts`
- `website/rule-builder/src/store/actions.ts`
- `website/rule-builder/src/store/index.ts`
- `website/rule-builder/src/store/middleware/historyMiddleware.ts`
- `website/rule-builder/src/store/middleware/validationMiddleware.ts`
- `website/rule-builder/src/hooks/useRuleState.ts`
- `website/rule-builder/src/hooks/useSelectedNode.ts`
- `website/rule-builder/src/hooks/useValidation.ts`
- `website/rule-builder/src/hooks/useHistory.ts`
- `website/rule-builder/src/hooks/index.ts`
- `website/rule-builder/src/store/__tests__/ruleStore.test.ts`
- `website/rule-builder/src/store/__tests__/selectors.test.ts`
- `website/rule-builder/src/store/__tests__/pathUtils.test.ts`
- `website/rule-builder/vitest.config.ts`
- `website/rule-builder/vitest.setup.ts`

**Modified Files:**
- `website/rule-builder/package.json` - Added dependencies and test scripts

### Test Results
- 64 tests passing across 3 test files
- TypeScript type check passing
- Build successful (207KB bundle)
