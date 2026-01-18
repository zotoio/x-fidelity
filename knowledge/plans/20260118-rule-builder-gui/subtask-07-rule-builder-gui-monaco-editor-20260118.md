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
- [ ] Install and configure @monaco-editor/react
- [ ] Create JSON editor panel component
- [ ] Configure Monaco for JSON:
  - [ ] Syntax highlighting
  - [ ] Auto-formatting
  - [ ] Bracket matching
  - [ ] Line numbers
- [ ] Implement bidirectional sync with state store
- [ ] Add JSON Schema validation with error markers
- [ ] Show validation errors in editor gutter
- [ ] Add toolbar with:
  - [ ] Format button
  - [ ] Copy to clipboard
  - [ ] Reset to last valid state
- [ ] Handle large documents efficiently
- [ ] Add dark/light theme support matching Docusaurus

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
- [ ] Monaco editor renders and is interactive
- [ ] JSON syntax highlighting works
- [ ] Typing updates state store (with debounce)
- [ ] Store changes update editor content
- [ ] No infinite update loops
- [ ] JSON validation errors show in gutter
- [ ] Format button prettifies JSON
- [ ] Copy button copies to clipboard
- [ ] Theme matches Docusaurus dark/light mode
- [ ] Editor handles 1000+ line documents smoothly

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
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
