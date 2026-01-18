# Subtask: SPA Scaffold Setup

## Metadata
- **Subtask ID**: 01
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: None
- **Created**: 20260118

## Objective
Set up the foundational React SPA scaffold for the Rule Builder using Vite, Radix UI, and Tailwind CSS. This establishes the project structure, build configuration, and basic layout that all other subtasks will build upon.

## Deliverables Checklist
- [ ] Create `website/rule-builder/` directory structure
- [ ] Initialize Vite React TypeScript project
- [ ] Install and configure dependencies:
  - [ ] Radix UI primitives (@radix-ui/react-*)
  - [ ] Tailwind CSS with configuration
  - [ ] TypeScript with strict mode
- [ ] Create base layout component with three-panel structure
- [ ] Set up CSS variables that mirror Docusaurus theme
- [ ] Create placeholder components for each panel
- [ ] Configure Vite for:
  - [ ] WASM file handling
  - [ ] Proper base path for GitHub Pages (`/x-fidelity/rule-builder/`)
  - [ ] Development proxy (if needed)
- [ ] Add basic routing (if needed for templates/simulation views)
- [ ] Create `package.json` with all scripts

## Files to Create
```
website/rule-builder/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                    # Tailwind imports + theme variables
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Layout.tsx           # Three-panel layout
│   │   │   ├── Header.tsx           # App header with logo
│   │   │   └── index.ts
│   │   ├── RuleTree/
│   │   │   ├── RuleTree.tsx         # Placeholder
│   │   │   └── index.ts
│   │   ├── RuleForm/
│   │   │   ├── RuleForm.tsx         # Placeholder
│   │   │   └── index.ts
│   │   ├── JsonEditor/
│   │   │   ├── JsonEditor.tsx       # Placeholder
│   │   │   └── index.ts
│   │   ├── TemplateLibrary/
│   │   │   ├── TemplateLibrary.tsx  # Placeholder
│   │   │   └── index.ts
│   │   └── SimulationPanel/
│   │       ├── SimulationPanel.tsx  # Placeholder
│   │       └── index.ts
│   └── types/
│       └── index.ts                 # Shared type definitions
```

## Definition of Done
- [ ] `yarn install` succeeds in `website/rule-builder/`
- [ ] `yarn dev` starts development server
- [ ] `yarn build` produces production build in `dist/`
- [ ] Three-panel layout renders correctly
- [ ] Tailwind styles are applied
- [ ] CSS variables match Docusaurus dark/light themes
- [ ] TypeScript compiles without errors
- [ ] No lint errors in created files

## Implementation Notes

### Vite Configuration
```typescript
// vite.config.ts key settings
export default defineConfig({
  base: '/x-fidelity/rule-builder/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    exclude: ['web-tree-sitter'], // WASM needs special handling
  },
});
```

### Theme Variables
Match these Docusaurus CSS variables:
- `--ifm-color-primary`: #2e8555 (green accent)
- `--ifm-background-color`: #1b1b1d (dark mode)
- `--ifm-font-family-base`: system-ui, -apple-system, etc.

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header: X-Fidelity Rule Builder              [Templates] │
├──────────────┬─────────────────────┬────────────────────────┤
│              │                     │                        │
│  Rule Tree   │    Rule Form        │    JSON Editor         │
│  (Navigation)│    (Edit selected)  │    (Monaco)            │
│              │                     │                        │
│              │                     │                        │
├──────────────┴─────────────────────┴────────────────────────┤
│ Simulation Panel (collapsible)                              │
└─────────────────────────────────────────────────────────────┘
```

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Verify build succeeds: `cd website/rule-builder && yarn build`
- Manual verification of dev server rendering
- TypeScript compilation check only
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
