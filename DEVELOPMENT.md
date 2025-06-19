# X-Fidelity Development Guide

## 🚀 Quick Start (VSCode Extension Development)

### **From Monorepo Root (Recommended)**

1. **Open the monorepo root in VSCode**:
   ```bash
   code /path/to/x-fidelity  # Open monorepo root
   ```

2. **Press F5 to launch extension** or choose from Run and Debug panel:
   - **🚀 Launch X-Fidelity Extension (Dev)** - Standard development
   - **🧪 Launch Extension Tests** - Run tests with debugging  
   - **🔧 Launch Extension (Fresh Profile)** - Clean environment testing
   - **🐛 Attach to Extension Host** - Attach to running instance
   - **🏃 Complete Dev Setup + Launch** - Full setup + launch

3. **Access Control Center** in the Extension Development Host:
   - `Ctrl+Shift+P` → "X-Fidelity: Control Center"
   - Or run any X-Fidelity command and click "Control Center"

### **Single Command Setup**

```bash
# From monorepo root - complete setup + ready for F5 launch
yarn workspace x-fidelity-vscode dev:complete
```

## 🏗️ **Monorepo VSCode Configuration**

The development setup has been consolidated to work from the **monorepo root**:

### **Root .vscode Configuration Files:**
- **`.vscode/launch.json`** - All extension launch configurations
- **`.vscode/tasks.json`** - All build and test tasks  
- **`.vscode/settings.json`** - Development settings and preferences

### **Tasks Available (Ctrl+Shift+P → "Tasks: Run Task"):**
- `vscode:build-dev` - Build extension for development
- `vscode:build-test` - Build extension for testing
- `vscode:watch` - Watch mode for development
- `vscode:dev-complete` - Complete development setup
- `🧪 Run Extension Tests` - Run extension tests
- `📦 Package Extension` - Create .vsix package
- `🧹 Clean Extension` - Clean build artifacts
- `🏗️ Build All Packages` - Build entire monorepo
- `🧪 Test All Packages` - Test entire monorepo

## 🔧 **VSCode Extension Development Workflow**

### **Standard Development (F5 Launch)**
1. Open monorepo root in VSCode
2. Press **F5** (uses "🚀 Launch X-Fidelity Extension (Dev)")
3. Extension Development Host opens with built extension
4. Test Control Center and all functionality

### **Fresh Environment Testing**
1. `Ctrl+Shift+P` → "Debug: Select and Start Debugging"
2. Choose "🔧 Launch Extension (Fresh Profile)"
3. Tests extension in clean VSCode profile

### **Test Development**
1. `Ctrl+Shift+P` → "Debug: Select and Start Debugging"  
2. Choose "🧪 Launch Extension Tests"
3. Runs all extension tests with debugging

### **Watch Mode Development**
1. `Ctrl+Shift+P` → "Tasks: Run Task" → `vscode:watch`
2. Files rebuild automatically on changes
3. Press F5 to launch with latest changes

## 📦 **Extension Packaging & Distribution**

### **Development Package**
```bash
# From monorepo root
yarn workspace x-fidelity-vscode package:dev
```

### **Production Package**
```bash
# From monorepo root  
yarn workspace x-fidelity-vscode package
```

### **Install Packaged Extension**
```bash
# From monorepo root
yarn workspace x-fidelity-vscode install-vsix
```

## 🧪 **Testing**

### **Extension Tests Only**
```bash
# From monorepo root
yarn workspace x-fidelity-vscode test
```

### **All Package Tests**
```bash
# From monorepo root
yarn test
```

### **Watch Mode Testing**
```bash
# From monorepo root
yarn workspace x-fidelity-vscode test:watch
```

## 🛠️ **Development Commands**

### **From Monorepo Root:**
```bash
# Complete development setup
yarn workspace x-fidelity-vscode dev:complete

# Build extension only
yarn workspace x-fidelity-vscode dev:build

# Clean extension artifacts  
yarn workspace x-fidelity-vscode clean

# Package extension
yarn workspace x-fidelity-vscode package

# Run extension tests
yarn workspace x-fidelity-vscode test
```

### **Help & Quick Start:**
```bash
# Quick help
yarn workspace x-fidelity-vscode help

# Quick start reminder
yarn workspace x-fidelity-vscode quick-start
```

## 🚨 **Migration Notes**

### **Cleanup Required**
If you have duplicate VSCode configurations, manually remove:
```bash
# Remove duplicate .vscode folder from extension package
rm -rf packages/x-fidelity-vscode/.vscode
```

### **New Launch Behavior**
- **OLD**: Required opening `packages/x-fidelity-vscode` in VSCode
- **NEW**: Open monorepo root, press F5 from root workspace

### **Path Resolution**  
All paths now correctly resolve from monorepo root:
- Extension Development Path: `${workspaceFolder}/packages/x-fidelity-vscode`
- Output Files: `${workspaceFolder}/packages/x-fidelity-vscode/dist/**/*.js`
- Tasks use: `yarn workspace x-fidelity-vscode <command>`

## 🎯 **Benefits of New Setup**

✅ **Single F5 Launch** - Works from monorepo root  
✅ **Proper Path Resolution** - All paths correctly reference monorepo structure  
✅ **Unified Configuration** - No duplicate .vscode folders  
✅ **Workspace Integration** - Seamless integration with monorepo workflow  
✅ **Multiple Launch Modes** - Dev, test, fresh profile, attach options  
✅ **Comprehensive Tasks** - All development tasks available from root

## 🔍 **Troubleshooting**

### **F5 Not Working**
```bash
# Ensure dependencies are built
yarn workspace x-fidelity-vscode build:deps

# Clean and rebuild
yarn workspace x-fidelity-vscode clean
yarn workspace x-fidelity-vscode dev:build

# Then try F5 again
```

### **Control Center Not Opening**
1. Check Extension Development Host console for errors
2. Verify extension activated: Status bar should show "X-Fidelity"
3. Try `Ctrl+Shift+P` → "X-Fidelity: Control Center"

### **Build Errors**
```bash  
# Clean everything and rebuild
yarn workspace x-fidelity-vscode clean
yarn workspace x-fidelity-vscode dev:complete
```

This setup provides a **world-class development experience** for the X-Fidelity VSCode extension within the monorepo structure! 