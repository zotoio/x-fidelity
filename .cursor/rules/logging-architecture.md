# Logging and mode simplification

we need a plan to simplify the logger strategy across the codebase and the modes of operation.  

## Guiding Principles

### 1. there need to be 4 values as constants for the 'mode' cli option.
- 'cli' 
- 'vscode'
- 'server'
- 'hook'

**Summary of each mode**
1. mode = 'cli' the default (renamed from 'client') when the CLI is run manually by a user from the command line. This is the default mode when the mode option is not set.
2. mode = 'vscode' when the CLI is spawned by the VSCode extension. The cliSpawner passes --mode vscode argument to differentiate from manual execution.
3. mode = 'server' the xfi server.
4. mode = 'hook' the github hook listener.

### 2. All logging must be encapsulated
Logging needs to be based on the LoggerProvider, and logic related to logging needs to exist inside loggers rather than scattered across the codebase.

### 3. Consistency of log level
The XFI_LOG_LEVEL env var sets the initial loglevel for all loggers uniformly regardless of location.  In modes where there is long running state such as vscode extension and server, it needs to be possible to dynamically update the log level.

## PRD: Specific Requirements and instructions

### 1. in the default 'cli' mode (manual user execution) needs to use pino with custom pretty formatting.
Ensure that this is the case and any logger selection logic is in the logger setup rather than in other code.

### 2. plugins must use the logger the are provided with.
this is to ensure that logging in plugins uses the same mode related logger that the cli is using.

### 3. the cliSpawner needs to run the CLI with arg --mode 'vscode'. 
This tells the CLI to use basic logging in a format suited to VSCode output panel with log level filtering (not using Pino). The logs should be captured by the cliSpawner, and passed to the VSCode logger so that we have complete details end to end of all components logged.

### 4. the cliSpawner for vscode must set the arg --enable-tree-sitter-worker 
This enables WASM tree-sitter workers in VSCode mode for performance. CLI mode uses direct parsing without workers by default (disableTreeSitterWorker: true).

### 5. clean up duplicated files and old logic
From all our refactoring, we have left a lot of unused files and some functions and vars/const have been duplicated. we need to analyse usage and correctness, and remove these.  we also need to remove commented out code and comments that are not useful for future reference need to be refined.

### 6. We need to review and refine all tests
Unit tests and integration tests need cleanup and we need to ensure that they work, and have high coverage.  If we find errors in integration tests, but unit tests have passed, we should create unit tests to catch the cause earlier rather than waiting for integration tests to catch these issues where possible.

### 7. Identify other areas for improvement
During the phases of this refactor, make a list of any other potential improvements in a file 'logging-enhancement-ideas.md' for review once the phases are complete.

### 8. Ask for guidance if anything is unclear during the refactor.

## Additional guidance

1. Breaking changes are ok.

2. Keep the loggers that make sense and upgrade them to meet the requirements, andse a big-bang approach, as the bulk of changes should be centralised anyway.

3. Do these phase in this order:
    - Mode constants and CLI updates
    - Logger consolidation
    - VSCode cliSpawner changes
    - Cleanup and testing

4. Tree-sitter architecture: CLI mode uses direct parsing (no workers, no platform binaries), VSCode mode uses WASM workers with --enable-tree-sitter-worker. Native tree-sitter dependencies removed from CLI and core packages.

5. Hook mode will be used in the github webhook in server mode, but that is lower priority for now.

6. Maintain backwards compatibility where practical, and write any breaking changes to logger-breaking-changes.md for me to review later.

7. Update the tests as we go, but do not execute them during the refactoring process, as we will run and debug them at the end when the process is complete.

8. create and update the logging-enhancement-ideas.md as you go.

# Detailed implementation plan

## Phase 1: Mode Constants and CLI Updates

### 1.1 Create Mode Constants
**Files to modify:**
- `packages/x-fidelity-types/src/core.ts`
- `packages/x-fidelity-types/src/config.ts`

**Tasks:**
1. Define execution mode enum/type:
   ```typescript
   export type ExecutionMode = 'cli' | 'vscode' | 'server' | 'hook';
   export const EXECUTION_MODES = {
     CLI: 'cli' as const,
     VSCODE: 'vscode' as const, 
     SERVER: 'server' as const,
     HOOK: 'hook' as const
   } as const;
   ```

2. Update CLIOptions interface to use new mode type
3. Add backward compatibility mapping for 'client' -> 'cli'

### 1.2 Update CLI Package 
**Files to modify:**
- `packages/x-fidelity-cli/src/cli.ts`
- `packages/x-fidelity-cli/src/index.ts`

**Tasks:**
1. Update CLI option from `'client' | 'server'` to new ExecutionMode type
2. Add backward compatibility for 'client' mode with deprecation warning
3. Update default mode from 'client' to 'cli'
4. Add --mode option validation using EXECUTION_MODES constants
5. Update help text and documentation for new mode options

### 1.3 Update Core Package
**Files to modify:**
- `packages/x-fidelity-core/src/core/options.ts`
- `packages/x-fidelity-core/src/index.ts`

**Tasks:**
1. Update CoreOptions interface to use ExecutionMode
2. Export new mode constants from core package
3. Update all mode-related logic to use new constants

### 1.4 Update Server Package
**Files to modify:**
- `packages/x-fidelity-server/src/index.ts`
- Files using server mode logic

**Tasks:**
1. Update server startup logic to use 'server' mode constant
2. Prepare for future 'hook' mode integration (placeholder)

### 1.5 Documentation Updates
**Files to create/modify:**
- `logger-breaking-changes.md` (create)
- `logging-enhancement-ideas.md` (create)
- Update CLI help text and README

**Tasks:**
1. Document breaking change from 'client' to 'cli' mode
2. Note deprecation of 'client' mode with backward compatibility
3. Document new mode system architecture

---

## Phase 2: Logger Consolidation

### 2.1 Enhanced LoggerProvider
**Files to modify:**
- `packages/x-fidelity-core/src/utils/loggerProvider.ts`

**Tasks:**
1. Add mode-aware logger factory methods:
   ```typescript
   static createLoggerForMode(mode: ExecutionMode): ILogger
   static setModeAndLevel(mode: ExecutionMode, level?: LogLevel): void
   ```

2. Implement logger selection logic based on mode:
   - 'cli': PinoLogger with custom pretty formatting
   - 'vscode': DefaultLogger (no pino, VSCode-friendly output)
   - 'server': ServerLogger (existing)
   - 'hook': ServerLogger (for now, may specialize later)

3. Add dynamic log level updating for long-running modes (vscode, server)
4. Ensure XFI_LOG_LEVEL environment variable support across all modes

### 2.2 Upgrade Existing Loggers
**Files to modify:**
- `packages/x-fidelity-cli/src/utils/pinoLogger.ts`
- `packages/x-fidelity-core/src/utils/defaultLogger.ts`
- `packages/x-fidelity-server/src/utils/serverLogger.ts`
- `packages/x-fidelity-vscode/src/utils/vscodeLogger.ts`

**Tasks:**
1. **PinoLogger**: Ensure it's optimized for 'cli' mode
   - Keep custom pretty formatting for human-readable output
   - Remove mode-detection logic, let LoggerProvider handle selection
   - Ensure XFI_LOG_LEVEL support

2. **DefaultLogger**: Optimize for 'vscode' mode
   - No file output by default
   - Console-friendly formatting
   - Silent in test environments
   - Proper log level filtering

3. **ServerLogger**: Optimize for 'server' and 'hook' modes
   - Keep existing functionality
   - Add dynamic level updating
   - Ensure proper structured logging for server context

4. **VSCodeLogger**: Enhance for extension integration
   - Ensure proper integration with VSCode output channels
   - Support for capturing CLI output and forwarding to VSCode

### 2.3 Remove Logger Selection Logic from Packages
**Files to modify:**
- `packages/x-fidelity-cli/src/index.ts`
- `packages/x-fidelity-vscode/src/core/extensionManager.ts`
- Other files with mode-specific logger creation

**Tasks:**
1. Remove `isVSCodeMode` checks and similar logic
2. Replace with LoggerProvider.createLoggerForMode() calls
3. Centralize all logger selection logic in LoggerProvider
4. Update plugin initialization to use centralized logger injection

### 2.4 Plugin Logger Updates
**Files to modify:**
- `packages/x-fidelity-core/src/utils/pluginLogger.ts`
- Plugin packages that create loggers

**Tasks:**
1. Ensure all plugins use LoggerProvider.getLogger()
2. Remove any plugin-specific logger creation
3. Update plugin factory methods to inject mode-appropriate loggers
4. Test plugin logging across all modes

---

## Phase 3: VSCode cliSpawner Changes

### 3.1 Update cliSpawner Arguments
**Files to modify:**
- `packages/x-fidelity-vscode/src/utils/cliSpawner.ts`
- `packages/x-fidelity-vscode/src/analysis/cliAnalysisManager.ts`

**Tasks:**
1. Replace `XFI_VSCODE_MODE: 'true'` environment variable with `--mode vscode` argument
2. Remove `XFI_DISABLE_FILE_LOGGING` environment variable (handled by mode)
3. Ensure `--enable-tree-sitter-worker` is passed (already correct)
4. Update argument building logic in runAnalysis method
5. Test CLI spawning with new arguments

### 3.2 Enhance VSCode Logging Integration
**Files to modify:**
- `packages/x-fidelity-vscode/src/utils/cliSpawner.ts`
- `packages/x-fidelity-vscode/src/utils/globalLogger.ts`

**Tasks:**
1. Enhance stdout/stderr capture in CLI spawner
2. Forward all CLI output to VSCode logger with appropriate levels
3. Ensure complete end-to-end logging visibility
4. Remove dependency on environment variables for mode detection

### 3.3 Update VSCode Extension Logger Setup
**Files to modify:**
- `packages/x-fidelity-vscode/src/core/extensionManager.ts`
- VSCode extension initialization code

**Tasks:**
1. Use LoggerProvider.createLoggerForMode('vscode') for extension logger
2. Remove mode-specific logger creation logic
3. Ensure proper logger injection for all VSCode extension components

### 3.4 Tree-sitter Configuration
**Files to modify:**
- Tree-sitter related configuration files
- Build scripts that include native binaries

**Tasks:**
1. Verify `--enable-tree-sitter-worker` correctly enables WASM tree-sitter
2. Remove cross-platform native tree-sitter binaries from build
3. Document tree-sitter mode selection in enhancement ideas
4. Update tree-sitter initialization logic if needed

---

## Phase 4: Cleanup and Testing

### 4.1 Remove Duplicated Code and Unused Files
**Tasks:**
1. **Audit unused logger files:**
   - Search for logger files that are no longer referenced
   - Remove duplicate logger implementations
   - Remove commented-out logger code

2. **Clean up environment variable usage:**
   - Remove `XFI_VSCODE_MODE` references
   - Remove `XFI_DISABLE_FILE_LOGGING` references  
   - Consolidate to XFI_LOG_LEVEL only

3. **Remove mode detection logic:**
   - Remove bundled environment detection in loggers
   - Remove VSCode mode detection scattered throughout codebase
   - Centralize all mode-related logic in LoggerProvider

4. **Update imports and exports:**
   - Remove unused logger imports
   - Update package.json dependencies if any loggers are removed
   - Clean up index.ts exports

### 4.2 Test Updates and Validation
**Files to modify:**
- All test files that reference logging
- Jest configuration files
- Test setup files

**Tasks:**
1. **Update logger tests:**
   - Update LoggerProvider tests for new mode functionality
   - Update individual logger tests for their specific purposes
   - Add tests for mode-specific logger creation
   - Add tests for XFI_LOG_LEVEL environment variable handling

2. **Update CLI tests:**
   - Update tests for new mode constants
   - Add tests for backward compatibility with 'client' mode
   - Test new --mode argument validation
   - Test tree-sitter worker arguments

3. **Update VSCode extension tests:**
   - Update cliSpawner tests for new argument structure
   - Test logger integration between CLI and VSCode
   - Remove tests that depend on environment variables

4. **Update integration tests:**
   - Test end-to-end logging in each mode
   - Test plugin logging across modes
   - Test dynamic log level changing

### 4.3 Documentation and Enhancement Tracking
**Tasks:**
1. **Complete logger-breaking-changes.md:**
   - Document all breaking changes made
   - Provide migration guide for external users
   - Note deprecated features and timelines

2. **Complete logging-enhancement-ideas.md:**
   - Document potential future improvements discovered during refactor
   - Note performance optimization opportunities
   - Suggest additional logging features

3. **Update documentation:**
   - Update CLI reference for new mode options
   - Update VSCode extension documentation
   - Update plugin development guide for new logging patterns

### 4.4 Final Validation
**Tasks:**
1. **Build verification:**
   - Ensure all packages build successfully
   - Verify no TypeScript errors
   - Check for any missing imports/exports

2. **Mode validation:**
   - Test 'cli' mode with pino logging
   - Test 'vscode' mode with basic logging
   - Test 'server' mode functionality
   - Test backward compatibility with 'client' mode

3. **Plugin validation:**
   - Verify all plugins receive appropriate loggers
   - Test plugin logging output in each mode
   - Ensure no plugin logger initialization errors

4. **Integration validation:**
   - Test complete VSCode extension workflow
   - Test CLI standalone operation
   - Test server mode operation
   - Verify log level consistency across all modes

---

## Success Criteria

### Phase 1 Complete When:
- [ ] New ExecutionMode type is defined and used throughout
- [ ] CLI accepts --mode with 4 valid values
- [ ] Backward compatibility for 'client' mode works
- [ ] Breaking changes are documented

### Phase 2 Complete When:
- [ ] LoggerProvider creates mode-appropriate loggers
- [ ] All logger selection logic is centralized
- [ ] XFI_LOG_LEVEL works consistently across modes
- [ ] Plugin logging uses provided loggers

### Phase 3 Complete When:
- [x] VSCode cliSpawner uses --mode vscode argument
- [x] Tree-sitter worker configuration is correct
- [x] End-to-end logging works from CLI to VSCode
- [x] Environment variable dependencies are removed

### Phase 4 Complete When:
- [x] No duplicate or unused logger code remains
- [x] All tests pass and are updated
- [x] Documentation is complete and accurate
- [x] All modes work correctly in isolation and integration

## Risk Mitigation

### Potential Issues:
1. **Logger compatibility**: Existing plugins may break with logger changes
   - Mitigation: Maintain ILogger interface compatibility
   
2. **VSCode extension changes**: New CLI arguments may cause extension issues
   - Mitigation: Test thoroughly with actual VSCode extension
   
3. **Backward compatibility**: 'client' mode users may be disrupted
   - Mitigation: Maintain compatibility with deprecation warnings

### Testing Strategy:
1. Update tests progressively through each phase
2. Don't execute tests during refactor to avoid interruptions
3. Comprehensive testing at end of each phase
4. Integration testing across all modes before completion

This plan provides a comprehensive roadmap for implementing the logging and mode simplification while maintaining system stability and providing clear validation criteria for each phase.
