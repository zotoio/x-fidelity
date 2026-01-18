# X-Fidelity Rule Builder SPA

The Rule Builder is a React-based single-page application (SPA) for visually creating and editing X-Fidelity rules. It's integrated into the Docusaurus documentation site at `/rule-builder/`.

## Architecture

```
website/rule-builder/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point
│   ├── components/             # React components
│   │   ├── JsonEditor/         # Monaco-based JSON editor
│   │   ├── Layout/             # Header and layout components
│   │   ├── RuleForm/           # Form-based rule editing
│   │   ├── RuleTree/           # Tree view navigation
│   │   ├── SimulationPanel/    # Rule testing interface
│   │   └── TemplateLibrary/    # Template browser
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Core libraries
│   │   ├── fixtures/           # Bundled test fixtures
│   │   ├── plugins/            # Browser-adapted plugins
│   │   ├── simulation/         # Rule simulation engine
│   │   ├── templates/          # Rule templates
│   │   ├── utils/              # Utility functions
│   │   └── validation/         # JSON schema validation
│   ├── store/                  # Zustand state management
│   └── types/                  # TypeScript type definitions
├── scripts/
│   └── bundle-fixtures.mjs     # Fixture bundling script
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Test configuration
└── tailwind.config.js          # Tailwind CSS configuration
```

## Development

### Prerequisites

- Node.js 18+
- Yarn package manager

### Local Development

```bash
# From repository root
cd website/rule-builder

# Install dependencies
yarn install

# Start development server
yarn dev
```

The development server runs at http://localhost:5173 with hot module replacement.

### Building

```bash
# Build for production
yarn build

# Preview production build
yarn preview
```

The build output goes to `dist/` and is served by Docusaurus at `/rule-builder/`.

### Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run with coverage
yarn test:coverage
```

## Key Components

### RuleTree

The tree view component that displays rule structure hierarchically:

- Navigable condition groups and individual conditions
- Visual indicators for condition types (all/any)
- Context menu for adding/removing nodes
- Keyboard navigation support

### RuleForm

Form-based editing for selected tree nodes:

- Dynamic field rendering based on node type
- Fact and operator selectors with search
- JSONPath editor with syntax highlighting
- Real-time validation feedback

### JsonEditor

Monaco-based JSON editor with:

- Bidirectional sync with visual editor
- JSON schema validation
- Custom themes matching Docusaurus
- Syntax highlighting and auto-completion

### SimulationPanel

Rule testing interface:

- File selector for bundled fixtures
- Browser-adapted plugin execution
- Condition result visualization
- Event preview for triggered rules

### TemplateLibrary

Template browser and selector:

- Category filtering (plugin, use case, complexity)
- Search functionality
- Template preview
- One-click template loading

## State Management

The application uses Zustand for state management:

```typescript
// store/ruleStore.ts
interface RuleStore {
  rule: XFiRule;
  selectedPath: string | null;
  history: HistoryState;
  validation: ValidationState;
  
  // Actions
  setRule: (rule: XFiRule) => void;
  updateNode: (path: string, value: any) => void;
  selectNode: (path: string) => void;
  undo: () => void;
  redo: () => void;
}
```

### Middleware

- **History Middleware**: Tracks changes for undo/redo functionality
- **Validation Middleware**: Validates rule against JSON schema on changes

## Browser Plugin Adapters

The simulation engine uses browser-adapted versions of X-Fidelity plugins:

```typescript
// lib/plugins/browserPluginAdapter.ts
export interface BrowserPlugin {
  name: string;
  facts: BrowserFact[];
  operators: BrowserOperator[];
}
```

### Supported Plugins

- **Filesystem**: File content and path matching
- **AST**: Code structure analysis (limited in browser)
- **Dependency**: Package version checking
- **React Patterns**: React-specific rules

## Fixture Bundling

Test fixtures are bundled from the democonfig at build time:

```bash
# Bundle fixtures manually
yarn bundle-fixtures
```

The bundling script (`scripts/bundle-fixtures.mjs`) reads from `packages/x-fidelity-fixtures/` and creates a JSON bundle in `src/lib/fixtures/`.

## Theme Integration

The Rule Builder supports light/dark themes synchronized with Docusaurus:

```typescript
// hooks/useTheme.ts
export function useTheme() {
  // Detects Docusaurus theme preference
  // Falls back to system preference in standalone mode
}
```

Custom Monaco themes are defined in `src/components/JsonEditor/themes/`.

## Integration with Docusaurus

The Rule Builder is integrated into the Docusaurus site via:

1. **Vite build** outputs to a location Docusaurus can serve
2. **Static page** at `website/static/rule-builder/index.html` (for production)
3. **Development proxy** via Docusaurus plugin for local development

### Docusaurus Configuration

```javascript
// website/docusaurus.config.js
module.exports = {
  // ...
  plugins: [
    // Rule Builder integration plugin
  ],
};
```

## Testing Strategy

### Unit Tests

Component and hook tests using Vitest and React Testing Library:

```bash
yarn test
```

### Integration Tests

End-to-end workflows in `src/integration/__tests__/`:

- `bidirectionalSync.test.tsx`: Form ↔ JSON synchronization
- `templateWorkflow.test.tsx`: Template selection and customization
- `simulationFlow.test.tsx`: Rule simulation execution
- `accessibility.test.tsx`: WCAG compliance checks

## Contributing

### Adding New Features

1. Create components in the appropriate directory
2. Add tests alongside the component
3. Update this README if adding significant functionality
4. Ensure all tests pass: `yarn test`

### Code Style

- Use TypeScript for all new code
- Follow existing patterns for state management
- Use Tailwind CSS for styling
- Add JSDoc comments for exported functions

### Pull Request Process

1. Create a feature branch
2. Make changes with tests
3. Run `yarn lint` and `yarn test`
4. Submit PR with clear description

## Troubleshooting

### Development Server Issues

```bash
# Clear cache and reinstall
rm -rf node_modules .vite
yarn install
yarn dev
```

### Build Failures

```bash
# Check for type errors
yarn typecheck

# Check for lint errors
yarn lint
```

### Test Failures

```bash
# Run tests with verbose output
yarn test --reporter=verbose

# Run specific test file
yarn test src/components/RuleTree/__tests__/RuleTree.test.tsx
```

## Related Documentation

- [Rule Builder Guide](/docs/rules/rule-builder-guide) - User documentation
- [Creating Templates](/docs/rules/rule-builder-templates) - Template contribution guide
- [Plugin Development](/docs/plugins/overview) - X-Fidelity plugin system
