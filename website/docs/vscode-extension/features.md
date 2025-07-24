# VSCode Extension Features

The X-Fidelity VSCode extension provides a comprehensive suite of features that transform the command-line analysis tool into a fully-integrated development experience.

## Core Features

### 1. Real-time Analysis
- **Auto-analysis on Save**: Automatic code analysis when files are saved
- **Progress Tracking**: Real-time progress indicators during analysis
- **Background Processing**: Non-blocking analysis execution
- **Cancellation Support**: Ability to cancel long-running analyses

### 2. Professional User Interface

#### Activity Bar Integration
- **Dedicated Sidebar**: X-Fidelity icon in the VSCode activity bar
- **Organized Views**: Multiple tree views for different aspects of analysis
- **Quick Actions**: Common operations accessible with one click
- **Status Indicators**: Real-time status updates and notifications

#### Issues Tree View
Issues are displayed in an organized tree structure with multiple grouping options:

- **By Severity**: Critical, High, Medium, Low
- **By Rule**: Group issues by the rule that triggered them
- **By File**: Organize issues by file location
- **By Category**: Group by analysis category or plugin

#### Control Center
Centralized access to all X-Fidelity functionality:

- **Analysis Controls**: Start, stop, and configure analysis
- **Settings Access**: Quick access to extension configuration
- **Report Management**: View and manage analysis reports
- **Performance Monitoring**: Access to performance metrics and statistics

### 3. Native VSCode Integration

#### Diagnostics Integration
- **Problems Panel**: Issues appear in VSCode's native Problems panel
- **Inline Decorations**: Issues highlighted directly in code editors
- **Severity Mapping**: Proper mapping of X-Fidelity severities to VSCode diagnostic levels
- **Quick Fixes**: Where applicable, suggested fixes for issues

#### Command Palette
All 47 commands accessible through VSCode's command palette:

**Core Analysis:**
- `X-Fidelity: Run Analysis Now` - Standard analysis
- `X-Fidelity: Cancel Analysis` - Stop running analysis
- `X-Fidelity: Run Analysis with Directory` - Debug with explicit workspace path
- `X-Fidelity: Detect Archetype` - Auto-detect project type

**UI & Management:**
- `X-Fidelity: Control Center` - Open main control panel
- `X-Fidelity: Dashboard` - Open issues dashboard
- `X-Fidelity: Open Settings` - Configure extension settings
- `X-Fidelity: Show Output Channel` - View debug logs

**Periodic Analysis:**
- `X-Fidelity: Start Periodic Analysis` - Enable background analysis
- `X-Fidelity: Stop Periodic Analysis` - Disable background analysis
- `X-Fidelity: Restart Periodic Analysis` - Restart background monitoring
- `X-Fidelity: Show Periodic Analysis Status` - View background state

**Performance & Debug:**
- `X-Fidelity: Show Performance Metrics` - View performance data
- `X-Fidelity: Debug Diagnostics` - Extension diagnostic information
- `X-Fidelity: Show Test Results` - Display test analysis results

**Reports & Export:**
- `X-Fidelity: Export Report` - Copy results to clipboard
- `X-Fidelity: Report History` - View analysis history
- `X-Fidelity: Share Report` - Share analysis results
- `X-Fidelity: Compare Reports` - Compare analysis results
- `X-Fidelity: View Trends` - View analysis trends

### 4. Advanced Configuration

#### Settings Integration
Comprehensive configuration through 40+ VSCode settings:

```json
{
  "xfidelity.archetype": "node-fullstack",
  "xfidelity.autoAnalyzeOnSave": false,
  "xfidelity.analysisEngine": "cli",
  "xfidelity.cliSource": "bundled",
  "xfidelity.cliTimeout": 60000,
  "xfidelity.configServer": "http://localhost:8888",
  "xfidelity.openaiEnabled": false,
  "xfidelity.maxFileSize": 524288,
  "xfidelity.cacheTTL": 30,
  "xfidelity.maxConcurrentAnalysis": 1,
  "xfidelity.decorationLimit": 50,
  "xfidelity.astCacheSize": 150,
  "xfidelity.periodicAnalysis.enabled": false,
  "xfidelity.periodicAnalysis.intervalMinutes": 5,
  "xfidelity.statusBarVisibility": true,
  "xfidelity.showInlineDecorations": true,
  "xfidelity.excludePatterns": ["**/node_modules/**", "**/dist/**"]
}
```

#### Workspace Support
- **Multi-workspace**: Support for VSCode multi-root workspaces
- **Monorepo Aware**: Intelligent handling of monorepo structures
- **Project-specific Config**: Support for `.xfi-config.json` files
- **Workspace Settings**: Workspace-level configuration overrides

### 5. Performance & Monitoring

#### Built-in Performance Monitoring
- **Operation Timing**: Track timing of all analysis operations
- **Memory Usage**: Monitor memory consumption during analysis
- **WASM Performance**: Specialized monitoring for WASM Tree-sitter operations
- **Worker Thread Stats**: Statistics for background processing

#### Performance Reports
Detailed performance insights accessible through commands:

- **Analysis Duration**: Time taken for complete analysis cycles
- **Plugin Performance**: Individual plugin execution times
- **File Processing**: Per-file analysis metrics
- **Memory Tracking**: Memory usage patterns and optimization opportunities

### 6. Enhanced Debugging

#### Comprehensive Logging
- **Multiple Log Levels**: Trace, Debug, Info, Warn, Error, Fatal
- **Structured Logging**: JSON-formatted logs with context
- **Performance Logs**: Detailed timing and performance data
- **Error Tracking**: Comprehensive error reporting and stack traces

#### Debug Output Channels
- **X-Fidelity Debug**: Main debug output channel
- **Performance Metrics**: Dedicated channel for performance data
- **WASM Diagnostics**: WASM Tree-sitter specific debugging information

### 7. Advanced Analysis Features

#### AST Analysis
- **Tree-sitter Integration**: Advanced AST parsing capabilities
- **Multi-language Support**: JavaScript, TypeScript, and extensible to other languages
- **Pattern Matching**: Sophisticated code pattern detection
- **Fallback Mechanisms**: Graceful degradation when WASM is unavailable

#### Plugin System Integration
Full access to all 9 X-Fidelity plugins with universal logging:

- **AST Plugin** (`xfiPluginAst`): Advanced syntax tree analysis with Tree-sitter
- **Dependency Plugin** (`xfiPluginDependency`): Package dependency version validation
- **Filesystem Plugin** (`xfiPluginFilesystem`): File structure and content analysis
- **OpenAI Plugin** (`xfiPluginOpenAI`): AI-powered code analysis and suggestions
- **Patterns Plugin** (`xfiPluginPatterns`): Regular expression and pattern matching
- **React Patterns Plugin** (`xfiPluginReactPatterns`): React-specific pattern detection
- **Remote Validator Plugin** (`xfiPluginRemoteStringValidator`): External API validation
- **Required Files Plugin** (`xfiPluginRequiredFiles`): File existence verification
- **Simple Example Plugin** (`xfiPluginSimpleExample`): Template for custom plugins

### 8. Command Delegation System

#### Extensible Command Architecture
X-Fidelity features a powerful command delegation system that allows other VSCode extensions to provide enhanced implementations for issue explanation, fixing, and batch operations:

- **Issue Explanation**: Other extensions can provide AI-powered or specialized explanations
- **Issue Fixing**: Extensions can offer automated fixes tailored to specific rule types
- **Batch Operations**: Support for fixing multiple issues simultaneously
- **Discovery**: Automatic detection of compatible extensions in your VSCode environment

#### Extension Points
Other extensions can integrate with X-Fidelity by declaring extension points:

```json
{
  "contributes": {
    "xfidelity.issueExplainer": [{
      "id": "ai-explainer",
      "displayName": "AI Code Explainer", 
      "command": "myExtension.explainXFidelityIssue"
    }],
    "xfidelity.issueFixer": [{
      "id": "auto-fixer",
      "displayName": "Auto Code Fixer",
      "command": "myExtension.fixXFidelityIssue",
      "supportsBatch": true
    }]
  }
}
```

#### User Configuration
Users can easily configure which extensions handle different command types:

- **Command Palette**: `X-Fidelity: Configure Command Providers`
- **Settings**: Direct configuration through VSCode settings
- **Built-in Fallbacks**: Default implementations when no external extension is configured

For detailed information, see the [Command Delegation Guide](command-delegation.md).

### 9. Report Management

#### Analysis Reports
- **JSON Reports**: Machine-readable analysis results
- **Markdown Reports**: Human-readable summaries
- **Historical Data**: Track analysis results over time
- **Export Capabilities**: Export reports in various formats

#### Result Storage
- **Dedicated Directory**: Results stored in `.xfiResults/` directory
- **Timestamped Files**: Automatic timestamping of all reports
- **Cleanup Management**: Automatic cleanup of old reports
- **Workspace Isolation**: Results isolated per workspace

## Usage Examples

### Basic Workflow

1. **Open Project**: Open your project in VSCode
2. **Find Extension**: Click the X-Fidelity icon in the activity bar
3. **Configure**: Set your archetype and configuration server in settings
4. **Run Analysis**: Use `Ctrl+Shift+P` → `X-Fidelity: Run Analysis Now`
5. **Review Results**: Check the Issues tree view and Problems panel
6. **Navigate**: Click on issues to jump to relevant code locations

### Advanced Workflows

#### Continuous Monitoring
Enable auto-analysis for continuous code quality monitoring:

```json
{
  "xfidelity.autoAnalyzeOnSave": true,
  "xfidelity.analysisTimeout": 30000
}
```

#### Performance Optimization
Monitor and optimize analysis performance:

1. Run `X-Fidelity: Show Performance Report`
2. Identify slow operations or high memory usage
3. Adjust timeout settings or exclude patterns as needed
4. Monitor WASM status for AST analysis optimization

#### Custom Configurations
Set up project-specific configurations:

1. Create `.xfi-config.json` in project root
2. Configure exemptions and additional plugins
3. Set workspace-specific VSCode settings
4. Use remote configuration servers for team consistency

## Troubleshooting Features

### Performance Issues
- **Timeout Settings**: Adjust analysis timeout for large codebases
- **Exclude Patterns**: Skip irrelevant files and directories
- **Memory Monitoring**: Track memory usage and optimize accordingly

### Analysis Failures
- **Fallback Mechanisms**: Graceful degradation when components fail
- **Error Reporting**: Detailed error messages and stack traces
- **Debug Channels**: Multiple output channels for different types of information

### Configuration Problems
- **Settings Validation**: Real-time validation of configuration settings
- **Config Server Testing**: Built-in testing of remote configuration connections
- **Plugin Loading**: Detailed logging of plugin loading and initialization

## Next Steps

- [Development Guide](./development.md) - Contributing to extension development
- [Configuration Guide](../local-config.md) - Advanced configuration options
- [Plugin Development](../plugins/overview.md) - Creating custom plugins