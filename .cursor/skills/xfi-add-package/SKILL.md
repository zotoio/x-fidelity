---
name: xfi-add-package
description: Guide for creating a new package in the X-Fidelity monorepo. Use when adding new packages, setting up monorepo structure, or configuring workspace dependencies.
---

# Creating a New Monorepo Package

This skill guides you through adding a new package to the X-Fidelity monorepo.

## Quick Start Checklist

```
New Package Creation:
- [ ] Step 1: Create package directory structure
- [ ] Step 2: Create package.json
- [ ] Step 3: Create tsconfig.json
- [ ] Step 4: Create jest.config.js
- [ ] Step 5: Create source files
- [ ] Step 6: Register in root workspace
- [ ] Step 7: Update turbo.json if needed
- [ ] Step 8: Build and test
```

## Package Structure

```
packages/x-fidelity-{name}/
├── src/
│   ├── index.ts              # Main entry point and exports
│   └── *.ts                  # Source files
├── dist/                     # Build output (gitignored)
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest test configuration
├── jest.setup.js             # Jest setup (if needed)
└── README.md                 # Package documentation
```

## Step 1: Create Directory Structure

```bash
mkdir -p packages/x-fidelity-{name}/src
```

## Step 2: Create package.json

**File**: `packages/x-fidelity-{name}/package.json`

```json
{
  "name": "@x-fidelity/{name}",
  "version": "0.0.0-semantically-released",
  "description": "Description of the package",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "module": "dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./*": "./dist/*"
  },
  "scripts": {
    "build": "tsc",
    "clean": "rimraf dist",
    "dev": "tsc --watch",
    "test": "yarn check-types && yarn lint && jest",
    "test:unit": "yarn check-types && yarn lint && jest",
    "test:integration": "yarn check-types && yarn lint && jest --testMatch='**/*.integration.test.ts' --passWithNoTests",
    "test:coverage": "yarn check-types && yarn lint && jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "check-types": "tsc --noEmit"
  },
  "repository": "git@github.com:zotoio/x-fidelity.git",
  "author": "wyvern8 <io@zoto.io>",
  "license": "MIT",
  "engines": {
    "node": ">=22.16.0",
    "yarn": ">=1.22.0"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/node": "^22.10.5",
    "eslint": "^9.29.0",
    "jest": "^30.0.2",
    "rimraf": "^6.0.1",
    "ts-jest": "^29.4.0",
    "typescript": "^5.8.3"
  },
  "dependencies": {}
}
```

### Adding Internal Dependencies

To depend on other X-Fidelity packages:

```json
{
  "dependencies": {
    "@x-fidelity/types": "workspace:*",
    "@x-fidelity/core": "workspace:*"
  }
}
```

## Step 3: Create tsconfig.json

**File**: `packages/x-fidelity-{name}/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "references": []
}
```

### Adding TypeScript References

If your package depends on other packages, add references:

```json
{
  "references": [
    { "path": "../x-fidelity-types" },
    { "path": "../x-fidelity-core" }
  ]
}
```

## Step 4: Create jest.config.js

**File**: `packages/x-fidelity-{name}/jest.config.js`

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts', '!**/*.integration.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  // Coverage thresholds are managed centrally in ../../coverage-thresholds.config.js
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@x-fidelity/{name}/(.*)$': '<rootDir>/src/$1',
    '^@x-fidelity/{name}$': '<rootDir>/src/index'
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  },
  reporters: [
    'default',
    ['<rootDir>/../../scripts/simple-json-reporter.js', {
      outputPath: './jest-results.json'
    }]
  ]
};
```

### Create jest.setup.js

**File**: `packages/x-fidelity-{name}/jest.setup.js`

```javascript
// Jest setup file
// Add any global test setup here

// Increase timeout for async tests
jest.setTimeout(30000);
```

## Step 5: Create Source Files

**File**: `packages/x-fidelity-{name}/src/index.ts`

```typescript
// Main entry point - export public API

export { myFunction } from './myFunction';
export type { MyType } from './types';
```

**File**: `packages/x-fidelity-{name}/src/myFunction.ts`

```typescript
/**
 * Example function
 */
export function myFunction(): string {
    return 'Hello from {name}';
}
```

**File**: `packages/x-fidelity-{name}/src/myFunction.test.ts`

```typescript
import { myFunction } from './myFunction';

describe('myFunction', () => {
    it('should return greeting', () => {
        expect(myFunction()).toBe('Hello from {name}');
    });
});
```

## Step 6: Register in Root Workspace

Edit `package.json` at repository root:

```json
{
  "workspaces": {
    "packages": [
      "packages/x-fidelity-cli",
      "packages/x-fidelity-core",
      "packages/x-fidelity-{name}",
      // ... other packages
    ]
  }
}
```

### Special Cases: nohoist

If your package has special dependencies (like VSCode extension), add to nohoist:

```json
{
  "workspaces": {
    "nohoist": [
      "**/x-fidelity-{name}",
      "**/x-fidelity-{name}/**"
    ]
  }
}
```

## Step 7: Update turbo.json (if needed)

If your package has special build requirements:

**File**: `turbo.json`

```json
{
  "pipeline": {
    "x-fidelity-{name}#build": {
      "dependsOn": ["@x-fidelity/types#build"],
      "outputs": ["dist/**"]
    }
  }
}
```

## Step 8: Build and Test

```bash
# Install dependencies
yarn install

# Build all packages (respects dependencies)
yarn build

# Test your new package
yarn workspace @x-fidelity/{name} test

# Run all tests
yarn test
```

## Package Naming Convention

| Package Type | Name Format | Example |
|--------------|-------------|---------|
| Internal library | `@x-fidelity/{name}` | `@x-fidelity/types` |
| CLI tool | `x-fidelity` | Published to npm |
| VSCode extension | `x-fidelity-vscode` | Published to marketplace |

## Package Dependencies Order

The dependency graph flows:

```
@x-fidelity/types
      ↓
@x-fidelity/core ← @x-fidelity/plugins
      ↓                    ↓
x-fidelity (CLI)    x-fidelity-vscode
```

Ensure your package fits correctly in this hierarchy.

## Common Tasks

### Add External Dependency

```bash
# Add to specific package
yarn workspace @x-fidelity/{name} add some-package

# Add dev dependency
yarn workspace @x-fidelity/{name} add -D some-package
```

### Build Single Package

```bash
yarn workspace @x-fidelity/{name} build
```

### Run Package Tests

```bash
yarn workspace @x-fidelity/{name} test
```

### Watch Mode

```bash
yarn workspace @x-fidelity/{name} dev
```

## Best Practices

1. **Keep packages focused** - Single responsibility
2. **Use workspace dependencies** - `workspace:*` for internal deps
3. **100% test coverage** - Required for all packages
4. **Export types** - Use index.ts for public API
5. **Document exports** - JSDoc comments on public functions
6. **Follow naming** - Consistent with existing packages

## Files Reference

| Purpose | Location |
|---------|----------|
| Root workspace | `package.json` (root) |
| Turbo config | `turbo.json` |
| Base TypeScript | `tsconfig.base.json` |
| Coverage config | `coverage-thresholds.config.js` |
| Example package | `packages/x-fidelity-types/` |
