# X-Fidelity VS Code Extension - Installation & Troubleshooting Guide

## 🚀 Installation

### Method 1: Install from VSIX file (Recommended)

1. **Package the extension:**
   ```bash
   cd packages/x-fidelity-vscode
   yarn package
   ```

2. **Install the extension:**
   ```bash
   code --install-extension x-fidelity-vscode-0.0.1.vsix
   ```

3. **Restart VS Code** to ensure proper activation.

### Method 2: Development Installation

1. **Open the extension in VS Code:**
   ```bash
   code packages/x-fidelity-vscode
   ```

2. **Press F5** to launch a new Extension Development Host window.

## 🔧 Verification Steps

### 1. Check Extension Activation

1. Open VS Code
2. Open **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Type "X-Fidelity" - you should see these commands:
   - `X-Fidelity: Test Extension`
   - `X-Fidelity: Run Analysis Now`
   - `X-Fidelity: Open Settings`
   - `X-Fidelity: Show Dashboard`
   - And 13 more commands...

### 2. Test Basic Functionality

1. Run `X-Fidelity: Test Extension` command
2. You should see: "X-Fidelity extension is working!"
3. Check the **Output Panel** (`View > Output`) and select "X-Fidelity"
4. You should see initialization logs

### 3. Check Status Bar

- Look for X-Fidelity status in the bottom status bar
- It should show issue counts or "Ready" status

## 🐛 Troubleshooting

### Issue: Extension Not Activating

**Symptoms:**
- No X-Fidelity commands in Command Palette
- No status bar item
- No output in X-Fidelity output channel

**Solutions:**

1. **Check VS Code Version:**
   - Ensure VS Code version ≥ 1.80.0
   - Update VS Code if needed

2. **Check Extension Installation:**
   ```bash
   code --list-extensions | grep x-fidelity
   ```
   Should show: `zotoio.x-fidelity-vscode`

3. **Check Developer Console:**
   - Open `Help > Toggle Developer Tools`
   - Look for errors in Console tab
   - Common errors and solutions below

4. **Reinstall Extension:**
   ```bash
   code --uninstall-extension zotoio.x-fidelity-vscode
   code --install-extension x-fidelity-vscode-0.0.1.vsix
   ```

### Issue: Commands Not Working

**Symptoms:**
- Commands appear but show errors when executed
- "Command not found" errors

**Solutions:**

1. **Check Output Panel:**
   - `View > Output`
   - Select "X-Fidelity" from dropdown
   - Look for error messages

2. **Check Extension Logs:**
   - Open Developer Console (`Help > Toggle Developer Tools`)
   - Look for X-Fidelity related errors

3. **Verify Workspace:**
   - Ensure you have a workspace/folder open
   - Extension requires a workspace to function

### Issue: Analysis Not Running

**Symptoms:**
- Commands work but analysis fails
- No diagnostics/issues shown

**Solutions:**

1. **Check Workspace Type:**
   - Extension works best with supported project types:
     - Node.js (package.json)
     - Java (pom.xml, build.gradle)
     - Python (requirements.txt)
     - .NET (*.csproj)

2. **Check Configuration:**
   - Open `File > Preferences > Settings`
   - Search for "X-Fidelity"
   - Verify archetype setting matches your project

3. **Manual Analysis:**
   - Run `X-Fidelity: Run Analysis Now`
   - Check output for detailed error messages

### Issue: Bundled Dependencies Missing

**Symptoms:**
- Warning: "Some core dependencies may not be available"
- Analysis fails with module not found errors

**Solutions:**

1. **Rebuild Extension:**
   ```bash
   cd packages/x-fidelity-vscode
   yarn clean
   yarn bundle
   yarn package
   ```

2. **Check Bundle Contents:**
   ```bash
   yarn validate-bundle
   ```

3. **Verify Dependencies:**
   - Check `dist/bundled/` directory exists
   - Should contain: x-fidelity-core, x-fidelity-types, x-fidelity-plugins

## 🔍 Common Error Messages

### "Failed to activate X-Fidelity extension"

**Cause:** Extension activation error during startup

**Solution:**
1. Check Developer Console for detailed error
2. Ensure all dependencies are bundled
3. Try reinstalling extension

### "No workspace folder found"

**Cause:** Extension requires an open workspace/folder

**Solution:**
1. Open a folder: `File > Open Folder`
2. Or open a workspace: `File > Open Workspace`

### "Analysis failed: Cannot find module '@x-fidelity/core'"

**Cause:** Bundled dependencies not found

**Solution:**
1. Rebuild extension with bundling:
   ```bash
   yarn bundle
   yarn package
   ```
2. Reinstall the new .vsix file

## 📊 Performance Tips

### Large Projects

1. **Adjust File Size Limits:**
   - Settings: `xfidelity.maxFileSize`
   - Default: 1MB per file

2. **Configure Exclusions:**
   - Settings: `xfidelity.excludePatterns`
   - Add large directories like `node_modules`, `dist`, etc.

3. **Disable Auto-Analysis:**
   - Settings: `xfidelity.runInterval` = 0
   - Settings: `xfidelity.autoAnalyzeOnSave` = false

### Memory Usage

1. **Enable Caching:**
   - Settings: `xfidelity.cacheResults` = true
   - Settings: `xfidelity.cacheTTL` = 60 minutes

2. **Limit Concurrent Analysis:**
   - Settings: `xfidelity.maxConcurrentAnalysis` = 1-3

## 🛠️ Development & Debugging

### Enable Debug Mode

1. Open Settings (`Ctrl+,`)
2. Search for "X-Fidelity debug"
3. Enable `xfidelity.debugMode`
4. Check Output panel for detailed logs

### Extension Development

1. **Clone Repository:**
   ```bash
   git clone https://github.com/zotoio/x-fidelity.git
   cd x-fidelity/packages/x-fidelity-vscode
   ```

2. **Install Dependencies:**
   ```bash
   yarn install
   ```

3. **Build & Test:**
   ```bash
   yarn build
   yarn test
   yarn test-extension
   ```

4. **Package:**
   ```bash
   yarn package
   ```

## 📞 Getting Help

### Check Logs

1. **Extension Output:**
   - `View > Output > X-Fidelity`

2. **VS Code Developer Console:**
   - `Help > Toggle Developer Tools > Console`

3. **Extension Host Logs:**
   - `Help > Toggle Developer Tools > Console`
   - Look for extension-related errors

### Report Issues

When reporting issues, please include:

1. **VS Code Version:** `Help > About`
2. **Extension Version:** Check Extensions panel
3. **Operating System:** Windows/macOS/Linux
4. **Project Type:** Node.js/Java/Python/.NET
5. **Error Messages:** From Output panel and Developer Console
6. **Steps to Reproduce:** Detailed steps

### Useful Commands for Debugging

```bash
# Check extension status
code --list-extensions --show-versions | grep x-fidelity

# View extension logs
code --log-level trace

# Reset VS Code settings
code --reset-settings

# Start with clean profile
code --user-data-dir /tmp/vscode-clean
```

## ✅ Success Indicators

When everything is working correctly, you should see:

1. ✅ X-Fidelity commands in Command Palette
2. ✅ Status bar item showing issue counts
3. ✅ Output in X-Fidelity output channel
4. ✅ Diagnostics/squiggly lines in code files
5. ✅ Problems panel showing X-Fidelity issues
6. ✅ Settings panel with X-Fidelity configuration options

---

**Need more help?** Check the [GitHub Issues](https://github.com/zotoio/x-fidelity/issues) or create a new issue with the debugging information above. 