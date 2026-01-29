# Topic: Tree-sitter and AST Utilities

## Fact: TreeSitterManager Singleton Pattern
### Modified: 2026-01-29
### Priority: H

The `TreeSitterManager` is a global singleton that manages Tree-sitter parsing with optional worker thread support:

**Singleton Access**:
```typescript
import { treeSitterManager } from '../sharedPluginUtils/astUtils/treeSitterManager';

// Always use the singleton
const manager = TreeSitterManager.getInstance();
// Or use the exported instance directly
await treeSitterManager.initialize();
```

**Initialization Modes**:
1. **Worker Mode** (`enableTreeSitterWorker: true`): Offloads parsing to a worker thread
2. **WASM Mode** (`enableTreeSitterWasm: true`): Uses WebAssembly parsers for cross-platform support
3. **Native Direct Mode** (default): Uses native Tree-sitter bindings directly

**Initialization Pattern**:
```typescript
// In plugin initialize()
initialize: async (context: PluginContext): Promise<void> => {
    const coreOptions = getOptions();
    if (!coreOptions.enableTreeSitterWorker) {
        context.logger.debug('Tree-sitter worker not enabled, using direct parsing');
        return;
    }
    await treeSitterManager.initialize();
}
```

**Key Properties**:
- Global singleton via `Symbol.for('x-fidelity.treeSitterManager')`
- Automatic fallback from worker to direct parsing on failure
- Request timeout: 30 seconds
- Process max listeners set to 20

### References
1. [treeSitterManager.ts](../../packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils/treeSitterManager.ts)
2. [xfiPluginAst/index.ts - initialization](../../packages/x-fidelity-plugins/src/xfiPluginAst/index.ts)

---

## Fact: AST Generation API via generateAst()
### Modified: 2026-01-29
### Priority: H

The unified `generateAst()` function handles all AST generation with automatic language detection:

**Primary API**:
```typescript
import { generateAst } from '../../sharedPluginUtils/astUtils';

const result: AstResult = await generateAst({
    filePath: fileData.filePath,
    fileName: fileData.fileName,
    content: fileData.fileContent
});
```

**AstGenerationContext Interface**:
```typescript
interface AstGenerationContext {
    filePath: string;   // Full file path
    fileName: string;   // File name only
    content: string;    // File content to parse
    language?: string;  // Auto-detected if not provided
    options?: AstGenerationOptions;
}
```

**AstResult Interface**:
```typescript
interface AstResult {
    tree: any;              // Tree-sitter tree object (null on failure)
    rootNode?: any;         // Root node for convenience
    reason?: string;        // Error reason if failed
    language?: string;      // Detected/used language
    hasErrors?: boolean;    // Whether AST contains parsing errors
    generationTime?: number; // Time in milliseconds
    mode?: 'native' | 'wasm' | 'native-direct' | 'wasm-direct' | 'worker' | 'fallback';
    fromCache?: boolean;
}
```

**Convenience Functions**:
```typescript
// From FileData object
await generateAstFromFileData(fileData);

// From raw code string
await generateAstFromCode(code, fileName, filePath?);
```

### References
1. [astUtils.ts - generateAst](../../packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils/astUtils.ts)
2. [core.ts - AstResult type](../../packages/x-fidelity-types/src/core.ts)

---

## Fact: Language Detection via getLanguageFromPath()
### Modified: 2026-01-29
### Priority: M

Tree-sitter requires knowing the source language for parsing. The `getLanguageFromPath()` utility auto-detects language from file extensions:

**Supported Languages**:
- JavaScript: `.js`, `.jsx`, `.mjs`, `.cjs`
- TypeScript: `.ts`, `.tsx`, `.mts`, `.cts`

**Usage Pattern**:
```typescript
import { getLanguageFromPath } from './languageUtils';

const language = getLanguageFromPath(filePath);
// Returns 'javascript' | 'typescript' | null

if (!language) {
    return createFailedAstResult(context, 'Unsupported file type');
}
```

**Special Cases Handled**:
- `REPO_GLOBAL_CHECK`: Special marker for repository-level checks, skips AST generation
- Empty/null content: Returns failed result with reason
- Non-JS/TS files: Returns null, caller should handle gracefully

**AST Pre-computation Optimization**:
Files can have pre-computed AST attached during file collection (priority 15 fact), reducing redundant parsing:
```typescript
// Check for precomputed AST first
if (fileData.ast) {
    return fileData.ast;  // Use cached AST
}
// Fall back to on-demand generation
return await generateAst(context);
```

### References
1. [languageUtils.ts](../../packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils/languageUtils.ts)
2. [astUtils.ts - language detection](../../packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils/astUtils.ts)

---

## Fact: SharedPluginUtils Organization
### Modified: 2026-01-29
### Priority: M

The `sharedPluginUtils` module provides common utilities for all plugins:

**Directory Structure**:
```
sharedPluginUtils/
├── index.ts            # Re-exports all utilities
├── astUtils.ts         # Top-level AST re-export
└── astUtils/           # AST-specific utilities
    ├── index.ts        # astUtils module exports
    ├── astUtils.ts     # generateAst and helpers
    ├── languageUtils.ts    # Language detection
    ├── treeSitterManager.ts # Singleton manager
    ├── treeSitterUtils.ts  # Low-level parsing utilities
    └── treeSitterWorker.ts # Worker thread implementation
```

**Import Patterns**:
```typescript
// From plugin code (recommended)
import { generateAst } from '../../sharedPluginUtils/astUtils';
import { treeSitterManager } from '../../sharedPluginUtils/astUtils/treeSitterManager';

// From package exports
import { generateAst, treeSitterManager } from '@x-fidelity/plugins';
```

**Key Exports from sharedPluginUtils**:
- `generateAst()`: Main AST generation function
- `generateAstFromFileData()`: FileData-based AST generation
- `generateAstFromCode()`: Code string-based AST generation
- `treeSitterManager`: Singleton Tree-sitter manager
- `getLanguageFromPath()`: File extension to language mapping

### References
1. [sharedPluginUtils/index.ts](../../packages/x-fidelity-plugins/src/sharedPluginUtils/index.ts)
2. [sharedPluginUtils/astUtils/index.ts](../../packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils/index.ts)

---
