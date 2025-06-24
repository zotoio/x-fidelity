# X-Fidelity Test Fixtures

This package contains comprehensive test fixtures for all x-fidelity archetypes. Each archetype directory is a separate workspace with its own git repository, dependency management, and intentionally problematic code designed to exercise every rule, fact, and operator.

## Architecture

```
packages/x-fidelity-fixtures/
├── package.json                    # Top-level workspace coordinator
├── README.md                       # This file
├── ARCHETYPE_COVERAGE.md           # Rule coverage matrix
├── scripts/                        # Cross-archetype utilities
│   ├── validate-all-archetypes.js  # Test all archetype fixtures
│   ├── generate-coverage-matrix.js # Coverage report
│   └── sync-with-democonfig.js    # Keep rules in sync
├── node-fullstack/                 # Node.js full-stack fixtures
│   ├── .git/                      # Separate git repository
│   ├── package.json               # Outdated dependencies
│   ├── yarn.lock                  # Independent lock file
│   └── src/                       # Code triggering all 15 rules
└── java-microservice/             # Java microservice fixtures
    ├── .git/                      # Separate git repository
    ├── pom.xml                    # Outdated Maven dependencies
    └── src/main/java/             # Java code triggering rules
```

## Purpose

### **Primary Goals**
1. **End-to-End Testing**: Both CLI and VSCode extension test against realistic problematic codebases
2. **Rule Validation**: Ensure every rule in every archetype works as expected
3. **Plugin Testing**: Exercise all plugin functionality with comprehensive scenarios
4. **Regression Prevention**: Changes to rules/plugins are immediately tested
5. **Documentation**: Living examples of what each rule detects

### **Test Target Configuration**
Both CLI and VSCode extension tests use these fixtures as their primary test workspace:
- **CLI tests**: Target `packages/x-fidelity-fixtures/node-fullstack` as analysis directory
- **VSCode tests**: Open `packages/x-fidelity-fixtures/node-fullstack` as workspace
- **Consistency tests**: Compare CLI vs VSCode results using same fixtures

## Archetype Coverage

### **node-fullstack** (15 rules implemented)
- `sensitiveLogging-iterative` → Files with API keys, passwords, tokens
- `outdatedFramework-global` → Dependencies below minimum versions
- `noDatabases-iterative` → Direct database calls (oracle, postgres, mongodb)
- `nonStandardDirectoryStructure-global` → Missing app/frontend, app/server
- `openaiAnalysisTop5-global` → Code quality issues for AI analysis
- `openaiAnalysisA11y-global` → Accessibility issues
- `openaiAnalysisTestCriticality-global` → Test coverage issues
- `invalidSystemIdConfigured-iterative` → Invalid system IDs for remote validation
- `missingRequiredFiles-global` → Missing README, required config files
- `factDoesNotAddResultToAlmanac-iterative` → Fact implementation issues
- `newSdkFeatureNotAdoped-global` → Old SDK patterns
- `lowMigrationToNewComponentLib-global` → Legacy component usage
- `functionComplexity-iterative` → Functions with high cyclomatic complexity
- `functionCount-iterative` → Files with >20 functions
- `codeRhythm-iterative` → Inconsistent code patterns

### **java-microservice** (2 rules implemented)
- `sensitiveLogging-iterative` → Java files with sensitive data logging
- `nonStandardDirectoryStructure-global` → Non-Maven directory structure

## Plugin Coverage

All available plugins are exercised:
- **xfiPluginAst**: Complex AST analysis, function complexity, code rhythm
- **xfiPluginDependency**: Outdated dependency detection
- **xfiPluginFilesystem**: File content analysis, directory structure
- **xfiPluginOpenAI**: AI-powered code analysis
- **xfiPluginPatterns**: Regex pattern matching
- **xfiPluginReactPatterns**: React-specific issues (hooks, effects)
- **xfiPluginRemoteStringValidator**: Remote API validation
- **xfiPluginRequiredFiles**: Missing file detection
- **xfiPluginSimpleExample**: Custom fact/operator testing

## Key Features

### **Independent Git Repositories**
Each archetype has its own `.git` directory allowing:
- Independent commit histories for testing file changes
- Reset to clean states for consistent testing
- Different branches for various test scenarios
- Isolated from main monorepo git operations

### **No Dependency Hoisting**
Each archetype maintains its own `yarn.lock`:
- Test outdated dependency scenarios realistically
- Avoid conflicts with main monorepo dependencies
- Simulate real-world project dependency patterns

### **Intentionally Problematic Code**
Code is designed to be "bad" on purpose:
- Triggers every rule in the archetype configuration
- Provides comprehensive test coverage
- Documents what each rule detects with examples
- Serves as regression test suite

## Usage

### **For CLI Testing**
```bash
# Run CLI against node-fullstack fixtures
cd packages/x-fidelity-cli
yarn build
node . --dir ../x-fidelity-fixtures/node-fullstack

# Expected: Should find multiple issues across all rule types
```

### **For VSCode Testing**
```bash
# Run VSCode tests (they automatically use fixtures)
cd packages/x-fidelity-vscode
yarn test

# Or debug in VSCode: Open node-fullstack as workspace, press F5
```

### **For Coverage Validation**
```bash
# Validate all rules are triggered
cd packages/x-fidelity-fixtures
yarn test:all

# Generate coverage matrix
yarn coverage:matrix
```

## Maintenance

### **Keeping Rules in Sync**
When rules change in `x-fidelity-democonfig`, fixtures must be updated:
```bash
cd packages/x-fidelity-fixtures
yarn run sync-with-democonfig
```

### **Adding New Rules**
1. Update the archetype's problematic code to trigger the new rule
2. Update the RULES_COVERAGE.md matrix
3. Validate the rule is detected: `yarn test:all`

### **Adding New Archetypes**
1. Create new archetype directory (e.g., `python-webapp/`)
2. Add to workspace packages in top-level package.json
3. Initialize separate git repository
4. Create problematic code for all archetype rules
5. Update coverage documentation

## Development Workflow

1. **Make rule/plugin changes** in main codebase
2. **Update fixtures** to exercise new functionality
3. **Run tests** to validate CLI and VSCode consistency
4. **Check coverage** to ensure all rules are triggered
5. **Commit fixtures** separately from main code changes

This approach ensures x-fidelity development is thoroughly tested against realistic scenarios while maintaining clear separation between the analysis tool and test fixtures. 