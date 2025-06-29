# VSCode Extension Installation

The X-Fidelity VSCode extension can be installed through multiple methods depending on your use case.

## Installation Methods

### 1. Development Installation (From Source)

For development or testing the latest features:

```bash
# Clone the repository
git clone https://github.com/zotoio/x-fidelity.git
cd x-fidelity

# Install dependencies
yarn install

# Build all packages
yarn build

# Launch extension in debug mode
yarn vscode:dev
```

The extension will launch in a new VSCode Extension Development Host window.

### 2. Development Commands

The monorepo provides several convenient commands for extension development:

```bash
# Build and launch extension in debug mode
yarn vscode:dev

# Build and launch with fresh user data (clean state)
yarn vscode:dev:fresh

# Build, launch, and watch for changes (recommended for active development)
yarn vscode:dev:watch

# Package the extension for distribution
yarn vscode:package
```

### 3. Package Installation

To create a `.vsix` package for installation:

```bash
# From the monorepo root
yarn vscode:package

# Install the generated .vsix file
code --install-extension packages/x-fidelity-vscode/x-fidelity-vscode-*.vsix
```

## Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **Yarn**: For package management
- **VSCode**: Latest stable version recommended

### Core Dependencies
The extension requires the X-Fidelity core packages, which are automatically installed as part of the monorepo setup:

- `@x-fidelity/core`: Core analysis engine
- `@x-fidelity/plugins`: Built-in plugins
- `@x-fidelity/types`: Shared TypeScript types

## Configuration

### Initial Setup

1. **Open VSCode**: Launch VSCode in your project directory
2. **Find X-Fidelity**: Look for the X-Fidelity icon in the activity bar
3. **Open Control Center**: Click the icon to access the main interface
4. **Configure Settings**: Access extension settings through VSCode preferences

### Workspace Configuration

The extension works best when configured at the workspace level:

```json
// .vscode/settings.json
{
  "xfidelity.archetype": "node-fullstack",
  "xfidelity.autoAnalyzeOnSave": true,
  "xfidelity.configServer": "http://your-config-server:8888",
  "xfidelity.reportOutputDir": ".xfiResults"
}
```

### Project Configuration

For project-specific configuration, create a `.xfi-config.json` file in your project root:

```json
{
  "sensitiveFileFalsePositives": [
    "path/to/exclude/file1.js"
  ],
  "additionalPlugins": [
    "xfiPluginSimpleExample"
  ]
}
```

## Verification

### Test Installation

1. **Check Extension Status**: Ensure the extension appears in the Extensions view
2. **Verify Activity Bar**: Confirm the X-Fidelity icon is visible
3. **Run Test Analysis**: Execute `X-Fidelity: Run Analysis Now` from the command palette
4. **Check Output**: Monitor the Output panel (X-Fidelity Debug) for logs

### Common Issues

**Extension Not Loading**:
- Ensure all dependencies are installed (`yarn install`)
- Check the Extension Development Host console for errors
- Verify Node.js version compatibility

**WASM Initialization Errors**:
- The extension includes fallback mechanisms for WASM failures
- Check the X-Fidelity Debug output panel for details
- Some features may be limited but basic analysis will continue

**Performance Issues**:
- Monitor the performance report via `X-Fidelity: Show Performance Report`
- Adjust analysis timeout settings if needed
- Consider excluding large files or directories

## Troubleshooting

### Debug Mode

For development and troubleshooting:

1. **Launch Debug Mode**: Press `F5` or use `yarn vscode:dev`
2. **Open Developer Tools**: `Help > Toggle Developer Tools`
3. **Check Console**: Look for error messages or warnings
4. **Review Logs**: Check the X-Fidelity Debug output channel

### Performance Monitoring

The extension includes built-in performance monitoring:

- **WASM Status**: `X-Fidelity: Show WASM Status`
- **Performance Report**: `X-Fidelity: Show Performance Report`
- **Worker Statistics**: `X-Fidelity: Worker Statistics`

### Reset Extension State

To reset the extension to a clean state:

```bash
# Launch with fresh user data
yarn vscode:dev:fresh
```

## Next Steps

- [Features Overview](./features.md) - Learn about extension capabilities
- [Development Guide](./development.md) - Contributing to extension development
- [Configuration Guide](../local-config.md) - Advanced configuration options