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
- [ ] Install and configure Zustand
- [ ] Create rule state store with:
  - [ ] Current rule JSON state
  - [ ] Selected node path
  - [ ] Validation state
  - [ ] Dirty/saved state
- [ ] Implement JSON Schema validation
- [ ] Create update actions that prevent infinite loops
- [ ] Implement undo/redo history
- [ ] Create derived selectors for:
  - [ ] Tree structure from JSON
  - [ ] Current node data from path
  - [ ] Validation errors
- [ ] Add debouncing for expensive operations

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
- [ ] Zustand store initializes correctly
- [ ] Rule JSON can be updated from any source
- [ ] Tree selection updates form panel
- [ ] Form changes update JSON
- [ ] JSON editor changes update tree/form
- [ ] No infinite update loops occur
- [ ] Validation runs on every change
- [ ] Undo/redo works correctly
- [ ] TypeScript types are complete

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
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
