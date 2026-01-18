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
- [x] Create `website/rule-builder/` directory structure
- [x] Initialize Vite React TypeScript project
- [x] Install and configure dependencies:
  - [x] Radix UI primitives (@radix-ui/react-*)
  - [x] Tailwind CSS with configuration
  - [x] TypeScript with strict mode
- [x] Create base layout component with three-panel structure
- [x] Set up CSS variables that mirror Docusaurus theme
- [x] Create placeholder components for each panel
- [x] Configure Vite for:
  - [x] WASM file handling
  - [x] Proper base path for GitHub Pages (`/x-fidelity/rule-builder/`)
  - [x] Development proxy (if needed)
- [x] Add basic routing (if needed for templates/simulation views) - Deferred, using modal dialog for templates instead
- [x] Create `package.json` with all scripts

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
- [x] `yarn install` succeeds in `website/rule-builder/`
- [x] `yarn dev` starts development server
- [x] `yarn build` produces production build in `dist/`
- [x] Three-panel layout renders correctly
- [x] Tailwind styles are applied
- [x] CSS variables match Docusaurus dark/light themes
- [x] TypeScript compiles without errors
- [x] No lint errors in created files

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
- Agent: xfi-engineer
- Started: 2026-01-18T20:40:00Z
- Completed: 2026-01-18T20:50:00Z

### Work Log
1. Created complete directory structure for `website/rule-builder/`
2. Initialized Vite React TypeScript project with:
   - Radix UI primitives (accordion, collapsible, dialog, dropdown-menu, icons, label, scroll-area, select, separator, slot, tabs, tooltip)
   - Tailwind CSS with custom theme configuration
   - TypeScript strict mode enabled with `noUncheckedIndexedAccess`
3. Created base layout component with three-panel structure:
   - Left panel: RuleTree (navigation)
   - Center panel: RuleForm (editing)
   - Right panel: JsonEditor (preview)
   - Bottom panel: SimulationPanel (collapsible)
4. Set up CSS variables mirroring Docusaurus theme:
   - Primary color: #2e8555 (green accent)
   - Dark mode background: #1b1b1d
   - Light mode support with `.dark` class toggle
5. Created placeholder components for all panels with:
   - Proper TypeScript interfaces
   - Radix UI icons integration
   - Descriptive placeholder content indicating future functionality
6. Configured Vite for:
   - WASM handling (`web-tree-sitter` excluded from optimizeDeps)
   - Base path `/x-fidelity/rule-builder/` for GitHub Pages
   - Source maps enabled
   - Path alias `@/*` for clean imports
7. Implemented template library as a modal dialog (using Radix Dialog) instead of separate routing

### Blockers Encountered
- Pre-existing files from a previous attempt in `src/lib/` directory caused TypeScript compilation errors. Resolved by removing the leftover files and ensuring a clean scaffold.

### Files Modified
**Configuration Files:**
- `website/rule-builder/package.json` - Project manifest with all dependencies
- `website/rule-builder/tsconfig.json` - TypeScript configuration with strict mode
- `website/rule-builder/tsconfig.node.json` - TypeScript config for Vite
- `website/rule-builder/vite.config.ts` - Vite configuration with base path and WASM handling
- `website/rule-builder/tailwind.config.js` - Tailwind CSS configuration with theme
- `website/rule-builder/postcss.config.js` - PostCSS configuration for Tailwind
- `website/rule-builder/index.html` - Entry HTML file

**Source Files:**
- `website/rule-builder/src/main.tsx` - React entry point
- `website/rule-builder/src/App.tsx` - Main app component
- `website/rule-builder/src/index.css` - Global styles with CSS variables
- `website/rule-builder/src/types/index.ts` - Shared type definitions

**Layout Components:**
- `website/rule-builder/src/components/Layout/Layout.tsx` - Three-panel layout
- `website/rule-builder/src/components/Layout/Header.tsx` - App header with template button
- `website/rule-builder/src/components/Layout/index.ts` - Barrel export

**Panel Components (Placeholders):**
- `website/rule-builder/src/components/RuleTree/RuleTree.tsx` - Rule navigation placeholder
- `website/rule-builder/src/components/RuleTree/index.ts`
- `website/rule-builder/src/components/RuleForm/RuleForm.tsx` - Rule editing placeholder
- `website/rule-builder/src/components/RuleForm/index.ts`
- `website/rule-builder/src/components/JsonEditor/JsonEditor.tsx` - JSON preview placeholder
- `website/rule-builder/src/components/JsonEditor/index.ts`
- `website/rule-builder/src/components/TemplateLibrary/TemplateLibrary.tsx` - Template library modal
- `website/rule-builder/src/components/TemplateLibrary/index.ts`
- `website/rule-builder/src/components/SimulationPanel/SimulationPanel.tsx` - Simulation placeholder
- `website/rule-builder/src/components/SimulationPanel/index.ts`

### Verification
- ✅ `yarn install` succeeded (62.15s)
- ✅ `yarn dev` starts development server on http://localhost:5173/x-fidelity/rule-builder/
- ✅ `yarn build` produces production build in `dist/` (4.65s)
- ✅ TypeScript compiles without errors
- ✅ No lint errors in created files
