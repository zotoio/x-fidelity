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
- [x] Create script to bundle fixture files into JSON
- [x] Bundle `node-fullstack` fixture:
  - [x] All source files with content
  - [x] package.json parsed
  - [x] File tree structure
  - [x] File metadata (extensions, paths)
- [x] Create fixture type definitions
- [x] Create fixture loader utility for browser
- [x] Add fixture metadata (description, what rules it triggers)
- [x] Optimize bundle size (exclude binary files, large files)

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
- [x] Bundle script runs successfully
- [x] `node-fullstack.json` contains all relevant fixture files (33 files)
- [x] Bundle size is reasonable (< 500KB for text files) - 113.32 KB
- [x] Fixture loader can retrieve file content by path
- [x] Fixture loader can list all files
- [x] TypeScript types correctly represent fixture structure
- [x] Binary files and node_modules excluded

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
- Agent: xfi-engineer
- Started: 2026-01-18T09:44:00Z
- Completed: 2026-01-18T09:47:00Z

### Work Log
1. Created `scripts/bundle-fixtures.mjs` - Build-time bundling script that:
   - Walks the fixture directory recursively
   - Excludes binary files, lock files, cache dirs, log files, and hidden files
   - Truncates files larger than 50KB with indicator
   - Generates JSON bundle with file content, metadata, and tree structure
   - Reports bundle statistics and validates JSON output

2. Created `src/lib/fixtures/types.ts` - TypeScript type definitions:
   - `FileEntry` - Individual file with content, extension, size
   - `FileTreeNode` - Hierarchical tree structure
   - `FixtureBundle` - Complete bundle with files, package.json, metadata
   - `FixtureInfo` - Fixture metadata and rule triggers
   - `FileFilterOptions` and `FileSearchResult` for querying

3. Created `src/lib/fixtures/metadata.ts` - Fixture descriptions:
   - `nodeFullstackFixtureInfo` - Detailed fixture metadata
   - `ruleDescriptions` - Human-readable rule descriptions with severity
   - `filePatternRuleTriggers` - File-to-rule mapping
   - Helper functions: `getAvailableFixtures()`, `getFixtureInfo()`, `getRulesForFile()`

4. Created `src/lib/fixtures/index.ts` - Fixture loader utility:
   - `FixtureLoader` class with full API for loading and querying fixtures
   - Methods: `load()`, `getFile()`, `listFiles()`, `searchFiles()`, `getFileTree()`
   - Dynamic import for lazy loading of JSON bundles
   - Singleton `fixtureLoader` instance and `loadFixture()` helper

5. Generated `src/lib/fixtures/node-fullstack.json` - Bundled fixture data:
   - 33 files included (source files, configs, docs)
   - Bundle size: 113.32 KB (well under 500KB target)
   - All 15 node-fullstack archetype rules represented

6. Updated `package.json` with new scripts:
   - `bundle:fixtures` - Manual bundle generation
   - `prebuild` - Automatic rebundle before build

### Blockers Encountered
- Initial bundle was 2.7MB due to including .xfiResults/, .vscode-test-user-data/, and log files
- Resolved by adding comprehensive exclusion patterns

### Files Modified
- `website/rule-builder/scripts/bundle-fixtures.mjs` (created)
- `website/rule-builder/src/lib/fixtures/types.ts` (created)
- `website/rule-builder/src/lib/fixtures/metadata.ts` (created)
- `website/rule-builder/src/lib/fixtures/index.ts` (created)
- `website/rule-builder/src/lib/fixtures/node-fullstack.json` (generated)
- `website/rule-builder/package.json` (updated with scripts)
