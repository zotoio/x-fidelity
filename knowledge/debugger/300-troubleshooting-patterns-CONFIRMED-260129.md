# Topic: Troubleshooting Patterns

## Fact: Debug Output and Environment Variables
### Modified: 2026-01-29
### Priority: H

X-Fidelity provides multiple ways to enable detailed debug output for troubleshooting. Understanding these options is essential for diagnosing issues.

**CLI Debug Flags:**
```bash
# Enable verbose output
xfidelity . --verbose

# Debug specific file
xfidelity . --file src/specific/file.ts --verbose

# Set log level via environment
XFI_LOG_LEVEL=debug xfidelity .
XFI_LOG_LEVEL=trace xfidelity .

# Enable debug mode (shows technical error details)
XFI_DEBUG=true xfidelity .
```

**Key Environment Variables:**
| Variable | Values | Effect |
|----------|--------|--------|
| `XFI_LOG_LEVEL` | trace, debug, info, warn, error, fatal | Sets minimum log level |
| `XFI_DEBUG` | true/false | Enables debug mode, shows technical details |
| `XFI_VERBOSE` | true/false | Enables verbose output |
| `XFI_TELEMETRY_ENABLED` | true/false | Enables error telemetry |
| `NODE_ENV` | development/production/test | Development enables debug features |

**VSCode Extension Debug:**
```
1. Open VSCode Output panel (View > Output)
2. Select "X-Fidelity Debug" from dropdown - Extension debug logs
3. Select "X-Fidelity Analysis" from dropdown - Analysis output

4. Use Control Center (tree view):
   - Debug Info: Copy system information for bug reports
   - View Logs: Open detailed output
   - Test Extension: Verify functionality
```

**Debug Mode Detection:**
```typescript
import { isDebugEnabled, isVerboseEnabled } from '@x-fidelity/core/utils/enhancedLogger';

// True if XFI_DEBUG=true OR NODE_ENV=development OR XFI_LOG_LEVEL=debug|trace
if (isDebugEnabled()) {
  logger.debug('Detailed state', { internalData });
}

// True if XFI_VERBOSE=true OR debug is enabled
if (isVerboseEnabled()) {
  logger.info('Extra details', { context });
}
```

### References
1. [enhancedLogger.ts](../../packages/x-fidelity-core/src/utils/enhancedLogger.ts)
2. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)

---

## Fact: Common Error Diagnosis by Category
### Modified: 2026-01-29
### Priority: H

Each error category has typical causes and diagnostic approaches. Use the error code to identify the category and apply appropriate troubleshooting.

**Configuration Errors (1000-1099):**
```
Symptoms: "Archetype not found", "Invalid configuration"
Common Causes:
- Missing .xfi-config.json in project root
- Incorrect configServer URL
- Archetype name typo
- Network issues reaching config server

Diagnosis:
1. Check file exists: ls -la .xfi-config.json
2. Validate JSON syntax: cat .xfi-config.json | jq .
3. Test config server: curl -v <configServerUrl>/archetypes
4. Check archetype name in config matches server
```

**Plugin Errors (1100-1199):**
```
Symptoms: "Plugin not found", "Failed to load plugin"
Common Causes:
- Plugin not installed in dependencies
- Plugin export name mismatch
- Missing peer dependencies
- Plugin throws during initialization

Diagnosis:
1. Check plugin in node_modules: ls node_modules/@x-fidelity/plugins
2. Verify plugin exports: node -e "console.log(require('@x-fidelity/plugins'))"
3. Check for peer dependency warnings in yarn install output
4. Run with XFI_LOG_LEVEL=trace to see plugin initialization
```

**Analysis Errors (1200-1299):**
```
Symptoms: "Analysis failed", "Rule execution failed"
Common Causes:
- Syntax error in analyzed file
- Rule condition references missing fact
- Operator function throws
- Memory exhaustion on large files

Diagnosis:
1. Test specific file: xfidelity . --file <problem-file> --verbose
2. Check rule JSON for typos in fact/operator names
3. Review stack trace for exact failure location
4. Monitor memory: node --max-old-space-size=4096 ...
```

**Filesystem Errors (1300-1399):**
```
Symptoms: "File not found", "Permission denied"
Common Causes:
- Working directory mismatch
- File deleted during analysis
- Insufficient permissions
- Path outside allowed workspace

Diagnosis:
1. Verify file exists: ls -la <path>
2. Check permissions: ls -l <path>
3. Verify working directory: pwd
4. Check path is within repo bounds
```

**Network Errors (1400-1499):**
```
Symptoms: "Connection failed", "Timeout"
Common Causes:
- Config server unreachable
- Firewall blocking requests
- DNS resolution failure
- Server rate limiting

Diagnosis:
1. Test server: curl -v <configServerUrl>/health
2. Check DNS: nslookup <hostname>
3. Check for proxy: echo $HTTP_PROXY
4. Retry with longer timeout if transient
```

### References
1. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)
2. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)

---

## Fact: Reading and Interpreting Log Output
### Modified: 2026-01-29
### Priority: M

Log output follows consistent patterns. Understanding the format helps quickly identify issues.

**Standard Log Format:**
```
[HH:MM:SS.mmm] LEVEL [executionId] [component::function] message
```

**Example Log Analysis:**
```
[14:32:01.234] DEBUG [abc12def] [Core::loadConfig] Loading configuration
[14:32:01.456] INFO  [abc12def] [Core::loadConfig] Config loaded successfully
[14:32:01.567] DEBUG [abc12def] [Plugin::ast] Initializing AST plugin
[14:32:01.678] WARN  [abc12def] [Plugin::ast] Deprecated API usage detected
[14:32:02.123] ERROR [abc12def] [Core::analyze] Analysis failed
  errorId: "abc12def-5"
  code: 1201
  category: "ANALYSIS"
  stack: "Error: Cannot read property 'foo' of undefined..."
```

**Key Elements to Look For:**
1. **Execution ID** (`[abc12def]`) - Correlate all logs for same run
2. **Timestamp progression** - Identify slow operations
3. **Component path** - Locate code area
4. **Log level changes** - Warnings before errors often explain cause
5. **Error code** - Map to category for targeted investigation

**Structured Log Fields (JSON output):**
```json
{
  "@timestamp": "2026-01-29T14:32:02.123Z",
  "@level": "ERROR",
  "@component": "Core",
  "@session": "sess-abc12345",
  "message": "Analysis failed",
  "correlationId": "abc12def",
  "errorId": "abc12def-5",
  "code": 1201,
  "@file": ".../analyzer.ts",
  "@timing": { "duration": 1234, "operation": "analyze" }
}
```

### References
1. [enhancedLogger.ts](../../packages/x-fidelity-core/src/utils/enhancedLogger.ts)
2. [loggerProvider.ts](../../packages/x-fidelity-core/src/utils/loggerProvider.ts)

---

## Fact: VSCode Extension Debugging with F5
### Modified: 2026-01-29
### Priority: M

The VSCode extension has specialized debugging support via launch configurations. Use these for investigating extension-specific issues.

**Launch Configurations:**
```
1. "Run Extension" - Standard extension debugging
   - Opens Extension Development Host
   - Set breakpoints in TypeScript source
   - View extension logs in Debug Console

2. "Extension Tests" - Debug test files
   - Runs tests with debugger attached
   - Set breakpoints in test files
   - Uses packages/x-fidelity-fixtures/node-fullstack as test workspace
```

**Extension Output Channels:**
```typescript
// In extension code, logs go to Output channels:
// 1. "X-Fidelity Debug" - General extension logging
// 2. "X-Fidelity Analysis" - Analysis process output

// Access from Control Center:
// - "View Logs" button opens output panel
// - "Debug Info" copies diagnostic data
```

**Common Extension Issues:**
```
Issue: Extension not activating
Diagnosis:
1. Check Output > "Extension Host" for activation errors
2. Verify activation events in package.json
3. Check for missing dependencies

Issue: Analysis not running
Diagnosis:
1. Check "X-Fidelity Analysis" output
2. Verify CLI is installed: which xfidelity
3. Check workspace folder is valid

Issue: Tree view not updating
Diagnosis:
1. Check for errors in "X-Fidelity Debug"
2. Verify analysis completed successfully
3. Check file watcher events
```

**Collecting Debug Information:**
```
From Control Center:
1. Click "Debug Info" to copy system info
2. Includes: VSCode version, extension version, Node version, platform
3. Paste into bug reports
```

### References
1. [DEVELOPMENT.md](../../packages/x-fidelity-vscode/DEVELOPMENT.md)
2. [extensionManager.ts](../../packages/x-fidelity-vscode/src/core/extensionManager.ts)

---

## Fact: Error Recovery Actions Pattern
### Modified: 2026-01-29
### Priority: L

StandardErrorHandler supports recovery actions that suggest next steps to users. This pattern is used throughout X-Fidelity for better UX.

**Recovery Action Structure:**
```typescript
interface ErrorRecoveryAction {
  label: string;           // Button/action text
  action: () => void | Promise<void>;  // Callback
  isPrimary?: boolean;     // Highlight as main action
}
```

**Built-in Recovery Actions:**
```typescript
// Configuration errors
recoveryActions: [
  {
    label: 'Check Configuration',
    action: () => logger.info('Verify archetype and file paths'),
    isPrimary: true
  }
]

// Plugin errors
recoveryActions: [
  {
    label: 'Retry Plugin Load',
    action: () => logger.info('Retrying plugin load')
  },
  {
    label: 'Skip Plugin',
    action: () => logger.info('Skipping plugin')
  }
]

// Analysis errors
recoveryActions: [
  {
    label: 'Skip File',
    action: () => logger.info('Skipping file')
  },
  {
    label: 'Retry Analysis',
    action: () => logger.info('Retrying'),
    isPrimary: true
  }
]
```

**CLI Display:**
```
❌ X-Fidelity Error [1201]
Analysis failed for rule 'no-console-log'

Component: Core
Function: handleAnalysisError
File: /path/to/file.ts
Error ID: abc12def-5
Time: 2026-01-29T14:32:02.123Z

Suggested actions:
  → Retry Analysis
  • Skip File

Run with XFI_DEBUG=true for technical details
```

### References
1. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)
2. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)
