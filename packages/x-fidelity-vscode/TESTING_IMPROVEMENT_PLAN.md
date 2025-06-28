# X-Fidelity VS Code Extension: Comprehensive Testing Improvement Plan

## 1. Introduction and Current State Analysis

This document outlines a strategic and phased approach to significantly enhance the testing infrastructure and coverage for the X-Fidelity Visual Studio Code extension. The goal is to build a robust, reliable, and maintainable test suite that ensures high quality, prevents regressions, and facilitates confident development and deployment.

### 1.1. Current State Overview

The X-Fidelity VS Code extension currently has a foundational testing setup, primarily leveraging `@vscode/test-cli` and Mocha. However, several critical areas require immediate attention and long-term strategic improvement:

*   **Test Execution Instability:** The most pressing issue is the inconsistent and often failing execution of the existing test suite. This is primarily attributed to:
    *   **`package.json` Script Misconfigurations:** Incorrect command-line argument parsing for `vscode-test`, leading to `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined` errors. This indicates that the test runner is not correctly identifying the test entry point or configuration.
    *   **JSON Syntax Errors:** Previous attempts to modify `package.json` introduced unescaped characters, rendering the JSON invalid and preventing `yarn` from parsing the file.
    *   **Direct CLI Execution in Tests (Resolved by Mocking):** Attempting to spawn the `x-fidelity-cli` as a separate process directly from within the VS Code extension tests has proven problematic due to environment complexities and path resolution issues within the `vscode-test` harness. **This has been addressed by mocking the CLI interaction within the extension's tests.**
*   **Undefined Test Strategy:** While `.vscode-test.mjs` defines various test labels (unitTests, integrationTests, e2eTests, comprehensiveTests, progressTests, consistencyTests, allTests). While this categorization is a good start, the actual implementation lacks clear distinctions in scope, methodology, and purpose for each test type. This ambiguity can lead to:
    *   **Overlapping Tests:** Redundant tests across different categories, increasing execution time and maintenance burden.
    *   **Unclear Coverage:** Difficulty in determining what specific functionalities are covered by which test type, leading to potential gaps.
    *   **Maintenance Overhead:** Without clear guidelines, developers might write tests that don't align with the intended strategy, making the suite harder to maintain and extend.
*   **Limited Comprehensive Coverage (Implied):** Although test files exist, the depth and breadth of testing for critical extension functionalities (e.g., complex UI interactions, intricate analysis logic, edge-case handling, performance under load) appear to be insufficient. The presence of `src/test/runTest.ts` as a placeholder further suggests that the core test runner logic might be rudimentary or incomplete.
*   **CI/CD Integration Challenges:** The instability of local test execution directly impacts the reliability of Continuous Integration (CI) pipelines. Unreliable tests lead to false positives/negatives, eroding developer trust in the CI system.
*   **VS Code API Testing Nuances:** Testing VS Code extensions involves unique challenges, such as:
    *   **Running within a VS Code Instance:** Tests must execute within a specialized "Extension Development Host" to access the VS Code API.
    *   **Activation Events:** Correctly testing extension activation and deactivation, especially `onStartupFinished` and `workspaceContains` events.
    *   **UI Interaction:** Simulating user interactions with commands, webviews, tree views, and other UI elements.
    *   **Workspace Management:** Opening, closing, and manipulating workspace folders during tests.
    *   **Extension Dependencies:** Managing and disabling other extensions during testing to ensure isolation.

### 1.2. Project Context and Goals

The X-Fidelity project is a sophisticated code analysis and quality management framework. The VS Code extension is a critical component, providing developers with direct, in-editor feedback and control. Therefore, a robust testing strategy is paramount to ensure the extension's reliability, accuracy, and user experience.

**Primary Goals of this Testing Improvement Plan:**

1.  **Achieve Stable and Reliable Test Execution:** Eliminate all current test execution failures, ensuring that the test suite runs consistently and produces accurate results across development and CI environments.
2.  **Establish a Clear and Comprehensive Test Strategy:** Define distinct roles and responsibilities for Unit, Integration, and End-to-End (E2E) tests, aligning with industry best practices and VS Code extension testing guidelines.
3.  **Maximize Test Coverage:** Systematically identify and address gaps in test coverage for all core features, UI interactions, API integrations, and critical user workflows.
4.  **Enable Robust CI/CD Integration:** Seamlessly integrate the stable and comprehensive test suite into the GitHub Actions pipeline, providing automated, continuous validation of code changes.
5.  **Optimize Test Performance:** Ensure that tests run efficiently, providing quick feedback to developers without becoming a bottleneck in the development cycle.
6.  **Improve Test Maintainability:** Design tests that are easy to understand, write, and maintain as the extension evolves.

## 2. Proposed Test Strategy and Structure (Layered Approach)

We will implement a layered testing approach, often visualized as a "testing pyramid," to ensure comprehensive coverage and efficient feedback.

```
          /|\
         / | \
        / E2E \  (Slow, High Fidelity, User Flows)
       /------- \
      / Integration \ (Medium Speed, Component Interaction, API)
     /-------------- \
    /      Unit       \ (Fast, Isolated Logic, Mocked Dependencies)
   /------------------- \
  ------------------------
```

### 2.1. Test Directory Structure

To support this layered approach, we will formalize the test directory structure within `packages/x-fidelity-vscode/`:

```
packages/x-fidelity-vscode/
├── src/
│   ├── ... (source code files)
│   └── test/
│       ├── unit/             # Unit tests for isolated modules
│       │   ├── analysis/
│       │   │   └── analysisManager.test.ts
│       │   ├── configuration/
│       │   │   └── configManager.test.ts
│       │   └── ... (other unit test files mirroring src structure)
│       ├── integration/    # Integration tests for component interaction and VS Code API
│       │   ├── commands.test.ts
│       │   ├── diagnostics.test.ts
│       │   └── ...
│       ├── e2e/            # End-to-End tests for full user workflows
│       │   ├── fullAnalysisWorkflow.test.ts
│       │   ├── settingsUI.test.ts
│       │   └── ...
│       └── suite/          # Test runner entry point (index.ts)
│           └── index.ts    # Dynamically loads tests based on TEST_PATTERN
├── .vscode-test.mjs      # Configuration for @vscode/test-cli
├── tsconfig.test.json    # TypeScript configuration for tests
└── package.json          # npm scripts for running tests
```

### 2.2. Test Types and Their Roles

#### 2.2.1. Unit Tests

*   **Purpose:** To test the smallest testable parts of the extension (individual functions, classes, methods) in isolation. They verify the correctness of business logic, algorithms, and data transformations without external dependencies.
*   **Scope:** Focus on internal logic. Mock all external dependencies, including the VS Code API, file system operations, network requests, and interactions with other X-Fidelity packages (`@x-fidelity/core`, `@x-fidelity/plugins`, `@x-fidelity/types`).
*   **Characteristics:**
    *   **Fast:** Execute quickly, enabling rapid feedback during development.
    *   **Isolated:** Each test should run independently, without affecting or being affected by other tests.
    *   **Deterministic:** Produce the same results every time they are run, given the same inputs.
    *   **Granular:** Pinpoint the exact location of a bug.
*   **Tools:**
    *   **Test Framework:** Jest (preferred, given its existing use in other X-Fidelity packages) or Mocha/Chai (as used by `@vscode/test-cli`). Given the existing Jest setup in other packages, we should aim to consolidate on Jest for unit tests where possible, or ensure clear separation if Mocha is preferred for extension-specific unit tests.
    *   **Assertion Library:** Jest's `expect` or Node.js `assert`.
    *   **Mocking Library:** Jest's built-in mocking or Sinon.js for more advanced mocking scenarios.
*   **Naming Convention:** `*.test.ts` (e.g., `analysisManager.test.ts`).
*   **Location:** `src/test/unit/` mirroring the `src/` directory structure for easy navigation and co-location with the code under test.

#### 2.2.2. Integration Tests

*   **Purpose:** To verify the interactions between different components of the extension, or between the extension and a subset of the VS Code API. These tests ensure that modules work correctly when combined.
*   **Scope:** Test the integration points. For example, testing if a command correctly triggers an analysis, if diagnostics are updated based on analysis results, or if a webview panel renders correctly with data from the extension. These tests run within a *minimal* VS Code instance launched by `@vscode/test-cli`.
*   **Characteristics:**
    *   **Medium Speed:** Slower than unit tests due to the overhead of launching a VS Code instance.
    *   **Broader Scope:** Cover interactions between multiple units.
    *   **Realistic Environment:** Run in an environment closer to the actual VS Code runtime.
*   **Tools:**
    *   **Test Runner:** `@vscode/test-cli` and `@vscode/test-electron`.
    *   **Test Framework:** Mocha (as mandated by `@vscode/test-cli`'s underlying implementation).
    *   **Assertion Library:** Node.js `assert` or Chai.
    *   **VS Code API:** Direct interaction with the `vscode` module.
*   **Naming Convention:** `*.integration.test.ts` (e.g., `commands.integration.test.ts`).
*   **Location:** `test/integration/`.

#### 2.2.3. End-to-End (E2E) Tests

*   **Purpose:** To simulate real user scenarios and workflows, verifying the entire system from the user's perspective, including UI interactions and the full integration with a running VS Code instance. These tests ensure that critical user journeys function as expected.
*   **Scope:** Cover complete user flows, from activating the extension to interacting with its UI, triggering complex operations, and verifying the final state. These tests will run in a headless VS Code instance using XVFB.
*   **Characteristics:
    *   **Slowest:** Involve launching a full VS Code instance and potentially interacting with its UI, making them the slowest tests.
    *   **Highest Fidelity:** Provide the most confidence that the extension works as intended for end-users.
    *   **Fragile:** Can be brittle due to UI changes or timing issues.
*   **Tools:**
    *   **Test Runner:** `@vscode/test-cli` and `@vscode/test-electron`.
    *   **Headless Environment:** `xvfb-run` for running VS Code headlessly on CI/Linux environments.
    *   **UI Automation (Optional but Recommended):** While `vscode-test` allows some programmatic UI interaction, for complex UI flows, a dedicated UI automation framework like Spectron (for Electron apps) might be considered if direct VS Code API interactions prove insufficient. However, for a VS Code extension, direct VS Code API calls are often sufficient for E2E.
    *   **Assertion Library:** Node.js `assert` or Chai.
*   **Naming Convention:** `*.e2e.test.ts` (e.g., `fullAnalysisWorkflow.e2e.test.ts`).
*   **Location:** `test/e2e/`.

## 3. Detailed Implementation Plan (Phased Approach)

This plan is structured into phases, with each phase building upon the previous one.

### Phase 1: Foundation & Stabilization (Immediate Priority)

**Goal:** Achieve stable and reliable execution of the existing test suite, and establish the foundational test directory structure.

#### 3.1.1. Step 1.1: Fix Current Test Execution

**Problem:** The `yarn test` command in `packages/x-fidelity-vscode/package.json` is failing due to incorrect command-line arguments for the `@vscode/test-cli` runner and potential JSON syntax issues. The `extensionTestsPath` in `.vscode-test.mjs` might also be misconfigured.

**Actions:**

1.  **Verify `package.json` JSON Syntax:**
    *   Manually inspect `packages/x-fidelity-vscode/package.json` for any unescaped backslashes or other JSON syntax errors.
    *   Use a JSON linter/validator to ensure the file is syntactically correct.
    *   **Correction:** Ensure all backslashes in string literals (especially in `help` or `quick-start` scripts) are properly escaped (`\\`).
2.  **Correct `vscode-test` Command Syntax in `package.json`:**
    *   The `vscode-test` command expects the test runner script path as a positional argument, followed by options like `--config` and `--label`.
    *   **Correction:** Update the `test`, `test:unit`, `test:integration`, `test:e2e`, `test:ci`, and `test:watch` scripts in `packages/x-fidelity-vscode/package.json` to use the correct syntax.
    *   **Example `package.json` script updates:**
        ```json
        {
          "scripts": {
            "test": "yarn lint:fix && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label all",
            "test:unit": "mkdir -p ./vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label unit",
            "test:integration": "mkdir -p ./.vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label integration",
            "test:e2e": "mkdir -p ./.vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label e2e",
            "test:ci": "mkdir -p ./.vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label all",
            "test:all": "yarn test:unit && yarn test:integration && yarn test:e2e",
            "test:watch": "mkdir -p ./.vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label unit --watch"
          }
        }
        ```
3.  **Verify `extensionTestsPath` in `.vscode-test.mjs`:**
    *   Ensure that `extensionTestsPath` in each configuration object within `.vscode-test.mjs` correctly points to the compiled JavaScript entry point for the tests.
    *   **Correction:** It should be `./out/test/suite/index.js`.
    *   **Example `.vscode-test.mjs` snippet:**
        ```javascript
        // .vscode-test.mjs
        import { defineConfig } from '@vscode/test-cli';

        export default defineConfig([
          {
            label: 'unit',
            extensionTestsPath: './out/test/suite/index.js', // Correct path
            // ... other configurations
          },
          // ... other test configurations
        ]);
        ```
4.  **Ensure `src/test/runTest.ts` and `src/test/suite/index.ts` are Correct:**
    *   **`src/test/runTest.ts`:** This file is typically responsible for downloading VS Code and launching the test runner. It uses `@vscode/test-electron`'s `runTests` function. Verify that `extensionDevelopmentPath` and `extensionTestsPath` are correctly resolved.
        ```typescript
        // src/test/runTest.ts (simplified example)
        import * as path from 'path';
        import { runTests } from '@vscode/test-electron';

        async function main() {
          try {
            const extensionDevelopmentPath = path.resolve(__dirname, '../../'); // Points to packages/x-fidelity-vscode
            const extensionTestsPath = path.resolve(__dirname, './suite/index'); // Points to out/test/suite/index.js after compilation

            await runTests({ extensionDevelopmentPath, extensionTestsPath });
          } catch (err) {
            console.error('Failed to run tests:', err);
            process.exit(1);
          }
        }
        main();
        ```
    *   **`src/test/suite/index.ts`:** This is the actual test runner script that `vscode-test` executes. It should use `glob` to discover test files based on `TEST_PATTERN` environment variable and then run them using Mocha.
        ```typescript
        // src/test/suite/index.ts (simplified example)
        import * as path from 'path';
        import * as Mocha from 'mocha';
        import { glob } from 'glob';

        export function run(): Promise<void> {
          const mocha = new Mocha({
            ui: 'bdd',
            color: true,
            timeout: process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT) : 60000 // Use TEST_TIMEOUT from env
          });

          // The testsRoot is where the compiled test files are located (e.g., out/test)
          const testsRoot = path.resolve(__dirname, '../../out/test'); // Adjust based on actual compiled output path

          const testPattern = process.env.TEST_PATTERN || '**/*.test.js'; // Use TEST_PATTERN from env

          return new Promise((c, e) => {
            glob(testPattern, { cwd: testsRoot }).then((files) => {
              files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

              try {
                mocha.run(failures => {
                  if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                  } else {
                    c();
                  }
                });
              } catch (err) {
                e(err);
              }
            }).catch((err) => {
              e(err);
            });
          });
        }
        ```
        *   **Note:** The `testsRoot` path in `src/test/suite/index.ts` is crucial. It must correctly point to the directory where the TypeScript test files are compiled into JavaScript. Based on `tsconfig.test.json`'s `outDir: "out/test"`, the compiled tests will be in `packages/x-fidelity-vscode/out/test`. Therefore, `path.resolve(__dirname, '../../out/test')` seems correct if `index.ts` is compiled to `out/test/suite/index.js`.

**Verification:**

*   Run `yarn test` in `packages/x-fidelity-vscode/`.
*   Observe the output for successful compilation and test execution.
*   Ensure no JSON parsing errors or `ERR_INVALID_ARG_TYPE` errors occur.

#### 3.1.2. Step 1.2: Initial Test Restructuring

**Problem:** Existing tests might not be consistently organized according to the new layered strategy.

**Actions:**

1.  **Create New Test Directories:**
    *   `mkdir -p packages/x-fidelity-vscode/test/unit`
    *   `mkdir -p packages/x-fidelity-vscode/test/integration`
    *   `mkdir -p packages/x-fidelity-vscode/test/e2e`
2.  **Move Existing Tests:**
    *   Carefully review existing test files (e.g., `src/test/suite/comprehensive.test.ts`, `src/test/suite/progressManager.test.ts`, `src/test/unit/configuration.test.ts`, `src/test/unit/extension.test.ts`, `src/test/e2e/analysisWorkflow.test.ts`, `src/test/integration/errorHandling.test.ts`, `src/test/integration/ui.test.ts`, `src/test/integration/workspace.test.ts`).
    *   Move them to their appropriate new locations under `packages/x-fidelity-vscode/test/unit`, `packages/x-fidelity-vscode/test/integration`, or `packages/x-fidelity-vscode/test/e2e`.
    *   **Note:** The `src/test/suite/index.ts` and `src/test/runTest.ts` files should remain in their current locations as they are part of the test runner infrastructure.
3.  **Update `tsconfig.test.json`:**
    *   Modify the `include` array to ensure all new test directories are covered for TypeScript compilation.
    *   **Example `tsconfig.test.json` update:**
        ```json
        {
          "extends": "./tsconfig.json",
          "compilerOptions": {
            "outDir": "out/test",
            "tsBuildInfoFile": "./out/test/.tsbuildinfo",
            "types": ["node", "vscode", "mocha"]
          },
          "include": [
            "src/**/*.ts",
            "test/**/*.ts" // Include all files under the new 'test' directory
          ],
          "exclude": [
            "node_modules",
            ".vscode-test"
          ]
        }
        ```
4.  **Update `.vscode-test.mjs` `TEST_PATTERN`s:**
    *   Adjust the `TEST_PATTERN` environment variables in `.vscode-test.mjs` to correctly point to the new test file locations.
    *   **Example `.vscode-test.mjs` `TEST_PATTERN` updates:**
        ```javascript
        // .vscode-test.mjs
        import { defineConfig } from '@vscode/test-cli';

        export default defineConfig([
          {
            label: 'unit',
            // ...
            env: {
              // ...
              TEST_PATTERN: 'out/test/unit/**/*.test.js'
            }
          },
          {
            label: 'integration',
            // ...
            env: {
              // ...
              TEST_PATTERN: 'out/test/integration/**/*.test.js'
            }
          },
          {
            label: 'e2e',
            // ...
            env: {
              // ...
              TEST_PATTERN: 'out/test/e2e/**/*.test.js'
            }
          },
          {
            label: 'all',
            // ...
            env: {
              // ...
              TEST_PATTERN: 'out/test/**/*.test.js' // Catches all compiled tests
            }
          }
        ]);
        ```

**Verification:**

*   Run `yarn test` again to ensure all tests still pass with the new structure.
*   Manually verify that test files are correctly moved and compiled.

#### 3.1.3. Step 1.3: Basic CI Integration (GitHub Actions)

**Problem:** The current CI setup might not be robust enough to handle the VS Code extension tests, especially headless execution.

**Actions:**

1.  **Update `.github/workflows/ci.yml`:**
    *   Locate the existing CI workflow for the VS Code extension (if any).
    *   Add a dedicated step or modify an existing one to run the `yarn test:ci` script within the `packages/x-fidelity-vscode` directory.
    *   **Example `ci.yml` snippet:**
        ```yaml
        # .github/workflows/ci.yml
        jobs:
          build:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v4
              - uses: actions/setup-node@v4
                with:
                  node-version: '22'
                  cache: 'yarn'
              - name: Install dependencies
                run: yarn install --frozen-lockfile
              - name: Run X-Fidelity VS Code Extension Tests
                run: yarn test:ci
                working-directory: packages/x-fidelity-vscode
        ```
2.  **Ensure XVFB Setup in CI:**
    *   The `xvfb-run` command is used for headless VS Code execution. Ensure the CI environment (e.g., `ubuntu-latest` runner) has XVFB installed and configured. GitHub Actions `ubuntu-latest` runners typically come with XVFB pre-installed.
    *   If not, add a step to install it:
        ```yaml
        - name: Install XVFB (if not present)
          run: |
            sudo apt-get update
            sudo apt-get install -y xvfb
        ```
        *   **Note:** This step might not be strictly necessary for `ubuntu-latest` but is good for robustness.
3.  **Review `launchArgs` for Headless Execution:**
    *   Confirm that the `launchArgs` in `.vscode-test.mjs` include `--no-sandbox`, `--disable-gpu`, and `--disable-dev-shm-usage` which are crucial for headless environments. These are already present.

**Verification:**

*   Push changes to a test branch and observe the GitHub Actions workflow run.
*   Ensure the VS Code extension tests execute successfully in the CI environment.

### Phase 2: Expanding Unit Test Coverage

**Goal:** Systematically increase unit test coverage for core logic, ensuring individual components are robust and correctly implemented.

#### 3.2.1. Step 2.1: Identify Core Modules for Unit Testing

**Actions:**

1.  **Review `src/` Directory:** Go through each TypeScript file in `packages/x-fidelity-vscode/src/` and identify modules containing business logic, utility functions, or data transformations that can be tested in isolation.
2.  **Prioritize:** Focus on modules with complex logic, critical functionality, or a high likelihood of containing bugs.

**Key Modules to Prioritize for Unit Testing:**

*   `src/analysis/analysisManager.ts`: Core analysis orchestration, cancellation logic, error handling.
*   `src/analysis/cacheManager.ts`: Caching logic for analysis results.
*   `src/ast/astManager.ts`: AST parsing and retrieval logic.
*   `src/configuration/configManager.ts`: Configuration loading and merging logic.
*   `src/configuration/defaultDetection.ts`: Archetype detection logic.
*   `src/core/extensionManager.ts`: Extension lifecycle management (activation, deactivation), command registration (mock VS Code API).
*   `src/core/pluginPreloader.ts`: Plugin discovery and loading logic.
*   `src/diagnostics/codeActionProvider.ts`: Logic for generating code actions.
*   `src/diagnostics/diagnosticProvider.ts`: Logic for mapping analysis results to VS Code diagnostics.
*   `src/reports/exportManager.ts`: Logic for converting results to different formats (CSV, Markdown).
*   `src/reports/reportHistoryManager.ts`: Logic for managing report history.
*   `src/reports/reportManager.ts`: Orchestration of reporting features.
*   `src/utils/logger.ts` / `src/utils/vscodeLogger.ts`: Logging functionality (ensure messages are formatted correctly).
*   `src/utils/performanceLogger.ts`: Performance tracking logic.
*   `src/utils/progressManager.ts`: Progress reporting logic.
*   `src/utils/wasmAstUtils.ts`: WASM loading and AST parsing utilities.
*   `src/utils/workspaceUtils.ts`: Workspace path retrieval.

#### 3.2.2. Step 2.2: Implement Mocking Strategy

**Problem:** Unit tests need to run in isolation, meaning all external dependencies (especially the VS Code API) must be mocked.

**Actions:**

1.  **Choose Mocking Library:** Jest's built-in mocking capabilities are powerful and idiomatic for TypeScript projects using Jest. If Mocha is strictly preferred for unit tests, Sinon.js is a strong alternative.
2.  **Develop Mock Objects/Functions:**
    *   **VS Code API Mock:** Create a comprehensive mock for the `vscode` module. This mock should mimic the behavior of `vscode.window`, `vscode.workspace`, `vscode.commands`, `vscode.languages`, `vscode.Uri`, etc.
        *   **Example Mock for `vscode.window.showInformationMessage`:**
            ```typescript
            // __mocks__/vscode.ts (or similar)
            export const window = {
              showInformationMessage: jest.fn(),
              showWarningMessage: jest.fn(),
              showErrorMessage: jest.fn(),
              createOutputChannel: jest.fn(() => ({
                appendLine: jest.fn(),
                show: jest.fn(),
                dispose: jest.fn(),
              })),
              createStatusBarItem: jest.fn(() => ({
                text: '',
                tooltip: '',
                command: '',
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
              })),
              withProgress: jest.fn((options, task) => {
                // Simulate progress completion
                return task({ report: jest.fn() }, { onCancellationRequested: jest.fn() });
              }),
            };

            export const workspace = {
              getConfiguration: jest.fn(() => ({
                get: jest.fn((key, defaultValue) => {
                  // Mock configuration values
                  if (key === 'archetype') return 'node-fullstack';
                  return defaultValue;
                }),
                update: jest.fn(),
              })),
              workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
              onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
              fs: {
                readFile: jest.fn(() => Promise.resolve(Buffer.from('{}'))),
                stat: jest.fn(() => Promise.resolve({ isFile: () => true })),
              },
            };

            export const commands = {
              registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
              executeCommand: jest.fn(),
            };

            export const languages = {
              createDiagnosticCollection: jest.fn(() => ({
                clear: jest.fn(),
                set: jest.fn(),
                dispose: jest.fn(),
              })),
            };

            export const Uri = {
              file: jest.fn((p) => ({ fsPath: p, toString: () => `file://${p}` })),
              parse: jest.fn((u) => ({ fsPath: u.replace('file://', ''), toString: () => u })),
            };

            export enum ExtensionMode { Development, Test, Production }
            export enum DiagnosticSeverity { Error, Warning, Information, Hint }
            export enum ViewColumn { One, Two, Three, Beside }
            export enum StatusBarAlignment { Left, Right }
            export const CancellationTokenSource = jest.fn(() => ({
              token: { isCancellationRequested: false },
              cancel: jest.fn(),
              dispose: jest.fn(),
            }));
            export const Range = jest.fn();
            export const EventEmitter = jest.fn(() => ({
              fire: jest.fn(),
              event: jest.fn(),
            }));
            export const TreeItem = jest.fn();
            export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
            export const CodeAction = jest.fn();
            export const CodeActionKind = { QuickFix: 'quickfix' };
            ```
    *   **Node.js Modules Mock:** Mock `child_process` (`spawn`), `fs` (`readFile`, `writeFile`), and `path` functions as needed.
    *   **Internal Module Mocks:** Mock dependencies between internal modules (e.g., `AnalysisManager` mocking `ConfigManager`).
3.  **Configure Jest (if applicable):**
    *   Ensure `jest.config.js` is set up to use the mock files (e.g., `moduleNameMapper` or `setupFiles`).
    *   **Example `jest.config.js` snippet for mocking `vscode`:**
        ```javascript
        // packages/x-fidelity-vscode/jest.config.js
        module.exports = {
          // ... existing config
          preset: 'ts-jest',
          testEnvironment: 'node', // Or 'jsdom' if testing DOM-related components
          moduleNameMapper: {
            '^vscode$': '<rootDir>/__mocks__/vscode.ts', // Map 'vscode' import to our mock
            // Add other internal module mocks if needed
          },
          setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // For global mocks/setup
          testMatch: ['<rootDir>/test/unit/**/*.test.ts'], // Only run unit tests by default
          // ... other Jest configurations
        };
        ```

#### 3.2.3. Step 2.3: Write Unit Tests

**Actions:**

1.  **Create Test Files:** For each identified module, create a corresponding unit test file in `test/unit/` (e.g., `src/analysis/analysisManager.ts` -> `test/unit/analysis/analysisManager.test.ts`).
2.  **Test Cases:** For each function/method:
    *   **Happy Path:** Test expected inputs and outputs.
    *   **Edge Cases:** Test boundary conditions (empty inputs, nulls, maximum/minimum values).
    *   **Error Handling:** Test how the module behaves when errors occur (e.g., file not found, invalid data, API call failures).
    *   **Asynchronous Operations:** Use `async/await` and Jest's `resolves`/`rejects` matchers for asynchronous code.
    *   **Mock Interactions:** Assert that mocked functions were called with the correct arguments and the expected number of times.

**Example Unit Test (`test/unit/analysis/analysisManager.test.ts`):**

```typescript
import * as vscode from 'vscode'; // This will be our mocked vscode
import { AnalysisManager } from '../../src/analysis/analysisManager';
import { ConfigManager } from '../../src/configuration/configManager';
import { VSCodeLogger } from '../../src/utils/vscodeLogger';
import { CacheManager } from '../../src/analysis/cacheManager';
import { ProgressManager } from '../../src/utils/progressManager';
import { ResultMetadata } from '@x-fidelity/types';

// Mock external dependencies
jest.mock('../../src/configuration/configManager');
jest.mock('../../src/analysis/cacheManager');
jest.mock('../../src/utils/vscodeLogger');
jest.mock('../../src/utils/progressManager');
jest.mock('@x-fidelity/core', () => ({
  AnalysisEngine: jest.fn(() => ({
    run: jest.fn(() => Promise.resolve({
      XFI_RESULT: {
        totalIssues: 5,
        issues: [],
        rules: [],
        metadata: {},
      },
    })),
  })),
}));

describe('AnalysisManager (Unit Tests)', () => {
  let mockContext: vscode.ExtensionContext;
  let mockConfigManager: ConfigManager;
  let mockCacheManager: CacheManager;
  let mockLogger: VSCodeLogger;
  let mockProgressManager: ProgressManager;
  let analysisManager: AnalysisManager;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockContext = {
      extensionPath: '/mock/extension/path',
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      subscriptions: [],
      extension: {
        packageJSON: { version: '1.0.0' },
      },
      extensionMode: vscode.ExtensionMode.Test,
    } as any; // Cast to any to bypass strict type checking for mocks

    mockConfigManager = new (ConfigManager as any)();
    mockCacheManager = new (CacheManager as any)(mockContext);
    mockLogger = new (VSCodeLogger as any)('AnalysisManager');
    mockProgressManager = new (ProgressManager as any)();

    // Mock internal dependencies of AnalysisManager
    (VSCodeLogger as any).mockImplementation(() => mockLogger);
    (CacheManager as any).mockImplementation(() => mockCacheManager);
    (ProgressManager as any).mockImplementation(() => mockProgressManager);

    analysisManager = new AnalysisManager(mockContext, mockConfigManager);
  });

  it('should initialize correctly', () => {
    expect(analysisManager).toBeInstanceOf(AnalysisManager);
    expect(VSCodeLogger).toHaveBeenCalledWith('AnalysisManager');
    expect(CacheManager).toHaveBeenCalledWith(mockContext);
    expect(ProgressManager).toHaveBeenCalledTimes(1);
  });

  describe('runAnalysis', () => {
    it('should run analysis and return results', async () => {
      const mockResults: ResultMetadata = {
        XFI_RESULT: {
          totalIssues: 10,
          issues: [{
            ruleId: 'test-rule',
            message: 'Test issue',
            filePath: '/mock/path/to/file.js',
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
            severity: 'error',
          }],
          rules: [],
          metadata: {},
        },
      };
      (analysisManager as any).engine.run.mockResolvedValue(mockResults);
      (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/mock/workspace' } }];

      const results = await analysisManager.runAnalysis('/mock/workspace', true);

      expect((analysisManager as any).engine.run).toHaveBeenCalledWith(
        '/mock/workspace',
        expect.any(vscode.CancellationToken)
      );
      expect(mockProgressManager.start).toHaveBeenCalledWith('Running X-Fidelity analysis...');
      expect(mockProgressManager.stop).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Analysis completed'));
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'X-Fidelity analysis finished. Found 10 issues.'
      );
      expect(results).toEqual(mockResults);
      expect(analysisManager.isAnalysisRunning()).toBe(false);
    });

    it('should handle analysis cancellation', async () => {
      (analysisManager as any).engine.run.mockImplementation(() => {
        // Simulate cancellation during run
        (analysisManager as any).currentAnalysisCancellationToken.cancel();
        return Promise.resolve({
          XFI_RESULT: {
            totalIssues: 0,
            issues: [],
            rules: [],
            metadata: {},
          },
        });
      });
      (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/mock/workspace' } }];

      const results = await analysisManager.runAnalysis('/mock/workspace', true);

      expect(mockLogger.info).toHaveBeenCalledWith('Analysis was cancelled.');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('X-Fidelity analysis cancelled.');
      expect(results).toBeUndefined();
      expect(analysisManager.isAnalysisRunning()).toBe(false);
    });

    it('should handle analysis errors', async () => {
      const errorMessage = 'Analysis failed due to an internal error.';
      (analysisManager as any).engine.run.mockRejectedValue(new Error(errorMessage));
      (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/mock/workspace' } }];

      const results = await analysisManager.runAnalysis('/mock/workspace', true);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Analysis failed'), expect.any(String));
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        `X-Fidelity analysis failed: ${errorMessage}`
      );
      expect(results).toBeUndefined();
      expect(analysisManager.isAnalysisRunning()).toBe(false);
    });

    it('should not run if analysis is already in progress', async () => {
      (analysisManager as any).analysisRunning = true; // Manually set to running
      await analysisManager.runAnalysis('/mock/workspace', true);

      expect(mockLogger.warn).toHaveBeenCalledWith('Analysis is already in progress.');
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('An analysis is already running.');
      expect((analysisManager as any).engine.run).not.toHaveBeenCalled();
    });
  });

  describe('cancelAnalysis', () => {
    it('should cancel a running analysis', () => {
      (analysisManager as any).analysisRunning = true;
      (analysisManager as any).currentAnalysisCancellationToken = new vscode.CancellationTokenSource();
      const cancelSpy = jest.spyOn((analysisManager as any).currentAnalysisCancellationToken, 'cancel');

      analysisManager.cancelAnalysis();

      expect(mockLogger.info).toHaveBeenCalledWith('Cancelling analysis...');
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no analysis is running', () => {
      analysisManager.cancelAnalysis();
      expect(mockLogger.warn).toHaveBeenCalledWith('No analysis is currently running to cancel.');
    });
  });

  describe('getIssues', () => {
    it('should return issues from cache', async () => {
      const mockIssues = [{ ruleId: 'test-rule', message: 'Test issue' }];
      mockCacheManager.get.mockResolvedValue({ XFI_RESULT: { issues: mockIssues } });
      (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/mock/workspace' } }];

      const issues = await analysisManager.getIssues();
      expect(issues).toEqual(mockIssues);
      expect(mockCacheManager.get).toHaveBeenCalledWith('latest-analysis');
    });

    it('should return empty array if no workspace folder', async () => {
      (vscode.workspace.workspaceFolders as any) = [];
      const issues = await analysisManager.getIssues();
      expect(issues).toEqual([]);
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });
  });
});
```

#### 3.2.4. Step 2.4: Code Coverage Analysis

**Problem:** Without code coverage metrics, it's difficult to assess the effectiveness of unit tests and identify untested areas.

**Actions:**

1.  **Configure Jest for Coverage:**
    *   Add `collectCoverage` and `coverageDirectory` options to `jest.config.js`.
    *   Define `collectCoverageFrom` patterns to include relevant source files.
    *   Set coverage thresholds to enforce minimum coverage percentages.
    *   **Example `jest.config.js` coverage configuration:**
        ```javascript
        // packages/x-fidelity-vscode/jest.config.js
        module.exports = {
          // ... existing config
          preset: 'ts-jest',
          testEnvironment: 'node', // Or 'jsdom' if testing DOM-related components
          moduleNameMapper: {
            '^vscode$': '<rootDir>/__mocks__/vscode.ts', // Map 'vscode' import to our mock
            // Add other internal module mocks if needed
          },
          setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // For global mocks/setup
          testMatch: ['<rootDir>/test/unit/**/*.test.ts'], // Only run unit tests by default
          // ... other Jest configurations
        };
        ```
2.  **Generate Coverage Reports:**
    *   Update the `test:unit` script to generate coverage reports (e.g., `jest --coverage`).
    *   **Example `package.json` script update:**
        ```json
        {
          "scripts": {
            "test:unit": "mkdir -p ./vscode-test-user-data && xvfb-run -a --server-args='-screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp' vscode-test ./out/test/suite/index.js --config .vscode-test.mjs --label unit --coverage",
            // ...
          }
        }
        ```
3.  **Integrate Coverage into CI:**
    *   Add a step in `ci.yml` to upload coverage reports to a service like Codecov or Coveralls, or simply fail the build if thresholds are not met.

**Verification:**

*   Run `yarn test:unit --coverage` and review the generated coverage report.
*   Adjust tests to meet the defined coverage thresholds.

### Phase 3: Robust Integration Testing

**Goal:** Verify the interaction between different components of the extension and its integration with the VS Code API.

#### 3.3.1. Step 3.1: Define Integration Test Scenarios

**Actions:**

1.  **Brainstorm Scenarios:** Based on the extension's features and the VS Code API it uses, identify key integration points.

**Key Integration Test Scenarios:**

*   **Extension Lifecycle:**
    *   Activation: Verify `activate` function runs, commands are registered, status bar item appears.
    *   Deactivation: Verify `deactivate` function runs, disposables are cleaned up.
*   **Command Execution:**
    *   `xfidelity.runAnalysis`: Verify it triggers `AnalysisManager.runAnalysis`, updates status bar, and updates diagnostics.
    *   `xfidelity.cancelAnalysis`: Verify it calls `AnalysisManager.cancelAnalysis`.
    *   `xfidelity.openSettings`: Verify it opens VS Code settings.
    *   `xfidelity.showOutput`: Verify it shows the output channel.
    *   `xfidelity.detectArchetype`: Verify it calls `detectDefaultArchetype` and shows appropriate messages.
*   **Configuration Management:**
    *   Loading default configuration.
    *   Responding to configuration changes (e.g., `onDidChangeConfiguration`).
*   **Diagnostics:**
    *   Correctly mapping `Result` objects to `vscode.Diagnostic` objects (severity, range, message, code).
    *   Updating diagnostics in the Problems panel.
    *   Clearing diagnostics.
*   **Status Bar:**
    *   Updating status text and tooltip based on analysis state (idle, running, error).
*   **Tree Views (`IssuesTreeViewManager`, `ControlCenterTreeViewManager`):**
    *   Populating tree views with correct data.
    *   Refreshing tree views.
    *   Handling clicks on tree items (e.g., `xfidelity.showIssueDetails`).
*   **Webview Panels (`DashboardPanel`, `SettingsUIPanel`, `IssueDetailsPanel`):**
    *   Rendering panels correctly.
    *   Basic message passing between webview and extension (e.g., `runAnalysis` button in Control Center).
*   **File System Interactions:**
    *   `CacheManager`: Storing and retrieving data from `workspaceState`.
    *   `ExportManager`: Writing reports to disk.
    *   `WasmAstUtils`: Loading WASM files.
*   **Integration with Core/Plugins:**
    *   Ensuring `AnalysisEngine` from `@x-fidelity/core` is correctly invoked and its results are processed.
    *   Verifying `preloadDefaultPlugins` correctly identifies and "loads" plugins.

#### 3.3.2. Step 3.2: Utilize `@vscode/test-electron` API

**Actions:**

1.  **Understand `runTests` Options:** Leverage the full capabilities of `runTests` from `@vscode/test-electron`.
    *   `extensionDevelopmentPath`: Path to the extension source.
    *   `extensionTestsPath`: Path to the compiled test runner script (`./out/test/suite/index.js`).
    *   `workspaceFolder`: Crucial for integration tests that depend on a workspace (e.g., `../x-fidelity-fixtures/node-fullstack`).
    *   `launchArgs`: Use to disable other extensions (`--disable-extensions`), enable proposed API (`--enable-proposed-api` if needed), or pass custom CLI arguments.
    *   `version`: Specify VS Code version (`stable`, `insiders`, or specific version).
2.  **Isolate Tests:** Use `launchArgs: ['--disable-extensions']` to prevent interference from other installed extensions.
3.  **Manage Workspace:** For tests requiring a workspace, ensure `workspaceFolder` is correctly set.

#### 3.3.3. Step 3.3: Write Integration Tests

**Actions:**

1.  **Create Test Files:** Create new test files in `test/integration/` for each scenario (e.g., `test/integration/commands.test.ts`, `test/integration/diagnostics.test.ts`).
2.  **Use VS Code API Directly:** Within these tests, import and use the `vscode` module directly.
3.  **Setup and Teardown:** Implement `beforeEach`, `afterEach`, `beforeAll`, `afterAll` hooks to set up and tear down the VS Code environment and test data.
    *   **Example: Activating Extension and Registering Commands:**
        ```typescript
        // test/integration/commands.test.ts
        import * as vscode from 'vscode';
        import * as assert from 'assert';
        import { activate } from '../../src/extension'; // Import the actual activate function

        suite('Command Integration Tests', () => {
          let context: vscode.ExtensionContext;
          let originalExecuteCommand: typeof vscode.commands.executeCommand;

          beforeAll(async () => {
            // Mock a minimal context for activation
            context = {
              extensionPath: '/mock/extension/path',
              workspaceState: { get: jest.fn(), update: jest.fn() },
              subscriptions: [],
              extension: { packageJSON: { version: '1.0.0' } },
              extensionMode: vscode.ExtensionMode.Test,
            } as any; // Cast to any to bypass strict type checking for mocks

            // Spy on executeCommand to verify calls
            originalExecuteCommand = jest.spyOn(vscode.commands, 'executeCommand').mockImplementation((command, ...args) => {
              // Allow specific commands to pass through or mock their behavior
              if (command === 'setContext') {
                return Promise.resolve(); // Allow setContext to proceed
              }
              // For other commands, we might want to mock or assert
              return originalExecuteCommand(command, ...args);
            });

            await activate(context); // Activate the extension
          });

          afterAll(() => {
            // Clean up subscriptions if activate adds them
            context.subscriptions.forEach(d => d.dispose());
            jest.restoreAllMocks(); // Restore original executeCommand
          });

          test('xfidelity.runAnalysis command should be registered and callable', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(commands.includes('xfidelity.runAnalysis'), 'xfidelity.runAnalysis command should be registered');

            // Execute the command and verify side effects (e.g., status bar update, diagnostics clear)
            const showInfoMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
            const clearDiagnosticsSpy = jest.spyOn(vscode.languages, 'createDiagnosticCollection').mockReturnValue({ clear: jest.fn(), set: jest.fn(), dispose: jest.fn() } as any).mock.results[0].value.clear;

            await vscode.commands.executeCommand('xfidelity.runAnalysis');

            // Depending on the implementation, you might assert on:
            // - showInformationMessage being called with analysis results
            // - clearDiagnosticsSpy being called
            // - status bar text changing (requires mocking StatusBarItem)
            expect(showInfoMessageSpy).toHaveBeenCalledWith(expect.stringContaining('X-Fidelity analysis finished.'));
            expect(clearDiagnosticsSpy).toHaveBeenCalled();
          }).timeout(60000); // Increase timeout for integration tests

          test('xfidelity.openSettings command should open settings', async () => {
            const executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand');
            await vscode.commands.executeCommand('xfidelity.openSettings');
            expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.openSettings', '@ext:zotoio.x-fidelity-vscode');
          });
        });
        ```

**Verification:**

*   Run `yarn test:integration` and ensure all tests pass.
*   Review test logs for any unexpected behavior or warnings.

### Phase 4: Comprehensive End-to-End (E2E) Testing

**Goal:** Verify critical user workflows and UI interactions within a full VS Code environment.

#### 3.4.1. Step 4.1: Identify Critical User Flows

**Actions:**

1.  **Map User Journeys:** List the most important user interactions and workflows that define the core value of the X-Fidelity extension.

**Key E2E Test Scenarios:**

*   **Initial Setup & First Analysis:**
    *   Install extension (simulated by `extensionDevelopmentPath`).
    *   Open `x-fidelity-fixtures/node-fullstack` workspace.
    *   Trigger `xfidelity.runAnalysis` command.
    *   Verify status bar updates (running -> idle).
    *   Verify diagnostics appear in Problems panel.
    *   Verify issues appear in X-Fidelity Issues Tree View.
    *   Verify report is generated in `xfiResults` directory.
*   **Issue Remediation Workflow:**
    *   Open a file with an X-Fidelity issue.
    *   Verify inline decorations (squiggles).
    *   Click on a diagnostic to open issue details panel.
    *   Verify issue details panel content.
    *   Use "Add Exemption" code action.
    *   Verify issue disappears from Problems panel and Tree View.
    *   Verify exemption is added to `.xfi-config.json`.
*   **Configuration Changes:**
    *   Open X-Fidelity settings UI (`xfidelity.openSettings`).
    *   Change a setting (e.g., `xfidelity.runInterval`, `xfidelity.archetype`).
    *   Verify the setting is applied and affects subsequent analysis runs.
*   **Control Center Interaction:**
    *   Open Control Center panel.
    *   Click "Run Analysis" button and verify analysis execution.
    *   Click "Open Settings" button and verify settings panel opens.
*   **Report Management:**
    *   Export report in different formats (JSON, Markdown, CSV).
    *   Verify report content and file existence.
    *   View report history.
*   **Error Handling UI:**
    *   Simulate an analysis error (e.g., invalid config, missing dependency).
    *   Verify error message is displayed to the user (e.g., `vscode.window.showErrorMessage`).
    *   Verify output channel logs the error.

#### 3.4.2. Step 4.2: Choose E2E Framework & Headless Execution

**Actions:**

1.  **Framework Decision:** For VS Code extensions, `@vscode/test-electron` combined with direct VS Code API calls is often sufficient for E2E testing, as it allows programmatic control over the VS Code instance. If complex, pixel-perfect UI assertions are needed, a tool like Spectron (for Electron apps) might be considered if direct VS Code API interactions prove insufficient. However, a VS Code extension, direct VS Code API calls are often sufficient for E2E.
2.  **Headless Execution with XVFB:**
    *   Confirm `xvfb-run` is used in the `test:e2e` and `test:ci` scripts.
    *   Ensure the CI environment has XVFB installed (as covered in Phase 1).
    *   The `launchArgs` in `.vscode-test.mjs` already include necessary flags for headless operation (`--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`).

#### 3.4.3. Step 4.3: Leverage Fixtures

**Actions:**

1.  **Utilize `x-fidelity-fixtures/node-fullstack`:** This existing fixture is ideal for E2E tests as it provides a realistic project environment.
2.  **Create Custom Fixtures (if needed):** For specific E2E scenarios that require unique project structures or content, create minimal, dedicated fixtures.
3.  **Manage Fixture State:** Ensure tests can reset the fixture to a known state before each run (e.g., deleting generated reports, resetting `.xfi-config.json`).

#### 3.4.4. Step 4.4: Write E2E Tests

**Actions:**

1.  **Create Test Files:** Create new test files in `test/e2e/` for each critical user flow.
2.  **Orchestrate VS Code API Calls:** Use `vscode.commands.executeCommand`, `vscode.workspace.openTextDocument`, `vscode.window.activeTextEditor`, `vscode.window.showInformationMessage`, etc., to simulate user actions and verify outcomes.
3.  **Assertions on UI State:**
    *   Check status bar text.
    *   Verify diagnostic presence and content.
    *   Check TreeView item counts and labels.
    *   For webviews, use `panel.webview.html` to inspect the rendered content (e.g., check for specific text or element IDs).
4.  **Timeouts:** E2E tests are slow. Use `this.timeout()` in Mocha suites/tests to provide sufficient time for operations to complete.
    *   **Example E2E Test (`test/e2e/fullAnalysisWorkflow.e2e.test.ts`):**
        ```typescript
        import * as vscode from 'vscode';
        import * as assert from 'assert';
        import * as path from 'path';
        import * as fs from 'fs/promises';
        import { activate } from '../../src/extension'; // Import the actual activate function

        suite('Full Analysis Workflow E2E Tests', () => {
          let context: vscode.ExtensionContext;
          const fixturePath = path.resolve(__dirname, '../../../x-fidelity-fixtures/node-fullstack');
          const xfiConfigPath = path.join(fixturePath, '.xfi-config.json');
          const xfiResultsDir = path.join(fixturePath, '.xfiResults');

          suiteSetup(async function() {
            this.timeout(120000); // 2 minutes for setup

            // Mock a minimal context for activation
            context = {
              extensionPath: path.resolve(__dirname, '../../'), // Actual extension path
              workspaceState: { get: jest.fn(), update: jest.fn() },
              subscriptions: [],
              extension: { packageJSON: { version: '1.0.0' } },
              extensionMode: vscode.ExtensionMode.Test,
            } as any; // Cast to any to bypass strict type checking for mocks

            // Clean up previous test artifacts
            await fs.rm(xfiResultsDir, { recursive: true, force: true });
            await fs.rm(xfiConfigPath, { recursive: true, force: true });

            // Open the fixture workspace
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(fixturePath), true);

            // Activate the extension
            await activate(context);
          });

          suiteTeardown(async () => {
            // Clean up after all tests
            context.subscriptions.forEach(d => d.dispose());
            await fs.rm(xfiResultsDir, { recursive: true, force: true });
            await fs.rm(xfiConfigPath, { recursive: true, force: true });
            // Close the workspace if necessary
            await vscode.commands.executeCommand('workbench.action.closeFolder');
          });

          test('should run analysis, show diagnostics, and generate report', async function() {
            this.timeout(90000); // Specific test timeout

            // 1. Trigger analysis
            const infoMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
            await vscode.commands.executeCommand('xfidelity.runAnalysis');

            // Wait for analysis to complete (e.g., by waiting for a specific info message)
            await new Promise(resolve => {
              const disposable = infoMessageSpy.mockImplementation((message) => {
                if (message.includes('X-Fidelity analysis finished')) {
                  disposable.mockRestore();
                  resolve(true);
                }
                return Promise.resolve(message);
              });
            });

            // 2. Verify diagnostics
            const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(path.join(fixturePath, 'src/components/PoorRhythmComponent.tsx')));
            assert.ok(diagnostics.length > 0, 'Should have diagnostics after analysis');
            assert.ok(diagnostics.some(d => d.message.includes('Code rhythm issue')), 'Should contain expected diagnostic');

            // 3. Verify issues in Tree View (requires programmatic access to TreeView)
            // This part is more complex and might require internal knowledge or specific API for TreeView testing.
            // For now, we can assume if diagnostics are there, TreeView will reflect them.
            // A more advanced E2E test would interact with the TreeView UI directly.

            // 4. Verify report generation
            const reportFiles = await fs.readdir(xfiResultsDir);
            assert.ok(reportFiles.some(f => f.startsWith('x-fidelity-report-') && f.endsWith('.json')), 'Should generate a JSON report');
            assert.ok(reportFiles.some(f => f.startsWith('x-fidelity-report-') && f.endsWith('.md')), 'Should generate a Markdown report');

            // Optional: Read and parse report content
            const jsonReportPath = reportFiles.find(f => f.endsWith('.json'));
            if (jsonReportPath) {
              const reportContent = await fs.readFile(path.join(xfiResultsDir, jsonReportPath), 'utf-8');
              const report = JSON.parse(reportContent);
              assert.ok(report.XFI_RESULT.totalIssues > 0, 'Report should contain issues');
            }
          });

          test('should add exemption via code action', async function() {
            this.timeout(60000);

            // Ensure analysis has run and diagnostics are present
            await vscode.commands.executeCommand('xfidelity.runAnalysis');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Give time for diagnostics to update

            const targetFile = path.join(fixturePath, 'src/components/PoorRhythmComponent.tsx');
            const document = await vscode.workspace.openTextDocument(targetFile);
            const editor = await vscode.window.showTextDocument(document);

            const diagnosticsBefore = vscode.languages.getDiagnostics(vscode.Uri.file(targetFile));
            const diagnosticToExempt = diagnosticsBefore.find(d => d.code === 'code-rhythm-issue');
            assert.ok(diagnosticToExempt, 'Expected diagnostic to be present for exemption test');

            // Simulate selecting the diagnostic and triggering code action
            // This is a simplified simulation. Real UI interaction would be more complex.
            const addExemptionCommandSpy = jest.spyOn(vscode.commands, 'executeCommand');
            await vscode.commands.executeCommand('xfidelity.addExemption', diagnosticToExempt?.code);

            // Wait for exemption to be processed and diagnostics to update
            await new Promise(resolve => setTimeout(resolve, 5000));

            const diagnosticsAfter = vscode.languages.getDiagnostics(vscode.Uri.file(targetFile));
            assert.ok(!diagnosticsAfter.some(d => d.code === 'code-rhythm-issue'), 'Diagnostic should be removed after exemption');

            // Verify .xfi-config.json is updated (read file and parse)
            const configContent = await fs.readFile(xfiConfigPath, 'utf-8');
            const config = JSON.parse(configContent);
            assert.ok(config.exemptions.some((e: any) => e.ruleId === 'code-rhythm-issue'), 'Exemption should be added to config');
          });
        });
        ```

#### 3.4.5. Step 4.5: Screenshot/Video Capture (for E2E Failures)

**Problem:** Debugging E2E test failures can be challenging without visual evidence.

**Actions:**

1.  **Integrate Screenshot Helper:** The existing `src/test/helpers/screenshotHelper.ts` can be leveraged.
2.  **Trigger on Failure:** Modify the E2E test runner or CI configuration to automatically capture screenshots or even short videos when an E2E test fails.
    *   **Example (conceptual, depends on test runner capabilities):**
        ```typescript
        // In test/e2e/setup.ts or similar, if using Mocha hooks
        afterEach(async function() {
          if (this.currentTest?.state === 'failed') {
            console.log(`Test failed: ${this.currentTest.fullTitle()}. Capturing screenshot...`);
            // Call screenshot helper here
            // await takeScreenshot(this.currentTest.fullTitle().replace(/[^a-z0-9]/gi, '_'));
          }
        });
        ```
3.  **Store Artifacts:** Configure CI to store these screenshots/videos as build artifacts.

### Phase 5: Advanced Testing & Maintenance

**Goal:** Enhance the test suite with advanced capabilities and ensure its long-term maintainability.

#### 3.5.1. Step 5.1: Performance Testing

**Problem:** Performance regressions can degrade user experience.

**Actions:**

1.  **Leverage `performanceLogger`:** The existing `src/utils/performanceLogger.ts` can be used to log performance metrics for critical operations (e.g., analysis time, AST parsing time).
2.  **Add Performance Assertions:** In integration or E2E tests, add assertions to ensure critical operations complete within acceptable time limits.
    *   **Example:** `expect(performanceLogger.getDuration('AnalysisManager.runAnalysis')).toBeLessThan(5000);`
3.  **Integrate with CI:** Configure CI to monitor performance metrics and alert on regressions.

#### 3.5.2. Step 5.2: Cross-Platform Testing

**Problem:** Extensions might behave differently on various operating systems.

**Actions:**

1.  **CI Matrix:** Configure GitHub Actions to run tests on different operating systems (Ubuntu, Windows, macOS).
    *   **Example `ci.yml` matrix strategy:**
        ```yaml
        # .github/workflows/ci.yml
        jobs:
          test:
            runs-on: ${{ matrix.os }}
            strategy:
              matrix:
                os: [ubuntu-latest, windows-latest, macos-latest]
            steps:
              # ... setup steps
              - name: Run Tests
                run: yarn test:ci
                working-directory: packages/x-fidelity-vscode
        ```

#### 3.5.3. Step 5.3: VS Code Version Compatibility Testing

**Problem:** VS Code API changes can break extensions.

**Actions:**

1.  **Test Against Multiple Versions:** Use `@vscode/test-electron`'s `version` option to test against:
    *   `stable`: The latest stable VS Code release.
    *   `insiders`: The latest Insiders build (for early detection of breaking changes).
    *   Specific older versions (if backward compatibility is a requirement).
2.  **Automate in CI:** Add separate CI jobs or a matrix strategy to run tests against different VS Code versions.

#### 3.5.4. Step 5.4: Test Data Management

**Problem:** Managing realistic and diverse test data (codebases, configurations) can be complex.

**Actions:**

1.  **Expand `x-fidelity-fixtures`:** Continue to add more diverse and representative codebases to `packages/x-fidelity-fixtures` to cover various languages, frameworks, and project structures.
2.  **Parameterized Tests:** For unit and integration tests, use parameterized testing (if supported by the framework, e.g., Jest's `test.each`) to run the same test logic with different sets of input data.
3.  **Synthetic Data Generation:** For large-scale performance or stress tests, consider generating synthetic codebases or configurations.

#### 3.5.5. Step 5.5: Test Reporting

**Problem:** Raw test output can be difficult to interpret and share.

**Actions:**

1.  **Generate Human-Readable Reports:**
    *   **JUnit XML:** Configure Mocha/Jest to output JUnit XML reports, which can be consumed by CI systems for test summaries.
    *   **HTML Reports:** Generate HTML reports (e.g., using `mocha-multi-reporters` or Jest's HTML reporters) for a visual overview of test results, including failures and durations.
2.  **Publish CI Artifacts:** Configure GitHub Actions to publish these reports as build artifacts, making them easily accessible.

#### 3.5.6. Step 5.6: Test Maintenance

**Problem:** Test suites can become outdated, flaky, or slow over time.

**Actions:**

1.  **Regular Review:** Periodically review the test suite for:
    *   **Flakiness:** Identify and fix non-deterministic tests.
    *   **Redundancy:** Remove overlapping or unnecessary tests.
    *   **Performance:** Optimize slow tests.
    *   **Relevance:** Ensure tests still reflect current functionality and requirements.
2.  **Clear Naming Conventions:** Maintain consistent and descriptive naming for test files, suites, and individual tests.
3.  **Comprehensive Documentation:** Keep this `TESTING_IMPROVEMENT_PLAN.md` updated, along with inline comments in test files, to explain the purpose and methodology of tests.
4.  **Test-Driven Development (TDD):** Encourage TDD practices where new features are developed with tests written first.
5.  **Dedicated Test Refactoring Sprints:** Allocate time specifically for refactoring and improving the test suite.

## 4. Conclusion

Implementing this comprehensive testing improvement plan will transform the X-Fidelity VS Code extension's testing landscape. By establishing clear strategies for unit, integration, and E2E tests, maximizing coverage, and integrating seamlessly with CI/CD, we will achieve:

*   **Increased Confidence:** Developers can make changes with greater assurance, knowing that a robust test suite will catch regressions.
*   **Faster Feedback Loop:** Automated tests provide immediate feedback on code quality and functionality.
*   **Higher Code Quality:** Comprehensive testing leads to more reliable and bug-free software.
*   **Reduced Technical Debt:** A well-maintained test suite prevents the accumulation of untested or poorly tested code.
*   **Streamlined Development Workflow:** Automated testing frees up developer time, allowing them to focus on building new features and improving existing ones.

This plan provides a roadmap for building a world-class testing foundation for the X-Fidelity VS Code extension, ensuring its continued success and stability.
