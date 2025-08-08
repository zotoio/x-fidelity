# CLI Reference

The X-Fidelity CLI provides powerful command-line analysis capabilities with performance optimizations, caching, and multiple output formats.

## Installation

```bash
# Install globally
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"

# Or use with npx
npx x-fidelity --help
```

## Basic Usage

```bash
# Analyze current directory
xfidelity

# Analyze specific directory
xfidelity /path/to/project

# Use specific archetype
xfidelity . --archetype react-spa

# Output JSON format
xfidelity . --output-format json

# Save output to file
xfidelity . --output-format json --output-file results.json
```

## Command Line Options

### Basic Options

- **`[directory]`** - Path to repository root (default: current directory)
- **`-d, --dir <path>`** - Path to repository root (overrides positional argument)
- **`-a, --archetype <archetype>`** - Analysis archetype (default: 'node-fullstack')
- **`-v, --version`** - Display version number
- **`-h, --help`** - Show help information

### Configuration Options

- **`-c, --configServer <url>`** - Remote config server URL for fetching configurations
- **`-l, --localConfigPath <path>`** - Path to local archetype config and rules directory

### Analysis Options

- **`-o, --openaiEnabled`** - Enable OpenAI-powered code analysis
- **`-e, --extraPlugins <modules...>`** - Space-separated list of npm modules to load as plugins
- **`-x, --examine`** - Validate archetype configuration only (no analysis)
- **`-z, --zap <files>`** - JSON array of specific files to analyze

### Output Options

- **`--output-format <format>`** - Output format: 'human' (default) or 'json'
- **`--output-file <path>`** - Write structured output to file (works with json format)

### Performance Options

- **`--file-cache-ttl <minutes>`** - File modification cache TTL in minutes (default: 60)
- **`--disableTreeSitterWorker`** - Disable TreeSitter worker threads for testing

### Server Mode Options

- **`-m, --mode <mode>`** - Run mode: 'cli' (default), 'vscode', 'server', or 'hook' (note: 'client' is deprecated; use 'cli')
- **`-p, --port <number>`** - Server port when running in server mode (default: 8888)
- **`-j, --jsonTTL <minutes>`** - Server JSON cache TTL in minutes (default: 10)

### Telemetry Options

- **`-t, --telemetryCollector <url>`** - URL for sending usage analytics

## Examples

### Basic Analysis

```bash
# Simple analysis with default settings
xfidelity .

# Analyze with specific archetype
xfidelity . --archetype java-microservice

# Analyze specific directory
xfidelity /workspace/my-project
```

### Advanced Analysis

```bash
# Enable OpenAI analysis
xfidelity . --openaiEnabled --archetype node-fullstack

# Use remote configuration
xfidelity . --configServer http://config-server:8888

# Use a GitHub config location
xfidelity . --githubConfigLocation https://github.com/org/repo/tree/main/xfi-config

# Analyze specific files only
xfidelity . --zap '["src/index.js", "src/app.js"]'

# Use additional plugins
xfidelity . --extraPlugins custom-plugin another-plugin
```

### Output Formats

```bash
# Human-readable output (default)
xfidelity . --output-format human

# JSON output for programmatic consumption
xfidelity . --output-format json

# Save JSON output to file
xfidelity . --output-format json --output-file analysis-results.json

# If no output file is specified with --output-format json, results are also written to .xfiResults/structured-output.json

# Pretty-print JSON to console
xfidelity . --output-format json | jq .
```

### Performance Optimization

```bash
# Increase file cache TTL for large projects
xfidelity . --file-cache-ttl 120

# Enable TreeSitter worker (disabled by default in CLI)
xfidelity . --enable-tree-sitter-worker

# Analyze only specific files for faster feedback
xfidelity . --zap '["src/critical-file.js"]'
```

### Configuration Server

```bash
# Start configuration server
xfidelity --mode server --port 8888

# Use configuration server
xfidelity . --configServer http://localhost:8888

# Server with custom cache TTL
xfidelity --mode server --port 8888 --jsonTTL 30
```

## Output Structure

### Human Format

The default human-readable output includes:
- Analysis summary with issue counts
- Performance metrics and timing
- Detailed issue descriptions with file locations
- Rule information and severity levels

### JSON Format

The JSON output provides structured data (note: `telemetryData` is nested under `XFI_RESULT`):

```json
{
  "XFI_RESULT": {
    "totalIssues": 5,
    "warningCount": 3,
    "errorCount": 2,
    "fatalityCount": 0,
    "exemptCount": 1,
    "filesAnalyzed": 42,
    "durationSeconds": 2.5,
    "issueDetails": [
      {
        "filePath": "/project/src/app.js",
        "errors": [
          {
            "ruleFailure": "functionComplexity-iterative",
            "level": "warning",
            "details": {
              "message": "Function complexity exceeds threshold",
              "lineNumber": 15,
              "columnNumber": 8,
              "details": {
                "complexities": [
                  {
                    "metrics": {
                      "location": {
                        "startLine": 15,
                        "startColumn": 8,
                        "endLine": 25,
                        "endColumn": 1
                      },
                      "complexity": 12,
                      "threshold": 10
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    ],
    "telemetryData": {
      "performanceMetrics": {
        "totalDuration": 2500,
        "pluginTiming": {},
        "memoryUsage": 45.2
      }
    },
    "timestamp": "2024-12-07T10:30:00Z",
    "version": "3.28.0"
  }
}
```

## Exit Codes

- **0** - Analysis completed successfully with no fatal errors
- **1** - Analysis failed due to configuration or runtime errors
- **2** - Analysis completed but found fatal-level issues
- **3** - Invalid command line arguments

## Environment Variables

- **`XFI_LOG_LEVEL`** - Set logging level (trace, debug, info, warn, error, fatal)
- **`XFI_CONFIG_PATH`** - Override path for configuration files
- **`XFI_LOG_COLORS`** - Set to `false` to disable colored CLI output (used when CLI is spawned by the VSCode extension)
- **`NODE_ENV`** - Affects default logging behavior

## Performance Considerations

### Large Codebases

For large projects (>1000 files):
- Use `--file-cache-ttl` to cache file metadata longer
- Consider `--zap` for targeted analysis
- Use remote configuration servers to avoid config parsing overhead

### CI/CD Optimization

```bash
# Fast CI analysis
xfidelity . --output-format json --file-cache-ttl 5

# Specific file analysis for pull requests
xfidelity . --zap '["changed-file1.js", "changed-file2.js"]'
```

### Memory Usage

- TreeSitter worker threads use additional memory
- Disable with `--disableTreeSitterWorker` if memory constrained
- File caching reduces I/O but increases memory usage

## Integration Examples

### GitHub Actions

```yaml
- name: Run X-Fidelity Analysis
  run: |
    npx x-fidelity . --output-format json --output-file xfi-results.json
    cat xfi-results.json | jq '.XFI_RESULT.totalIssues'
```

### Shell Scripts

```bash
#!/bin/bash
# Run analysis and check for fatal errors
xfidelity . --output-format json > results.json
FATAL_COUNT=$(cat results.json | jq '.XFI_RESULT.fatalityCount')

if [ "$FATAL_COUNT" -gt 0 ]; then
    echo "Fatal issues found: $FATAL_COUNT"
    exit 1
fi
```

## Troubleshooting

### Common Issues

**Permission Errors:**
```bash
# Ensure proper permissions
chmod +x $(which xfidelity)
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" xfidelity .
```

**Plugin Loading Errors:**
```bash
# Check plugin installation
npm list custom-plugin
xfidelity . --extraPlugins custom-plugin
```

### Debug Mode

```bash
# Enable verbose logging
XFI_LOG_LEVEL=debug xfidelity .

# Trace plugin loading
XFI_LOG_LEVEL=trace xfidelity . --examine

# Enable file logging to .xfiResults/x-fidelity.log
xfidelity . --enable-file-logging
```

For more information, see the [Quickstart](./quickstart.md) and [Configuration Reference](./archetypes.md).