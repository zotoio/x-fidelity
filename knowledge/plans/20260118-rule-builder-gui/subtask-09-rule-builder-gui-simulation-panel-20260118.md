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
- [x] Create simulation panel component (collapsible)
- [x] Integrate browser plugins from Subtask 02
- [x] Load fixture data from Subtask 03
- [x] Implement simulation engine:
  - [x] Evaluate each condition in rule
  - [x] Show fact values returned
  - [x] Show operator evaluation results
  - [x] Show final pass/fail per file
- [x] Create simulation results UI:
  - [x] File selector (which fixture file to test against)
  - [x] Condition-by-condition breakdown
  - [x] Expandable fact data view
  - [x] Event preview (what would trigger)
- [x] Add "Run Simulation" button
- [x] Show simulation progress/loading state
- [x] Handle and display simulation errors gracefully

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
- [x] Simulation panel expands/collapses
- [x] Fixture files can be selected
- [x] "Run Simulation" executes rule against fixture
- [x] Each condition shows pass/fail status
- [x] Fact values are displayed and expandable
- [x] Final result (event triggered or not) is clear
- [x] Errors are displayed helpfully
- [x] Loading state shown during simulation
- [x] Works with all four core plugins

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
- Agent: xfi-engineer (Claude)
- Started: 2026-01-18T10:30:00Z
- Completed: 2026-01-18T10:35:00Z

### Work Log
1. Analyzed existing codebase - discovered simulation engine, condition evaluator, fact evaluator, and UI components were already implemented
2. Updated `SimulationPanel.tsx` to integrate all components (useSimulation hook, FileSelector, SimulationResults)
3. Implemented full UI with:
   - Collapsible panel header with status indicators
   - Initialization progress display
   - Error state with retry button
   - File selector dropdown
   - Run Simulation button with loading state
   - Reset button after simulation
   - No-rule warning state
   - Help text for first-time users
4. Updated `index.ts` to export all components and hooks
5. Created comprehensive tests:
   - `SimulationPanel.test.tsx` - 16 tests covering rendering, expansion, initialization, no-rule state, simulation execution, and help text
   - `simulationEngine.test.ts` - 34 tests covering path utilities, fact collection, condition evaluation, condition groups, standard operators

### Blockers Encountered
None - all implementation was straightforward. The existing infrastructure (simulation engine, plugins, fixtures) was well-designed and ready for integration.

### Files Modified
- `website/rule-builder/src/components/SimulationPanel/SimulationPanel.tsx` - Replaced placeholder with full implementation
- `website/rule-builder/src/components/SimulationPanel/index.ts` - Added exports for all components and hooks
- `website/rule-builder/src/components/SimulationPanel/__tests__/SimulationPanel.test.tsx` - Created (16 tests)
- `website/rule-builder/src/lib/simulation/__tests__/simulationEngine.test.ts` - Created (34 tests)

### Test Results
- 50 tests passing
- All targeted tests run successfully
- No linting errors
