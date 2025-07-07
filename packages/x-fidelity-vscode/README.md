# X-Fidelity VSCode Extension

This is the VSCode extension for X-Fidelity, providing architectural analysis directly within your code editor.

## Development

### Development Mode Workspace Fallback

The extension now supports **development mode** with automatic workspace fallback:

- **🔧 Development Mode**: When no workspace folder is open, the extension automatically uses the `packages/x-fidelity-vscode` directory as the workspace
- **📁 Fallback Behavior**: Perfect for extension development and testing without needing to open a separate project
- **🔔 User Notification**: Shows a friendly notification when using fallback workspace mode
- **⚡ Zero Configuration**: Works immediately for contributors and developers

This makes it easy to:

- Develop and test the extension itself
- Debug extension features without a separate project
- Run X-Fidelity analysis on the extension's own codebase
- Contribute to the extension with minimal setup

### Quick Start

From the workspace root, you can use these convenient commands:

```bash
# Build and launch extension in debug mode
yarn vscode:dev

# Build and launch with fresh user data (clean state)
yarn vscode:dev:fresh

# Build, launch, and watch for changes
yarn vscode:dev:watch

# Package the extension for distribution
yarn vscode:package
```

### Local Development Scripts

From within the `packages/x-fidelity-vscode` directory:

```bash
# Build the extension
yarn build

# Build and launch in debug mode
yarn dev

# Build and launch with fresh VSCode instance
yarn dev:fresh

# Build, launch, and watch for changes
yarn dev:watch

# Watch for changes (without launching VSCode)
yarn watch

# Package for distribution
yarn package

# Clean build artifacts
yarn clean

# Run tests
yarn test
```

### VSCode Development Workflow

#### Option 1: Command Line (Recommended for quick testing)

```bash
# From workspace root
yarn vscode:dev
```

This will:

1. Clean previous builds
2. Build all dependencies
3. Build the extension
4. Launch a new VSCode window with the extension loaded

#### Option 2: VSCode Debug (Recommended for debugging)

1. Open this workspace in VSCode
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select "Run X-Fidelity Extension"
4. Press F5 or click the play button

This will:

1. Build the extension automatically
2. Launch the Extension Development Host
3. Allow you to set breakpoints and debug

#### Option 3: Watch Mode (Recommended for active development)

```bash
# From workspace root
yarn vscode:dev:watch
```

This will:

1. Build and launch the extension
2. Continue watching for file changes
3. Automatically rebuild when files change
4. You can reload the Extension Development Host (Ctrl+R) to see changes

### File Structure

```
packages/x-fidelity-vscode/
├── src/                          # Source code
│   ├── extension.ts              # Main extension entry point
│   ├── core/                     # Core extension management
│   ├── analysis/                 # Analysis functionality
│   ├── reports/                  # Report generation and management
│   ├── configuration/            # Configuration management
│   ├── diagnostics/              # VSCode diagnostics integration
│   ├── ui/                       # User interface components
│   └── utils/                    # Utilities and helpers
├── dist/                         # Built extension (generated)
├── package.json                  # Extension manifest and dependencies
├── esbuild.config.js            # Build configuration
└── README.md                     # This file
```

### Extension Features

- **Real-time Analysis**: Automatically analyzes your code as you work
- **Inline Diagnostics**: Shows issues directly in the editor with squiggly lines
- **Problems Panel**: Integrates with VSCode's Problems panel
- **Report Generation**: Creates detailed reports in multiple formats
- **Status Bar**: Shows analysis status and quick actions
- **Command Palette**: Access all features via Ctrl+Shift+P
- **Configuration**: Extensive settings for customization

### Commands

Access these commands via the Command Palette (Ctrl+Shift+P):

- `X-Fidelity: Run Analysis Now` - Trigger immediate analysis
- `X-Fidelity: Open Settings` - Open extension settings
- `X-Fidelity: Open Reports Folder` - Open the reports directory
- `X-Fidelity: Detect Project Archetype` - Auto-detect project type
- `X-Fidelity: Show Report History` - View analysis history
- `X-Fidelity: Export Report` - Export reports in various formats
- `X-Fidelity: Show Dashboard` - Open analysis dashboard

### Configuration

#### 🎯 **Built-in Demo Configuration**

The extension **automatically uses demo configuration** with sensible defaults:

- **Default Archetype**: `node-fullstack` with comprehensive rule set
- **Built-in Rules**: 15+ predefined rules including security, architecture, and code quality checks
- **All Plugins**: Automatically loads all builtin plugins with facts and operators
- **Zero Setup**: Works immediately without any configuration

#### Configuration Hierarchy

The extension resolves configuration in this order:

1. **User-specified config** (if `configServer` or `localConfigPath` is set)
2. **Home directory config** (`~/.config/x-fidelity`)
3. **Environment variable** (`$XFI_CONFIG_PATH`)
4. **🎯 Demo config** (automatically used as fallback)

#### Settings Customization

You can customize the extension through VSCode settings:

```json
{
  "xfidelity.archetype": "node-fullstack",
  "xfidelity.autoAnalyzeOnSave": true,
  "xfidelity.generateReports": true,
  "xfidelity.reportFormats": ["json", "md"],
  "xfidelity.showInlineDecorations": true,
  "xfidelity.runInterval": 300
}
```

#### Available Demo Archetypes

- `node-fullstack` (default) - Full-stack Node.js applications
- `java-microservice` - Java-based microservices
- `react-spa` - React single-page applications
- `python-service` - Python services
- `dotnet-service` - .NET services

### Output Files

The extension writes analysis results to `.xfiResults/` in your workspace:

- Reports: `xfi-report-{timestamp}.json`, `xfi-report-{timestamp}.md`
- Logs: `x-fidelity.log`
- History: `.xfidelity-history.json`

### Debugging

To debug the extension:

1. Use the "Run X-Fidelity Extension" launch configuration
2. Set breakpoints in your TypeScript source files
3. The debugger will stop at breakpoints when the extension runs

### Packaging and Distribution

```bash
# Create a .vsix package
yarn package

# Install the package locally for testing
yarn install-vsix

# Publish to marketplace (requires publisher setup)
yarn publish
```

### Testing

```bash
# Run unit tests
yarn test

# Run tests in watch mode
jest --watch
```

### Testing the Extension

After building, you can test the extension in several ways:

#### 1. Quick Test for Transport Issues

```bash
# Clean build and test
yarn clean && yarn build
yarn test

# If no transport errors appear, the fix is working
```

#### 2. Live Testing with VSCode

```bash
# Launch extension in debug mode
yarn dev

# Or with clean state
yarn dev:fresh
```

**What to look for:**

- Extension should activate without `Lt.transport is not a function` errors
- Check VSCode Developer Console (Help → Toggle Developer Tools)
- Look for X-Fidelity logs in Output panel
- Verify analysis runs without transport errors

#### 3. Environment Variable Verification

The extension sets `process.env.VSCODE_EXTENSION = 'true'` to help the core logger detect the VSCode environment and avoid transport issues.

### Common Issues and Solutions

| Issue                    | Solution                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Extension won't activate | Check Developer Console, rebuild extension                       |
| Analysis not running     | Check configuration, ensure workspace has supported project type |
| No diagnostics showing   | Check Problems panel, verify `showInlineDecorations` setting     |
| Reports not generating   | Check file permissions, verify `reportOutputDir` setting         |
| High CPU usage           | Check `runInterval` setting, disable `autoAnalyzeOnFileChange`   |

### Debug Mode

Enable debug logging by setting `"xfidelity.debugMode": true` in your VSCode settings:

```json
{
  "xfidelity.debugMode": true,
  "xfidelity.runInterval": 0
}
```

This will:

- Enable verbose logging in the Output panel
- Disable automatic analysis (set interval to 0)
- Show detailed error messages

### Contributing

1. Make your changes
2. Test with `yarn dev`
3. Run tests with `yarn test`
4. Ensure linting passes with `yarn lint`
5. Submit a pull request
