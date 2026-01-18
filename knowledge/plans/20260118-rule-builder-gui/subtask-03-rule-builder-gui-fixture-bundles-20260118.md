# Subtask: JSON Fixture Bundles for Simulation

## Metadata
- **Subtask ID**: 03
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: None
- **Created**: 20260118

## Objective
Create JSON bundles of the test fixture data from `packages/x-fidelity-fixtures/node-fullstack` that can be loaded in the browser for rule simulation. This enables the Rule Builder to run rules against realistic sample data without requiring a backend.

## Deliverables Checklist
- [ ] Create script to bundle fixture files into JSON
- [ ] Bundle `node-fullstack` fixture:
  - [ ] All source files with content
  - [ ] package.json parsed
  - [ ] File tree structure
  - [ ] File metadata (extensions, paths)
- [ ] Create fixture type definitions
- [ ] Create fixture loader utility for browser
- [ ] Add fixture metadata (description, what rules it triggers)
- [ ] Optimize bundle size (exclude binary files, large files)

## Files to Create
```
website/rule-builder/
├── scripts/
│   └── bundle-fixtures.ts            # Build-time script
├── src/lib/fixtures/
│   ├── index.ts                      # Fixture loader
│   ├── types.ts                      # Fixture type definitions
│   ├── node-fullstack.json           # Bundled fixture data
│   └── metadata.ts                   # Fixture descriptions
```

## Definition of Done
- [ ] Bundle script runs successfully
- [ ] `node-fullstack.json` contains all relevant fixture files
- [ ] Bundle size is reasonable (< 500KB for text files)
- [ ] Fixture loader can retrieve file content by path
- [ ] Fixture loader can list all files
- [ ] TypeScript types correctly represent fixture structure
- [ ] Binary files and node_modules excluded

## Implementation Notes

### Fixture Bundle Format
```typescript
// node-fullstack.json structure
interface FixtureBundle {
  name: string;
  description: string;
  files: {
    [path: string]: {
      content: string;
      extension: string;
      size: number;
    };
  };
  packageJson: Record<string, any>;
  fileTree: FileTreeNode[];
  metadata: {
    totalFiles: number;
    languages: string[];
    triggersRules: string[];  // Which demo rules this fixture triggers
  };
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}
```

### Bundle Script
```typescript
// scripts/bundle-fixtures.ts
import * as fs from 'fs';
import * as path from 'path';

const FIXTURE_PATH = '../../packages/x-fidelity-fixtures/node-fullstack';
const OUTPUT_PATH = './src/lib/fixtures/node-fullstack.json';

// Exclude patterns
const EXCLUDE = [
  'node_modules',
  '.git',
  '*.png', '*.jpg', '*.gif',  // Binary files
  '*.lock',                     // Lock files are large
];

function bundleFixture() {
  // Walk directory, read files, build JSON structure
  // ...
}
```

### Fixture Loader API
```typescript
// index.ts
export class FixtureLoader {
  private bundle: FixtureBundle;
  
  async load(fixtureName: string): Promise<void>;
  getFile(path: string): string | null;
  listFiles(pattern?: string): string[];
  getPackageJson(): Record<string, any>;
  getFileTree(): FileTreeNode[];
}
```

### Files to Include from node-fullstack
Priority files for rule testing:
- `src/**/*.ts` - TypeScript source files
- `src/**/*.tsx` - React components
- `src/**/*.js` - JavaScript files
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `*.md` - Markdown files
- `*.json` - Config files

### Size Optimization
- Exclude `node_modules/`
- Exclude binary files (images, fonts)
- Exclude `yarn.lock` (large)
- Truncate very large files (> 50KB) with indicator

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Run bundle script and verify output
- Check JSON is valid and parseable
- Verify file count matches expectations
- Manual spot-check of file contents
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
