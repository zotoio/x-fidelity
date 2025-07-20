# Logger Breaking Changes

This document tracks breaking changes made during the X-Fidelity logging architecture refactor.

## Phase 1: Mode Constants and CLI Updates

### Breaking Changes Made:

#### 1. CLI Mode Option Change
- **Change**: CLI `--mode` option values changed from `'client' | 'server'` to `'cli' | 'vscode' | 'server' | 'hook'`
- **Impact**: Users using `--mode client` will need to update to `--mode cli`
- **Mitigation**: Backward compatibility maintained with deprecation warning for 'client' mode
- **Timeline**: 'client' mode support will be removed in future major version

#### 2. TypeScript Type Changes
- **Change**: ExecutionMode type introduced to replace string literals
- **Impact**: TypeScript consumers will need to import new types
- **Mitigation**: Types are exported from core package for easy access

### Backward Compatibility Measures:

1. **'client' Mode Mapping**: 
   - Automatically maps 'client' to 'cli' internally
   - Shows deprecation warning when 'client' mode is used
   - Continues to work but will be removed in future version

2. **Type Compatibility**:
   - Old CLIOptions interface continues to work
   - New ExecutionMode type is additive, not replacing existing functionality

### Migration Guide:

#### For CLI Users:
```bash
# Old (deprecated but still works)
xfidelity --mode client

# New (recommended)
xfidelity --mode cli
```

#### For TypeScript Consumers:
```typescript
// Old
import { CLIOptions } from '@x-fidelity/types';

// New - additional imports available
import { CLIOptions, ExecutionMode, EXECUTION_MODES } from '@x-fidelity/types';
```

## Phase 2: Logger Consolidation

### Breaking Changes Made:

#### 1. LoggerProvider Enhancement
- **Change**: LoggerProvider now supports mode-aware logger creation
- **Impact**: Internal API changes for logger factories
- **Mitigation**: LoggerProvider maintains backward compatibility for existing usage
- **New Features**: 
  - `createLoggerForMode()` method
  - `setModeAndLevel()` method
  - Logger factory registration system

#### 2. Logger Implementations Updated
- **Change**: PinoLogger, DefaultLogger, ServerLogger optimized for specific modes
- **Impact**: Internal changes to logger behavior based on execution mode
- **Mitigation**: All loggers maintain ILogger interface compatibility
- **Benefits**: Better performance and appropriate output for each execution context

### Backward Compatibility Measures:

1. **Existing Logger Usage**: All existing logger imports and usage continue to work
2. **ILogger Interface**: No changes to public logging interface
3. **Plugin Compatibility**: All plugins continue to receive appropriate loggers

## Phase 3: VSCode Extension Changes

### Breaking Changes Made:

#### 1. Environment Variable Removal
- **Change**: Removed `XFI_VSCODE_MODE` and `XFI_DISABLE_FILE_LOGGING` environment variables
- **Impact**: VSCode extension now uses `--mode vscode` argument instead
- **Mitigation**: This is internal to VSCode extension, no external API changes
- **Benefits**: Cleaner argument-based approach, consistent with CLI architecture

#### 2. Enhanced CLI-to-VSCode Logging
- **Change**: Implemented intelligent log forwarding from CLI to VSCode logger
- **Impact**: Better end-to-end logging visibility in VSCode extension
- **Mitigation**: No breaking changes to external APIs
- **Benefits**: Improved debugging experience for VSCode users

### Internal Changes:

1. **cliSpawner Updates**: Uses `--mode vscode --enable-tree-sitter-worker` arguments
2. **Log Forwarding**: Intelligent CLI output parsing and level detection
3. **Environment Cleanup**: Removed scattered environment variable dependencies

## Phase 4: Cleanup and Consolidation

### Breaking Changes Made:

#### 1. Bundled Environment Detection Consolidation
- **Change**: Created shared `bundledEnvironmentDetector` utility
- **Impact**: Removed duplicate code from PinoLogger and ServerLogger
- **Mitigation**: No external API changes
- **Benefits**: Single source of truth for bundled environment detection

#### 2. Updated Exports
- **Change**: Added exports for new bundled environment detection utilities
- **Impact**: New utilities available for import from @x-fidelity/core
- **Mitigation**: Additive change, no existing functionality removed
- **Benefits**: Shared utilities available for other packages if needed

### Internal Improvements:

1. **Code Deduplication**: Removed duplicate `shouldUseDirectLogging()` methods
2. **Centralized Logic**: Bundled environment detection now in single location
3. **Cleaner Architecture**: Reduced scattered mode detection logic

## Version Compatibility:

- **Current Version**: All changes maintain backward compatibility
- **Breaking Changes Summary**:
  - Phase 1: 'client' mode deprecated (backward compatible with warnings)
  - Phase 2: Internal logger enhancements (no external API changes)
  - Phase 3: Environment variables removed (internal to VSCode extension only)
  - Phase 4: Code consolidation (no external API changes)
- **Next Minor Version**: Continued support for 'client' mode with deprecation warnings
- **Next Major Version**: 'client' mode support may be removed

## Migration Summary:

### Required Actions:
1. **CLI Users**: Update `--mode client` to `--mode cli` (optional, backward compatible)
2. **VSCode Extension Users**: No action required (internal changes only)
3. **Plugin Developers**: No action required (ILogger interface unchanged)
4. **TypeScript Consumers**: No action required (new types are additive)

### Recommended Actions:
1. Use new ExecutionMode constants for better type safety
2. Migrate from deprecated 'client' mode to 'cli' mode
3. Take advantage of enhanced logging features in new versions

## Testing Validation:

All phases have been validated with comprehensive testing:
- ✅ Core package: 571 tests pass
- ✅ CLI package: 24 tests pass  
- ✅ Server package: 60 tests pass
- ✅ VSCode extension: Logging changes validated (some unrelated TypeScript issues exist)

## Architecture Benefits:

The completed refactor provides:
1. **Unified Logging**: Consistent logging across all execution modes
2. **Better Performance**: Mode-optimized loggers (CLI uses Pino, VSCode uses basic logging)
3. **Cleaner Code**: Centralized logger selection and bundled environment detection
4. **Enhanced Debugging**: End-to-end logging visibility from CLI to VSCode
5. **Maintainability**: Reduced code duplication and centralized logic

## Tree-sitter Architecture Changes

### Breaking Changes Made:

#### 1. Native Tree-sitter Dependencies Removed
- **Change**: Removed `tree-sitter`, `tree-sitter-javascript`, and `tree-sitter-typescript` dependencies from CLI and core packages
- **Impact**: CLI mode now uses direct parsing through plugins package, reducing bundle size and platform-specific dependencies
- **Mitigation**: No external impact - tree-sitter functionality still available through plugins
- **Benefits**: Cleaner dependencies, smaller CLI bundle, no platform-specific native binaries

#### 2. Tree-sitter Worker Usage Updated
- **Change**: CLI mode now defaults to `disableTreeSitterWorker: true` and uses direct parsing
- **Impact**: Better performance in CLI mode, no worker threads or bundling issues
- **VSCode Mode**: Still uses WASM tree-sitter workers with `--enable-tree-sitter-worker`
- **Benefits**: Eliminates "lib/worker.js" errors, cleaner architecture

#### 3. AST Plugin Initialization Enhanced
- **Change**: AST plugin now checks `disableTreeSitterWorker` flag before initializing tree-sitter manager
- **Impact**: Prevents unnecessary worker creation in CLI mode
- **Mitigation**: Graceful fallback to direct parsing
- **Benefits**: No more worker initialization errors in CLI mode

### Architecture Summary:

- **CLI Mode**: Direct parsing (no workers, no platform binaries)
- **VSCode Mode**: WASM workers with optimized bundling
- **Dependencies**: Native tree-sitter only in plugins package for direct parsing

## Contact:

For questions about breaking changes or migration assistance, please refer to the main project documentation or create an issue in the repository. 