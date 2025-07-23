# 🚀 X-Fidelity VSCode Extension Development Guide

## 🚀 Quick Start (F5 Debug Workflow)

**The fastest way to develop and test the extension:**

1. **Open Extension in VSCode**

   ```bash
   cd packages/x-fidelity-vscode
   code .
   ```

2. **Press F5**
   - Automatically builds the extension
   - Opens new VSCode window with extension loaded
   - Extension analyzes the workspace automatically
   - Issues appear in tree view with ⚡ lightning icon

3. **Test Core Features**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Type "X-Fidelity" to see all commands
   - Click lightning ⚡ icon in Activity Bar
   - View issues in tree view
   - Use Control Center for settings

## 🏗️ Architecture Overview

### Zero-Configuration Design

- **Auto-detects** project archetype on startup
- **Fallback** to `node-fullstack` if detection fails
- **No manual setup** required - works like `xfidelity .` CLI
- **Progress indicators** based on file count
- **5-minute timeout** configurable per user requirements

### Core Components

```
Extension Manager          - Main coordinator
├── Auto-Detection        - Archetype detection with fallback
├── Analysis Manager      - Runs X-Fidelity core analysis
├── Diagnostic Provider   - Converts issues to VSCode diagnostics
├── Tree View Manager     - Shows issues in sidebar (⚡ icon)
├── Control Center        - Settings and actions panel
└── Status Bar Provider   - Shows analysis status
```

### CLI-Extension Consistency

- **VSCode extension** always spawns CLI with `--mode vscode` for clean output panel integration
- **Manual CLI execution** uses `--mode cli` for human-readable colored output
- **Exact match** requirement between `yarn build-run` and extension analysis results
- **Blocking CI** check on PR reviews

## 🧪 Testing Framework

### Consolidated Testing (VSCode Test Runner Only)

```bash
# Unit tests (fast, no VSCode API)
yarn test:unit

# Integration tests (with VSCode API)
yarn test:integration

# CLI-Extension consistency (5min timeout)
yarn test:consistency

# All tests
yarn test:all

# Watch mode for development
yarn test:watch
```

### Test Structure

```
src/test/
├── suite/                 # VSCode extension tests
│   ├── extension.test.ts  # Core extension functionality
│   ├── consistency.test.ts # CLI-Extension consistency
│   └── workspaceUtils.test.ts # Utility functions
└── integration/           # Future integration tests
```

## 📋 Essential Commands (Reduced from 27+ to 16)

### Core Commands (Always Available)

- `X-Fidelity: Test Extension` - Debug helper
- `X-Fidelity: Run Analysis Now` - Manual analysis trigger
- `X-Fidelity: Control Center` - Main settings interface
- `X-Fidelity: Refresh Issues` - Reload issue tree

### Settings & Configuration (Submenu)

- `X-Fidelity Settings: Open Settings`
- `X-Fidelity Settings: Detect Project Archetype`
- `X-Fidelity Settings: Reset Configuration`
- `X-Fidelity Settings: Advanced Settings`

### Reports & Analysis (Submenu)

- `X-Fidelity Reports: Open Reports Folder`
- `X-Fidelity Reports: Export Current Report`
- `X-Fidelity Reports: Show Report History`
- `X-Fidelity Reports: View Issue Trends`

### Context Menu Only (Issue Items)

- `Go to Issue` - Navigate to issue location
- `Add Exemption` - Exempt specific issue
- `Show Rule Info` - View rule documentation
- `Add Bulk Exemptions` - Exempt multiple issues

## 🔧 Development Scripts

### Build & Development

```bash
# Clean build for development
yarn dev:build

# Start extension with F5 workflow
yarn dev

# Fresh profile (clean VSCode settings)
yarn dev:fresh

# Watch mode (auto-rebuild on changes)
yarn dev:watch
```

### Testing & Verification

```bash
# Quick verification (unit tests + extension check)
yarn verify:quick

# Full verification (all tests + packaging)
yarn verify:all

# CI verification (for automated testing)
yarn verify:ci
```

### Packaging & Distribution

```bash
# Development package
yarn package:dev

# Production package
yarn package

# Install locally for testing
yarn install-vsix
```

## 🤖 CI/CD Pipeline

### GitHub Actions (ubuntu-latest, headless)

- **Triggers**: PR reviews, publish events
- **Headless Testing**: Xvfb for VSCode extension tests
- **Consistency Check**: CLI vs Extension exact match
- **Artifact Storage**: 30-day retention for consistency reports
- **Blocking**: Fails build on timeout or inconsistency

### Workflow Jobs

1. **test-extension** - Run all extension tests
2. **consistency-check** - Verify CLI-Extension parity
3. **publish-check** - Package verification (on label)

## 🛠️ Debugging & Troubleshooting

### F5 Debug Launch Options

- **"Run Extension"** - Standard development debugging
- **"Extension Tests"** - Debug test suite
- **"Extension Tests (Fresh Profile)"** - Clean environment testing
- **"Consistency Tests"** - Debug CLI-Extension consistency
- **"Extension + Tests"** - Compound launch (both extension and tests)

### Common Issues & Solutions

**Extension not finding issues:**

1. Check workspace has recognizable project files
2. Verify archetype detection worked (see notification)
3. Check Output panel > X-Fidelity Debug for logs
4. Run `X-Fidelity: Test Extension` command

**Tests hanging:**

1. Tests have 5-minute timeout as specified
2. Check Xvfb setup for headless environments
3. Verify workspace folder is properly set
4. Use fresh profile if state issues persist

**CLI-Extension inconsistency:**

1. Check that both use same archetype
2. Verify workspace root is identical
3. Review consistency report artifacts
4. Ensure all dependencies are built (`yarn build`)

### Performance Monitoring

- **File count progress** - Shows analysis progress
- **5-minute timeout** - Configurable analysis limit
- **Progress indicators** - Visual feedback during analysis
- **Diagnostic logging** - Detailed execution tracking

## 📁 File Structure

```
packages/x-fidelity-vscode/
├── .vscode/                # F5 debug configuration
│   ├── launch.json        # Debug launch configurations
│   └── tasks.json         # Build and test tasks
├── src/
│   ├── core/              # Extension manager and coordination
│   ├── analysis/          # X-Fidelity core integration
│   ├── configuration/     # Auto-detection and settings
│   ├── diagnostics/       # Issue to VSCode diagnostic conversion
│   ├── ui/                # Tree views, panels, status bar
│   │   ├── treeView/      # Issues tree (⚡ icon) and Control Center
│   │   └── panels/        # Settings and dashboard panels
│   ├── test/              # VSCode extension tests
│   └── utils/             # Utility functions
├── docs-archive/          # Outdated documentation (git-ignored)
├── .vscode-test.js        # VSCode test configuration
├── package.json           # Dependencies and scripts
└── README.md              # User installation guide
```

## 🎯 Success Criteria

**F5 Launch → Extension Works → Issues Display → Lightning Icon ⚡**

A successful development session should achieve:

- ✅ F5 launches extension without errors
- ✅ Auto-detects archetype (or uses node-fullstack fallback)
- ✅ Shows same issues as `yarn build-run` CLI command
- ✅ Lightning ⚡ icon visible in Activity Bar
- ✅ Issues tree view populated and functional
- ✅ All tests pass (unit + integration + consistency)
- ✅ Zero configuration required by user

**Need Help?**

- Press F5 → Extension launches → Use Control Center
- Check Output panel → X-Fidelity Debug for detailed logs
- Run `yarn help` for available commands
- See GitHub Actions artifacts for CI consistency reports

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
- File logs are written to `.xfiResults/x-fidelity.log` (only if `--enable-file-logging` is used)

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
- Verify all dependencies built: `npx nx run-many --target=build --all`
- Try fresh profile: `npx nx run vscode:dev:fresh`

**WASM errors**

- Check if WASM files exist in `dist/`
- Verify Tree-sitter initialization logs
- Use Control Center to check WASM status

**Analysis not running**

- Open Control Center and check status
- Verify workspace folder is open
- Check configuration settings

**Tests failing**

- Ensure clean build: `npx nx reset && npx nx run-many --target=build --all`
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

_The Control Center makes X-Fidelity development faster and more intuitive than ever._
