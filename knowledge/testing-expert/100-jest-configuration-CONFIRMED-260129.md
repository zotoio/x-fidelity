# Topic: Jest Configuration Patterns

## Fact: Base Jest Configuration Uses ts-jest Preset
### Modified: 2026-01-29
### Priority: H

All X-Fidelity packages use `ts-jest` as the preset for TypeScript transformation. The base configuration pattern includes:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        outDir: "./dist",
        rootDir: "./src",
        isolatedModules: true,
        resolveJsonModule: true,
        types: ["@types/node", "@types/jest"]
      }
    }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"]
};
```

The `isolatedModules: true` setting improves compilation speed by skipping type-checking during test runs.

### References
1. [Core jest.config.js](../../packages/x-fidelity-core/jest.config.js)
2. [VSCode jest.config.js](../../packages/x-fidelity-vscode/jest.config.js)

---

## Fact: Module Name Mapping for Monorepo Packages
### Modified: 2026-01-29
### Priority: H

Jest configurations use `moduleNameMapper` to resolve cross-package imports within the monorepo. Each package maps its sibling packages:

```javascript
moduleNameMapper: {
  "^@x-fidelity/core/(.*)$": "<rootDir>/src/$1",
  "^@x-fidelity/types/(.*)$": "<rootDir>/../x-fidelity-types/src/$1",
  "^@x-fidelity/types$": "<rootDir>/../x-fidelity-types/src/index",
  "^@x-fidelity/plugins/(.*)$": "<rootDir>/../x-fidelity-plugins/src/$1",
  "^@x-fidelity/plugins$": "<rootDir>/../x-fidelity-plugins/src/index"
}
```

VSCode extension uses `dist/` paths for compiled dependencies and mocks third-party modules:

```javascript
moduleNameMapper: {
  '^vscode$': '<rootDir>/src/test/mocks/vscode.mock.ts',
  '^@x-fidelity/core$': '<rootDir>/../x-fidelity-core/dist/index.js',
  '^glob$': '<rootDir>/src/test/mocks/glob.mock.ts'
}
```

### References
1. [Core jest.config.js](../../packages/x-fidelity-core/jest.config.js)
2. [VSCode jest.config.js](../../packages/x-fidelity-vscode/jest.config.js)

---

## Fact: Jest Setup Files for Test Environment Preparation
### Modified: 2026-01-29
### Priority: H

Each package uses `setupFilesAfterEnv` to configure the test environment before tests run. The core package setup (`jest.setup.js`) provides:

1. **Global timeout configuration**: `jest.setTimeout(10000)`
2. **External dependency mocking**: Mocks `glob` to avoid native dependency issues
3. **Console output suppression**: Silences all console methods during tests
4. **Silent logger injection**: Creates a `SilentLogger` class and injects it via `LoggerProvider`
5. **Test isolation**: Clears logger state between tests with `beforeEach`/`afterEach` hooks

The VSCode extension uses a TypeScript setup file (`jest.setup.ts`) that:
- Mocks console methods
- Sets `NODE_ENV=test`
- Uses real timers by default
- Clears all mocks in `beforeEach`

### References
1. [Core jest.setup.js](../../packages/x-fidelity-core/jest.setup.js)
2. [VSCode jest.setup.ts](../../packages/x-fidelity-vscode/src/test/setup/jest.setup.ts)

---

## Fact: Test Match Patterns for Unit vs Integration Tests
### Modified: 2026-01-29
### Priority: M

Jest configurations use conditional `testMatch` patterns to separate unit and integration tests. The core package uses environment variables:

```javascript
testMatch: process.env.JEST_INTEGRATION ? [
  "**/*.integration.test.ts"
] : [
  "**/__tests__/**/*.+(ts|tsx|js)",
  "**/?(*.)+(spec|test).+(ts|tsx|js)",
  "!**/*.integration.test.ts"
]
```

VSCode extension uses explicit path patterns:

```javascript
testMatch: ['**/test/unit/**/*.test.ts', '**/src/**/*.unit.test.ts'],
testPathIgnorePatterns: ['/node_modules/', '/src/test/integration/']
```

Running integration tests: `JEST_INTEGRATION=true yarn test`

### References
1. [Core jest.config.js](../../packages/x-fidelity-core/jest.config.js)
2. [VSCode jest.config.js](../../packages/x-fidelity-vscode/jest.config.js)
