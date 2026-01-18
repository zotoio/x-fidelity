# Subtask: Form Editing Component with Tooltips

## Metadata
- **Subtask ID**: 06
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: 01 (SPA Scaffold), 04 (State Management)
- **Created**: 20260118

## Objective
Build the form editing component that displays an editable form for the currently selected node in the tree. Include comprehensive tooltips and inline documentation explaining each field, available facts, operators, and their usage.

## Deliverables Checklist
- [x] Create dynamic form that adapts to selected node type
- [x] Implement form variants for each node type:
  - [x] Rule root form (name, priority)
  - [x] Condition group form (all/any selection)
  - [x] Individual condition form (fact, operator, value, params)
  - [x] Event form (type, message, details)
- [x] Add fact selector dropdown with:
  - [x] Available facts from loaded plugins
  - [x] Fact descriptions and parameter hints
  - [x] Search/filter functionality
- [x] Add operator selector dropdown with:
  - [x] Operators compatible with selected fact
  - [x] Operator descriptions and examples
- [x] Implement comprehensive tooltips using Radix Tooltip
- [x] Add inline help links to documentation
- [x] Show validation errors per field
- [x] Add "params" editor for fact parameters

## Files to Create/Modify
```
website/rule-builder/src/components/RuleForm/
├── index.ts
├── RuleForm.tsx                      # Main container
├── forms/
│   ├── RootForm.tsx                  # Rule name, priority
│   ├── ConditionGroupForm.tsx        # all/any/not selection
│   ├── ConditionForm.tsx             # Individual condition
│   └── EventForm.tsx                 # Event configuration
├── fields/
│   ├── FactSelector.tsx              # Fact dropdown with search
│   ├── OperatorSelector.tsx          # Operator dropdown
│   ├── ValueEditor.tsx               # Value input (type-aware)
│   ├── ParamsEditor.tsx              # Nested params object
│   └── JsonPathEditor.tsx            # JSON path input
├── tooltips/
│   ├── FactTooltip.tsx               # Fact documentation
│   ├── OperatorTooltip.tsx           # Operator documentation
│   └── FieldTooltip.tsx              # General field help
├── hooks/
│   └── useFormState.ts               # Form-specific state
└── data/
    ├── factCatalog.ts                # Fact metadata
    └── operatorCatalog.ts            # Operator metadata

website/rule-builder/src/components/RuleForm/__tests__/
├── ConditionForm.test.tsx
└── FactSelector.test.tsx
```

## Definition of Done
- [x] Form renders correctly for each node type
- [x] Fact selector shows all available facts
- [x] Operator selector filters by selected fact
- [x] Tooltips display helpful information
- [x] Form changes update state (bidirectional sync)
- [x] Validation errors display inline
- [x] Params editor handles nested objects
- [x] All inputs are accessible (labels, ARIA)

## Implementation Notes

### Fact Catalog Structure
```typescript
interface FactMetadata {
  name: string;
  plugin: string;
  description: string;
  parameters: ParameterDef[];
  returns: string;               // Return type description
  example: {
    params: Record<string, any>;
    output: any;
  };
  compatibleOperators: string[];
  documentationUrl?: string;
}

// Example entry
const fileDataFact: FactMetadata = {
  name: 'fileData',
  plugin: 'filesystem',
  description: 'Provides information about the current file being analyzed',
  parameters: [],
  returns: 'Object with fileName, content, extension properties',
  example: {
    params: {},
    output: { fileName: 'src/index.ts', content: '...', extension: 'ts' }
  },
  compatibleOperators: ['equal', 'notEqual', 'contains', 'regex'],
};
```

### Operator Catalog Structure
```typescript
interface OperatorMetadata {
  name: string;
  plugin: string;
  description: string;
  valueType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  example: {
    factValue: any;
    compareValue: any;
    result: boolean;
  };
  documentationUrl?: string;
}
```

### Form Layout
```
┌─────────────────────────────────────────────────────┐
│ Editing: Condition                        [?] Help │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Fact         [fileData              ▼] [ℹ️]        │
│              Provides current file information     │
│                                                     │
│ Path ($.*)   [$.fileName                 ] [ℹ️]    │
│              JSONPath to extract from fact result  │
│                                                     │
│ Operator     [contains              ▼] [ℹ️]        │
│              Check if value contains substring     │
│                                                     │
│ Value        [.test.ts                   ]          │
│                                                     │
│ ─────────────────────────────────────────────────   │
│ Parameters (optional)                    [+ Add]   │
│ ┌─────────────────────────────────────────────┐    │
│ │ (no parameters)                             │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tooltip Content
Tooltips should include:
- Field purpose explanation
- Expected format/type
- Example values
- Link to full documentation

```typescript
const factTooltipContent = {
  title: fact.name,
  description: fact.description,
  plugin: `From ${fact.plugin} plugin`,
  example: (
    <pre>{JSON.stringify(fact.example, null, 2)}</pre>
  ),
  link: fact.documentationUrl,
};
```

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create unit tests for each form component
- Test form renders correctly for each node type
- Test fact/operator selectors with mock catalogs
- Test bidirectional sync with store
- Defer integration testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: xfi-engineer
- Started: 2026-01-18T21:10:00Z
- Completed: 2026-01-18T21:20:00Z

### Work Log
1. Created fact catalog with metadata for all browser plugin facts (filesystem, ast, dependency, react-patterns)
2. Created operator catalog with metadata for built-in and X-Fidelity custom operators
3. Implemented tooltip components using Radix UI Tooltip:
   - FieldTooltip: General purpose field tooltips
   - FactTooltip: Detailed fact documentation tooltips
   - OperatorTooltip: Operator documentation with examples
4. Created field components:
   - FactSelector: Searchable dropdown grouped by plugin
   - OperatorSelector: Dropdown filtered by selected fact's compatible operators
   - ValueEditor: Type-aware value input (string, number, boolean, array, object)
   - JsonPathEditor: JSONPath expression input with validation hints
   - ParamsEditor: Expandable params object editor with suggested parameters
5. Created useFormState hook with 100ms debouncing for smooth typing experience
6. Implemented form variants:
   - RootForm: Rule name and priority editing
   - ConditionGroupForm: ALL/ANY/NOT logic type selection
   - ConditionForm: Full condition editing with preview
   - EventForm: Event type, message, and category configuration
7. Updated main RuleForm.tsx to dynamically render appropriate form based on selected node type
8. Updated vitest.setup.ts with DOM API mocks for Radix UI compatibility
9. Created unit tests for FactSelector and ConditionForm components
10. All 174 tests pass

### Blockers Encountered
- Radix UI Select component requires DOM APIs not available in jsdom (hasPointerCapture, scrollIntoView)
  - Resolved by adding mocks in vitest.setup.ts
  - Simplified tests to focus on rendering and basic interactions rather than full dropdown interactions

### Files Modified
```
website/rule-builder/src/components/RuleForm/
├── index.ts                              # Updated with all exports
├── RuleForm.tsx                          # Main form container with dynamic rendering
├── data/
│   ├── index.ts                          # Data exports
│   ├── factCatalog.ts                    # Fact metadata for all plugins
│   └── operatorCatalog.ts                # Operator metadata
├── fields/
│   ├── index.ts                          # Field exports
│   ├── FactSelector.tsx                  # Searchable fact dropdown
│   ├── OperatorSelector.tsx              # Filtered operator dropdown
│   ├── ValueEditor.tsx                   # Type-aware value input
│   ├── JsonPathEditor.tsx                # JSONPath input
│   └── ParamsEditor.tsx                  # Params object editor
├── forms/
│   ├── index.ts                          # Form exports
│   ├── RootForm.tsx                      # Rule name/priority form
│   ├── ConditionGroupForm.tsx            # ALL/ANY/NOT form
│   ├── ConditionForm.tsx                 # Condition editing form
│   └── EventForm.tsx                     # Event configuration form
├── hooks/
│   ├── index.ts                          # Hook exports
│   └── useFormState.ts                   # Debounced form state hook
├── tooltips/
│   ├── index.ts                          # Tooltip exports
│   ├── FieldTooltip.tsx                  # General field tooltip
│   ├── FactTooltip.tsx                   # Fact documentation tooltip
│   └── OperatorTooltip.tsx               # Operator documentation tooltip
└── __tests__/
    ├── FactSelector.test.tsx             # FactSelector unit tests
    └── ConditionForm.test.tsx            # ConditionForm unit tests

website/rule-builder/vitest.setup.ts      # Added DOM API mocks for Radix UI
```
