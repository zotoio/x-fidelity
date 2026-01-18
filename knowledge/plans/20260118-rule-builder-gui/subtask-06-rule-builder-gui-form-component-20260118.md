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
- [ ] Create dynamic form that adapts to selected node type
- [ ] Implement form variants for each node type:
  - [ ] Rule root form (name, priority)
  - [ ] Condition group form (all/any selection)
  - [ ] Individual condition form (fact, operator, value, params)
  - [ ] Event form (type, message, details)
- [ ] Add fact selector dropdown with:
  - [ ] Available facts from loaded plugins
  - [ ] Fact descriptions and parameter hints
  - [ ] Search/filter functionality
- [ ] Add operator selector dropdown with:
  - [ ] Operators compatible with selected fact
  - [ ] Operator descriptions and examples
- [ ] Implement comprehensive tooltips using Radix Tooltip
- [ ] Add inline help links to documentation
- [ ] Show validation errors per field
- [ ] Add "params" editor for fact parameters

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
- [ ] Form renders correctly for each node type
- [ ] Fact selector shows all available facts
- [ ] Operator selector filters by selected fact
- [ ] Tooltips display helpful information
- [ ] Form changes update state (bidirectional sync)
- [ ] Validation errors display inline
- [ ] Params editor handles nested objects
- [ ] All inputs are accessible (labels, ARIA)

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
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
