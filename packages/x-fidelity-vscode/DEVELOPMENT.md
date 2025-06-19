# 🚀 X-Fidelity VSCode Extension Development Guide

## Quick Start

### 🏃 One-Command Development Setup

```bash
# From the x-fidelity-vscode directory
yarn dev:complete
```

This single command will:
- Build all workspace dependencies
- Build the VSCode extension
- Set up test directories
- Provide clear next steps

### ⚡ F5 Debug Launch

1. Open VSCode in the `x-fidelity-vscode` directory
2. Press **F5** to launch the extension host
3. In the extension host window, press **Ctrl+Shift+P**
4. Type: **"X-Fidelity: Control Center"**
5. Access all extension functionality from the unified Control Center

## 🎛️ Control Center

The **Control Center** is your main hub for all X-Fidelity functionality:

### Quick Actions
- **🔍 Run Analysis** - Analyze your codebase
- **⚙️ Settings** - Open extension settings
- **🧪 Test Extension** - Verify extension functionality
- **📝 View Logs** - Check debug output

### Panel Launcher
- **📋 Issue Explorer** - Browse and manage issues
- **📈 Dashboard** - View analysis metrics
- **📄 Reports** - Access generated reports
- **🔧 Advanced Settings** - Configure detailed options

### Status Overview
- Last analysis time
- Issue counts (errors/warnings)
- WASM status
- Plugin loading status

### Development Tools
- **🐛 Debug Info** - Copy debug information
- **🧪 Run Tests** - Execute test suite
- **🔄 Reload Extension** - Restart extension
- **💾 Export Logs** - Save logs for debugging

## 🛠️ Development Commands

### Build & Development
```bash
# Full development build
yarn dev:build

# Start development with watch mode
yarn dev:watch

# Fresh profile development (clean slate)
yarn dev:fresh

# Complete setup (dependencies + extension)
yarn dev:complete
```

### Testing
```bash
# Run all tests
yarn test:all

# Run unit tests only
yarn test:unit

# Run integration tests only
yarn test:integration

# Watch mode testing
yarn test:watch
```

### Packaging
```bash
# Create production package
yarn package

# Create development package
yarn package:dev

# Install from VSIX
yarn install-vsix
```

### Utilities
```bash
# Show development help
yarn help

# Show quick start instructions
yarn quick-start

# View logs
yarn logs
```

## 🔧 VSCode Launch Configurations

### Available Launch Modes

1. **🚀 Launch Extension (Dev)** - Standard development mode
2. **🧪 Launch Extension Tests** - Run test suite
3. **🔧 Launch Extension (Fresh Profile)** - Clean user profile
4. **🐛 Attach to Extension Host** - Debug running extension

### Using Launch Configurations

1. Open the **Run and Debug** panel (Ctrl+Shift+D)
2. Select your desired launch configuration
3. Press **F5** or click the green play button

## 📋 Development Tasks

### Available Tasks (Ctrl+Shift+P → "Tasks: Run Task")

- **🚀 Full Dev Setup** - Complete development setup
- **🧪 Run Tests** - Execute test suite
- **📦 Package Extension** - Create VSIX package

## 🔍 Debugging

### Debug Logging
- Extension logs appear in **Output** panel > **"X-Fidelity Debug"**
- Analysis logs appear in **Output** panel > **"X-Fidelity Analysis"**
- File logs are written to `.xfiResults/x-fidelity.log`

### Debug Information
- Use **Control Center** → **Development Tools** → **Debug Info**
- Copies comprehensive debug information to clipboard
- Includes extension version, VSCode version, workspace, plugin status

### Common Debug Steps
1. Open **Control Center** (Ctrl+Shift+P → "X-Fidelity: Control Center")
2. Check **Status Overview** for system status
3. Use **View Logs** to see detailed output
4. Use **Debug Info** to copy system information
5. Use **Test Extension** to verify basic functionality

## 🧪 Testing

### Running Tests
```bash
# All tests
yarn test

# Specific test patterns
yarn test:unit
yarn test:integration

# Watch mode
yarn test:watch
```

### Test Structure
- **Unit Tests**: `src/test/suite/`
- **Integration Tests**: `src/test/integration/`
- **Mocks**: `src/__mocks__/`

### Writing Tests
- Use Jest for unit tests
- Mock VSCode APIs using `src/__mocks__/vscode.ts`
- Follow existing test patterns in `src/test/suite/`

## 📁 Project Structure

```
x-fidelity-vscode/
├── .vscode/
│   ├── launch.json       # Debug configurations
│   ├── tasks.json        # Build tasks
│   └── settings.json     # Development settings
├── src/
│   ├── analysis/         # Analysis management
│   ├── configuration/    # Configuration handling
│   ├── core/            # Core extension logic
│   ├── diagnostics/     # VSCode diagnostics
│   ├── ui/              # User interface
│   │   └── panels/      # Webview panels
│   │       └── controlCenterPanel.ts  # Main control center
│   ├── utils/           # Utilities
│   └── test/            # Test files
├── scripts/
│   └── dev-complete.sh  # Development setup script
├── dist/                # Built extension
└── package.json         # Extension manifest
```

## 🎨 UI Development

### Control Center Panel
- **File**: `src/ui/panels/controlCenterPanel.ts`
- **Type**: Webview panel with HTML/CSS/JavaScript
- **Features**: Responsive design, dark/light theme support
- **Integration**: Connects to all extension functionality

### Adding New Panels
1. Create panel class in `src/ui/panels/`
2. Implement `vscode.Disposable` interface
3. Add to `ExtensionManager` constructor
4. Register command in `registerCommands()`
5. Add command to `package.json`

## 🔌 Plugin Development

### WASM Support
- Tree-sitter WASM files automatically copied to `dist/`
- Enhanced WASM initialization in `src/utils/wasmAstUtils.ts`
- Graceful fallback when WASM unavailable

### Plugin Integration
- Plugins preloaded in `src/core/pluginPreloader.ts`
- AST plugin with enhanced error handling
- Support for both CLI and VSCode environments

## 🚀 Deployment

### Creating Release
1. Update version in `package.json`
2. Run `yarn package`
3. Test the generated `.vsix` file
4. Publish to marketplace: `yarn publish`

### Installation
```bash
# Install from VSIX
code --install-extension x-fidelity-vscode-0.0.1.vsix

# Or use the install command
yarn install-vsix
```

## 🆘 Troubleshooting

### Common Issues

**Extension not loading**
- Check **Output** panel for errors
- Verify all dependencies built: `yarn build:deps`
- Try fresh profile: `yarn dev:fresh`

**WASM errors**
- Check if WASM files exist in `dist/`
- Verify Tree-sitter initialization logs
- Use Control Center to check WASM status

**Analysis not running**
- Open Control Center and check status
- Verify workspace folder is open
- Check configuration settings

**Tests failing**
- Ensure clean build: `yarn clean && yarn build`
- Check mock implementations
- Verify test environment setup

### Getting Help

1. **Control Center** → **Debug Info** - Copy system information
2. **Control Center** → **View Logs** - Check detailed logs
3. **Control Center** → **Export Logs** - Save logs for support
4. Check GitHub issues: [X-Fidelity Issues](https://github.com/zotoio/x-fidelity/issues)

## 📚 Additional Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [X-Fidelity Core Documentation](../../README.md)
- [Plugin Development Guide](../../PLUGIN_GUIDANCE.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)

---

**Happy Coding! 🎉**

*The Control Center makes X-Fidelity development faster and more intuitive than ever.* 