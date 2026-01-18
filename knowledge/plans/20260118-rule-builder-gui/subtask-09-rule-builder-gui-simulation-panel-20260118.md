# Subtask: Simulation Panel with Plugin Execution

## Metadata
- **Subtask ID**: 09
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-plugin-expert
- **Dependencies**: 02 (Browser Plugins), 03 (Fixture Bundles), 04 (State Management)
- **Created**: 20260118

## Objective
Implement the simulation panel that allows users to run their rule against bundled fixture data using the browser-compatible plugins. Display which conditions pass/fail, what facts return, and what events would be triggered.

## Deliverables Checklist
- [ ] Create simulation panel component (collapsible)
- [ ] Integrate browser plugins from Subtask 02
- [ ] Load fixture data from Subtask 03
- [ ] Implement simulation engine:
  - [ ] Evaluate each condition in rule
  - [ ] Show fact values returned
  - [ ] Show operator evaluation results
  - [ ] Show final pass/fail per file
- [ ] Create simulation results UI:
  - [ ] File selector (which fixture file to test against)
  - [ ] Condition-by-condition breakdown
  - [ ] Expandable fact data view
  - [ ] Event preview (what would trigger)
- [ ] Add "Run Simulation" button
- [ ] Show simulation progress/loading state
- [ ] Handle and display simulation errors gracefully

## Files to Create/Modify
```
website/rule-builder/src/components/SimulationPanel/
├── index.ts
├── SimulationPanel.tsx               # Main collapsible panel
├── FileSelector.tsx                  # Choose which fixture file
├── SimulationResults.tsx             # Results display
├── ConditionResult.tsx               # Individual condition result
├── FactValueViewer.tsx               # Expandable fact data view
├── EventPreview.tsx                  # Shows what event would trigger
└── hooks/
    └── useSimulation.ts              # Simulation execution hook

website/rule-builder/src/lib/simulation/
├── index.ts
├── types.ts                          # Simulation result types
├── simulationEngine.ts               # Core simulation logic
├── factEvaluator.ts                  # Evaluate facts with fixtures
└── conditionEvaluator.ts             # Evaluate conditions

website/rule-builder/src/components/SimulationPanel/__tests__/
├── SimulationPanel.test.tsx
└── simulationEngine.test.ts
```

## Definition of Done
- [ ] Simulation panel expands/collapses
- [ ] Fixture files can be selected
- [ ] "Run Simulation" executes rule against fixture
- [ ] Each condition shows pass/fail status
- [ ] Fact values are displayed and expandable
- [ ] Final result (event triggered or not) is clear
- [ ] Errors are displayed helpfully
- [ ] Loading state shown during simulation
- [ ] Works with all four core plugins

## Implementation Notes

### Simulation Result Types
```typescript
interface SimulationResult {
  success: boolean;
  fileName: string;
  timestamp: Date;
  duration: number;                    // ms
  
  conditionResults: ConditionResult[];
  finalResult: 'triggered' | 'not-triggered' | 'error';
  event?: EventResult;
  error?: string;
}

interface ConditionResult {
  path: string[];                      // Path in rule JSON
  factName: string;
  factValue: any;                      // What the fact returned
  operator: string;
  compareValue: any;                   // Expected value
  result: boolean;                     // Pass or fail
  error?: string;                      // If evaluation failed
}

interface EventResult {
  type: 'warning' | 'fatality';
  message: string;
  details?: Record<string, any>;
}
```

### Simulation Engine
```typescript
class SimulationEngine {
  private plugins: Map<string, BrowserPlugin>;
  private fixtures: FixtureLoader;
  
  async simulate(rule: RuleDefinition, fileName: string): Promise<SimulationResult> {
    const startTime = Date.now();
    const fileData = this.fixtures.getFile(fileName);
    
    // Create simulation almanac with fixture data
    const almanac = new BrowserAlmanac(fileData, this.fixtures);
    
    // Evaluate conditions
    const conditionResults = await this.evaluateConditions(
      rule.conditions,
      almanac,
      []
    );
    
    // Determine if event triggers
    const triggered = this.checkConditionsMet(conditionResults, rule.conditions);
    
    return {
      success: true,
      fileName,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      conditionResults,
      finalResult: triggered ? 'triggered' : 'not-triggered',
      event: triggered ? this.formatEvent(rule.event, almanac) : undefined,
    };
  }
  
  private async evaluateConditions(
    conditions: Conditions,
    almanac: BrowserAlmanac,
    path: string[]
  ): Promise<ConditionResult[]> {
    // Recursively evaluate all/any/not groups
    // ...
  }
}
```

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ▼ Simulation                                                │
├─────────────────────────────────────────────────────────────┤
│ Test File: [src/components/App.tsx        ▼]  [▶ Run]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Results for: src/components/App.tsx                         │
│ Status: ⚠️ Rule would trigger (warning)                    │
│ Duration: 42ms                                              │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Conditions:                                                 │
│                                                             │
│ ✅ fileData.fileName ≠ "REPO_GLOBAL_CHECK"                 │
│    └─ Fact value: "src/components/App.tsx"                 │
│                                                             │
│ ✅ functionComplexity → astComplexity = true               │
│    └─ [▶ View fact data]                                   │
│       ┌─────────────────────────────────────────────┐      │
│       │ {                                           │      │
│       │   "functions": [                            │      │
│       │     { "name": "App", "complexity": 28 }     │      │
│       │   ]                                         │      │
│       │ }                                           │      │
│       └─────────────────────────────────────────────┘      │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Event that would trigger:                                   │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Type: warning                                       │    │
│ │ Message: "Functions detected with high complexity"  │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### WASM Initialization
```typescript
// Initialize tree-sitter WASM on first simulation
const initializePlugins = async () => {
  if (!pluginsInitialized) {
    setLoading(true);
    try {
      // Load WASM binaries
      await astPlugin.initialize();
      // Load fixtures
      await fixtureLoader.load('node-fullstack');
      pluginsInitialized = true;
    } finally {
      setLoading(false);
    }
  }
};
```

### Error Handling
- Invalid rule structure → Show validation errors
- Fact evaluation fails → Show which fact failed and why
- WASM loading fails → Suggest reload, show fallback
- Unknown operator → Show "Operator not available in browser"

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Unit test simulationEngine with mock plugins
- Test ConditionResult display component
- Test fixture loading
- Mock WASM for tests (complex to test in Jest)
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
