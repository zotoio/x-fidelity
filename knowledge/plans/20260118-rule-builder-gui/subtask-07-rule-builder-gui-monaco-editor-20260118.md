# Subtask: Monaco JSON Editor Integration

## Metadata
- **Subtask ID**: 07
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: 01 (SPA Scaffold), 04 (State Management)
- **Created**: 20260118

## Objective
Integrate Monaco Editor for live JSON editing with bidirectional synchronization. The editor should provide a familiar code editing experience with syntax highlighting, validation, and error markers that sync with the visual tree and form views.

## Deliverables Checklist
- [x] Install and configure @monaco-editor/react
- [x] Create JSON editor panel component
- [x] Configure Monaco for JSON:
  - [x] Syntax highlighting
  - [x] Auto-formatting
  - [x] Bracket matching
  - [x] Line numbers
- [x] Implement bidirectional sync with state store
- [x] Add JSON Schema validation with error markers
- [x] Show validation errors in editor gutter
- [x] Add toolbar with:
  - [x] Format button
  - [x] Copy to clipboard
  - [x] Reset to last valid state
- [x] Handle large documents efficiently
- [x] Add dark/light theme support matching Docusaurus

## Files to Create/Modify
```
website/rule-builder/src/components/JsonEditor/
├── index.ts
├── JsonEditor.tsx                    # Main editor component
├── EditorToolbar.tsx                 # Format, copy, reset buttons
├── hooks/
│   ├── useMonacoSetup.ts            # Monaco configuration
│   └── useEditorSync.ts             # Bidirectional sync logic
├── config/
│   ├── monacoOptions.ts             # Editor options
│   └── jsonSchema.ts                # Rule JSON schema for validation
└── themes/
    ├── docusaurusLight.ts           # Light theme matching Docusaurus
    └── docusaurusDark.ts            # Dark theme matching Docusaurus

website/rule-builder/src/components/JsonEditor/__tests__/
└── JsonEditor.test.tsx
```

## Definition of Done
- [x] Monaco editor renders and is interactive
- [x] JSON syntax highlighting works
- [x] Typing updates state store (with debounce)
- [x] Store changes update editor content
- [x] No infinite update loops
- [x] JSON validation errors show in gutter
- [x] Format button prettifies JSON
- [x] Copy button copies to clipboard
- [x] Theme matches Docusaurus dark/light mode
- [x] Editor handles 1000+ line documents smoothly

## Implementation Notes

### Monaco Editor Setup
```typescript
import Editor, { Monaco } from '@monaco-editor/react';

function JsonEditor() {
  const { rule, updateRuleFromJson } = useRuleState();
  const [localValue, setLocalValue] = useState('');
  
  // Debounced sync to store
  const debouncedUpdate = useMemo(
    () => debounce((value: string) => {
      try {
        const parsed = JSON.parse(value);
        updateRuleFromJson(parsed, 'json');
      } catch (e) {
        // Invalid JSON - show error but don't update store
      }
    }, 300),
    [updateRuleFromJson]
  );
  
  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setLocalValue(value);
      debouncedUpdate(value);
    }
  };
  
  return (
    <Editor
      height="100%"
      language="json"
      value={localValue}
      onChange={handleEditorChange}
      options={monacoOptions}
      beforeMount={configureMonaco}
    />
  );
}
```

### Monaco Configuration
```typescript
export const monacoOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  lineNumbers: 'on',
  folding: true,
  formatOnPaste: true,
  formatOnType: true,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  tabSize: 2,
  automaticLayout: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
  },
};
```

### JSON Schema Validation
```typescript
function configureMonaco(monaco: Monaco) {
  // Register JSON schema for X-Fidelity rules
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: 'https://x-fidelity.github.io/rule.schema.json',
        fileMatch: ['*'],
        schema: ruleJsonSchema,
      },
    ],
  });
}
```

### Bidirectional Sync Prevention
```typescript
// Track update source to prevent loops
const lastExternalUpdate = useRef<string>('');

useEffect(() => {
  const ruleJson = JSON.stringify(rule, null, 2);
  if (ruleJson !== lastExternalUpdate.current) {
    lastExternalUpdate.current = ruleJson;
    setLocalValue(ruleJson);
  }
}, [rule]);
```

### Custom Themes
```typescript
// Match Docusaurus dark theme
export const docusaurusDark: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string.key.json', foreground: '9cdcfe' },
    { token: 'string.value.json', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'keyword', foreground: '569cd6' },
  ],
  colors: {
    'editor.background': '#1b1b1d',
    'editor.foreground': '#e3e3e3',
    'editorLineNumber.foreground': '#858585',
  },
};
```

### Toolbar Actions
```typescript
const handleFormat = () => {
  try {
    const formatted = JSON.stringify(JSON.parse(localValue), null, 2);
    setLocalValue(formatted);
  } catch (e) {
    // Can't format invalid JSON
  }
};

const handleCopy = async () => {
  await navigator.clipboard.writeText(localValue);
  toast.success('Copied to clipboard!');
};

const handleReset = () => {
  const validJson = JSON.stringify(rule, null, 2);
  setLocalValue(validJson);
};
```

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create unit tests for sync logic
- Test format/copy/reset actions
- Mock Monaco editor for tests
- Test debounce behavior
- Manual verification of editor functionality
- Defer integration testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: xfi-engineer
- Started: 2026-01-18T21:10:00Z
- Completed: 2026-01-18T21:15:00Z

### Work Log
1. Installed @monaco-editor/react and monaco-editor packages
2. Created Monaco configuration with optimal JSON editing settings:
   - Line numbers, folding, auto-formatting, bracket matching
   - Glyph margin enabled for error markers
   - Large file optimizations enabled
3. Created Docusaurus-matching themes:
   - Light theme with VS base, white background (#ffffff)
   - Dark theme with VS Dark base, dark background (#1b1b1d)
   - Both themes use X-Fidelity CSS variables for consistency
4. Created useMonacoSetup hook:
   - Registers custom themes on mount
   - Configures JSON schema validation
   - Watches for dark mode class changes on document
5. Created useEditorSync hook:
   - Implements bidirectional sync with 300ms debounce
   - Uses source tracking (lastExternalUpdate ref) to prevent loops
   - Provides format, copy, reset actions
   - Tracks parse errors with line/column info
6. Created EditorToolbar component:
   - Format button (disabled when JSON invalid)
   - Copy button with success/error feedback
   - Reset button to restore last valid state
   - Status indicators for invalid JSON and unsaved changes
7. Updated JsonEditor.tsx with full Monaco integration:
   - Monaco Editor with JSON language and schema validation
   - Keyboard shortcut Ctrl+Shift+F for format
   - Parse error display with line/column info
8. Added selectLastUpdate selector to store for sync tracking
9. Created comprehensive unit tests (24 tests passing):
   - EditorToolbar component tests
   - Debounce behavior tests
   - Theme detection tests
   - Configuration validation tests
   - Export verification tests

### Blockers Encountered
- @testing-library/dom was missing as peer dependency, added it
- Initial cancellableDebounce typing was incompatible, refactored to inline setTimeout approach

### Files Modified
- website/rule-builder/package.json (added @monaco-editor/react, monaco-editor, @testing-library/dom)
- website/rule-builder/yarn.lock (updated dependencies)
- website/rule-builder/src/components/JsonEditor/index.ts (updated exports)
- website/rule-builder/src/components/JsonEditor/JsonEditor.tsx (full rewrite with Monaco)
- website/rule-builder/src/components/JsonEditor/EditorToolbar.tsx (new file)
- website/rule-builder/src/components/JsonEditor/config/monacoOptions.ts (new file)
- website/rule-builder/src/components/JsonEditor/config/jsonSchema.ts (new file)
- website/rule-builder/src/components/JsonEditor/config/index.ts (new file)
- website/rule-builder/src/components/JsonEditor/hooks/useMonacoSetup.ts (new file)
- website/rule-builder/src/components/JsonEditor/hooks/useEditorSync.ts (new file)
- website/rule-builder/src/components/JsonEditor/hooks/index.ts (new file)
- website/rule-builder/src/components/JsonEditor/themes/docusaurusLight.ts (new file)
- website/rule-builder/src/components/JsonEditor/themes/docusaurusDark.ts (new file)
- website/rule-builder/src/components/JsonEditor/themes/index.ts (new file)
- website/rule-builder/src/components/JsonEditor/__tests__/JsonEditor.test.tsx (new file)
- website/rule-builder/src/store/selectors.ts (added selectLastUpdate selector)
