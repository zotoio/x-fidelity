# X-Fidelity VSCode Extension - Contributor Guide

This guide will help you get started with developing and testing the X-Fidelity VSCode extension quickly and easily.

## Quick Start for Contributors

### 1. Prerequisites

- Node.js 16+ and Yarn
- VSCode installed
- Git

### 2. Setup

```bash
# Clone and setup the workspace
git clone https://github.com/zotoio/x-fidelity.git
cd x-fidelity
yarn install

# Build all packages
yarn build

# Navigate to VSCode extension
cd packages/x-fidelity-vscode
```

### 3. Development Workflow

#### Option A: Launch Extension in Development Mode (Recommended)

1. **Open VSCode in the extension directory:**
   ```bash
   code .
   ```

2. **Press F5 or use Run > Start Debugging**
   - This will open a new VSCode window with the extension loaded
   - The extension runs in development mode with enhanced logging

3. **Test extension commands:**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type "X-Fidelity" to see all available commands
   - Try `X-Fidelity: Test Extension` first to verify it's working

#### Option B: Manual Launch

```bash
# Build the extension
yarn dev:build

# Launch VSCode with extension
code --extensionDevelopmentPath=. --new-window .
```

### 4. Testing Your Changes

#### Run Unit Tests
```bash
# Run all tests
yarn test

# Run only VSCode extension tests
yarn test:vscode
```

#### Test Commands in Development Mode

The extension has robust error handling and fallback mechanisms:

- **If initialization succeeds:** All commands work normally
- **If initialization fails:** Fallback commands are registered that:
  - Show helpful error messages
  - Direct you to logs for debugging
  - Allow you to report issues

### 5. Available Commands for Testing

| Command | Purpose | Notes |
|---------|---------|-------|
| `X-Fidelity: Test Extension` | Verify extension is working | Always works, even in fallback mode |
| `X-Fidelity: Run Analysis Now` | Trigger code analysis | Main functionality |
| `X-Fidelity: Open Settings` | Open extension settings | Configuration |
| `X-Fidelity: Control Center` | Main dashboard | Advanced UI |
| `X-Fidelity: Show Dashboard` | Analysis dashboard | Reporting |

### 6. Debugging

#### View Extension Logs

1. **Output Panel:** `View > Output` → Select "X-Fidelity" from dropdown
2. **Developer Console:** `Help > Toggle Developer Tools`
3. **Log Files:** Check workspace root for `x-fidelity.log`

#### Common Issues and Solutions

**Extension doesn't activate:**
- Check Output panel for error messages
- Try `X-Fidelity: Test Extension` command
- Look for TypeScript compilation errors

**Commands not working:**
- Extension may be in fallback mode (check notifications)
- Commands will show helpful error messages
- Check logs for initialization issues

**Plugin loading fails:**
- Extension continues with limited functionality
- Core commands still work
- Check console for WASM/plugin errors

### 7. Development Tips

#### Hot Reload
- Make code changes
- Press `Ctrl+R` / `Cmd+R` in the development VSCode window to reload
- Extension will restart with your changes

#### Build and Package
```bash
# Development build
yarn dev:build

# Production build
yarn build

# Create VSIX package
yarn package
```

#### Extension Structure
```
src/
├── extension.ts          # Main entry point
├── core/
│   ├── extensionManager.ts  # Core functionality
│   └── pluginPreloader.ts   # Plugin loading
├── analysis/             # Code analysis
├── ui/                   # User interface panels
├── diagnostics/          # Problem detection
└── utils/               # Utilities and logging
```

### 8. Making Changes

#### Adding New Commands

1. **Add to package.json:**
   ```json
   "contributes": {
     "commands": [
       {
         "command": "xfidelity.myNewCommand",
         "title": "X-Fidelity: My New Command"
       }
     ]
   }
   ```

2. **Register in ExtensionManager:**
   ```typescript
   this.disposables.push(
     vscode.commands.registerCommand('xfidelity.myNewCommand', async () => {
       // Your command logic here
     })
   );
   ```

3. **Add fallback version:**
   ```typescript
   // In registerFallbackCommands()
   fallbackCommands.push('xfidelity.myNewCommand');
   ```

#### Error Handling Best Practices

- Always wrap async operations in try-catch
- Use the logger for debugging information
- Show user-friendly error messages
- Provide recovery options when possible

### 9. Testing in Different Scenarios

#### Test Extension Activation
- Fresh workspace (no previous config)
- Workspace with existing X-Fidelity config
- Large workspace (performance testing)
- Network issues (plugin loading failures)

#### Test Command Functionality
- Run commands via Command Palette
- Test keyboard shortcuts
- Verify error handling
- Check logging output

### 10. Submitting Changes

1. **Run all tests:** `yarn test`
2. **Build successfully:** `yarn build`
3. **Test manually in development mode**
4. **Create pull request with:**
   - Clear description of changes
   - Testing steps performed
   - Screenshots if UI changes

## Architecture Notes

### Robust Error Handling

The extension is designed to be resilient:

- **Graceful degradation:** If plugins fail to load, core functionality continues
- **Fallback commands:** Always available even if initialization fails  
- **Comprehensive logging:** All errors are logged with context
- **User guidance:** Error messages include next steps

### Plugin System

- Plugins are preloaded during activation
- WASM support for AST analysis (with fallbacks)
- Dynamic import override for bundled environment
- Graceful handling of missing plugins

### Development Mode Features

- Enhanced logging and debugging
- Activation notifications
- Detailed error reporting
- Hot reload support

## Getting Help

- **Logs:** Always check the Output panel first
- **Issues:** Use the "Report Issue" button in error dialogs
- **Documentation:** See main README and other docs in the repo
- **Community:** Join discussions in GitHub issues

## Contributing Guidelines

- Follow existing code patterns
- Add tests for new functionality
- Update documentation
- Ensure backward compatibility
- Test in multiple scenarios

Happy contributing! 🚀 