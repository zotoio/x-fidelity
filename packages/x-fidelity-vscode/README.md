# X-Fidelity VSCode Extension

X-Fidelity is an advanced code quality analysis tool that ensures your projects follow specific standards and best practices through a flexible, rule-based system. The VSCode extension brings this powerful analysis directly into your editor with real-time feedback and comprehensive issue management.

## 🌟 What is X-Fidelity?

X-Fidelity analyzes your codebase using configurable rules to identify:
- **Architecture violations** - Inconsistent patterns and structure issues
- **Security vulnerabilities** - Potential security risks in your code
- **Code quality issues** - Performance, maintainability, and style problems
- **Best practice violations** - Deviations from established coding standards
- **Dependency problems** - Outdated or problematic package usage

## 📦 Installation

1. **Install from VSCode Marketplace:**
   - Open VSCode
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "X-Fidelity"
   - Click "Install"

2. **Alternative: Install from VSIX:**
   ```bash
   code --install-extension x-fidelity-vscode-*.vsix
   ```

## 🚀 Quick Start

1. **Open a project** in VSCode
2. **X-Fidelity activates automatically** when you open supported file types
3. **View issues** in the Problems Panel (Ctrl+Shift+M)
4. **See inline highlights** directly in your code
5. **Use the X-Fidelity tree view** for organized issue management

### First Analysis

Run your first analysis by:
- **Command Palette:** Press `Ctrl+Shift+P`, type "X-Fidelity: Run Analysis Now"
- **Status Bar:** Click the X-Fidelity status indicator
- **Tree View:** Click the refresh button in the X-Fidelity Issues panel

## 🎯 Key Features

### Real-Time Code Analysis
- **Inline diagnostics** with squiggly underlines highlighting issues
- **Problems Panel integration** showing all issues with file locations
- **Hover tooltips** displaying rule documentation and fix suggestions
- **Auto-analysis** on file save (configurable)

### Comprehensive Issue Management
- **Issues Tree View** with multiple grouping options:
  - Group by severity (Error, Warning, Info)
  - Group by rule type
  - Group by file location
  - Group by category
- **Quick navigation** to issue locations with one click
- **Rule documentation** accessible via hover and context menus

### Code Actions & Quick Fixes
- **Add exemptions** for specific issues
- **Bulk exemption management** for multiple issues
- **Quick fixes** for automatically resolvable problems
- **Learn more** actions linking to detailed rule documentation

### Reporting & History
- **Automated report generation** in multiple formats (JSON, Markdown, HTML, CSV)
- **Report history tracking** with timestamp-based archival
- **Export capabilities** for sharing analysis results
- **Dashboard view** with analysis summaries and trends

### Configuration Flexibility
- **Built-in archetypes** for common project types
- **Custom configuration** support for team-specific rules
- **Remote configuration** via config servers
- **Performance tuning** options for large codebases

## 🔧 Configuration

### Project Archetypes

X-Fidelity includes built-in configurations for common project types:

- **`node-fullstack`** (default) - Full-stack Node.js applications
- **`java-microservice`** - Java-based microservices
- **`react-spa`** - React single-page applications
- **`python-service`** - Python services
- **`dotnet-service`** - .NET services

### Settings

Access settings via: **File → Preferences → Settings → Extensions → X-Fidelity**

#### Core Settings
```json
{
  "xfidelity.archetype": "node-fullstack",
  "xfidelity.autoAnalyzeOnSave": false,
  "xfidelity.showInlineDecorations": true,
  "xfidelity.statusBarVisibility": true
}
```

#### Analysis Engine Options
- **Extension Engine:** Built-in analysis within VSCode process
- **CLI Engine:** External CLI binary execution (faster, default)
- **CLI Source Options:**
  - **Bundled** (default): Zero-setup embedded CLI binary  
  - **Global**: System-wide installed CLI (`yarn global add x-fidelity`)
  - **Local**: Project-specific CLI installation
  - **Custom**: User-specified CLI binary path

#### Report Configuration
```json
{
  "xfidelity.generateReports": false,
  "xfidelity.reportFormats": ["json", "md"],
  "xfidelity.reportRetentionDays": 30,
  "xfidelity.showReportAfterAnalysis": false
}
```

#### Performance & Analysis Settings
```json
{
  "xfidelity.maxFileSize": 524288,
  "xfidelity.cliTimeout": 60000,
  "xfidelity.cacheTTL": 30,
  "xfidelity.maxConcurrentAnalysis": 1,
  "xfidelity.decorationLimit": 50,
  "xfidelity.astCacheSize": 150,
  "xfidelity.excludePatterns": [
    "node_modules/**",
    ".git/**", 
    "dist/**",
    "build/**"
  ],
  "xfidelity.periodicAnalysis.enabled": false,
  "xfidelity.periodicAnalysis.intervalMinutes": 5,
  "xfidelity.periodicAnalysis.onlyActiveFiles": true
}
```

### Configuration Hierarchy

X-Fidelity resolves configuration in this order:
1. **User-specified config** (via settings)
2. **Home directory config** (`~/.config/x-fidelity`)
3. **Environment variable** (`$XFI_CONFIG_PATH`)
4. **Built-in demo config** (automatic fallback)

## 🎨 User Interface

### Activity Bar
Find X-Fidelity in the Activity Bar with dedicated panels:
- **Issues Tree View** - Organized list of all code issues
- **Control Center** - Quick access to commands and settings

### Status Bar
The X-Fidelity status indicator shows:
- **Analysis status** (Running, Complete, Error)
- **Issue count** by severity
- **Quick action buttons** for common tasks

### Problems Panel
Integrated with VSCode's built-in Problems Panel (Ctrl+Shift+M):
- **All issues** displayed with file locations
- **Click to navigate** directly to issue location
- **Severity filtering** and sorting options
- **Source filtering** to show only X-Fidelity issues

### Tree Views

#### Issues Tree View
- **Hierarchical organization** of all detected issues
- **Multiple grouping modes:** Severity, Rule, File, Category
- **Context menu actions:** Go to issue, Add exemption, Show rule info
- **Real-time updates** as issues are resolved or new ones detected

#### Control Center
- **Dashboard overview** with analysis summaries
- **Quick actions** for common tasks
- **Settings shortcuts** and configuration links
- **Performance metrics** and system status

## 📋 Commands

Access all 47 commands via Command Palette (Ctrl+Shift+P):

### Core Analysis Commands
- **`X-Fidelity: Run Analysis Now`** - Trigger immediate analysis
- **`X-Fidelity: Cancel Analysis`** - Stop running analysis
- **`X-Fidelity: Run Analysis with Directory`** - Analyze specific directory
- **`X-Fidelity: Detect Project Archetype`** - Auto-detect project type

### UI & Management Commands
- **`X-Fidelity: Dashboard`** - Open main dashboard view
- **`X-Fidelity: Control Center`** - Open control center panel
- **`X-Fidelity: Open Settings`** - Open extension settings
- **`X-Fidelity: Show Output Channel`** - View debug logs

### Periodic Analysis Commands
- **`X-Fidelity: Start Periodic Analysis`** - Enable background analysis
- **`X-Fidelity: Stop Periodic Analysis`** - Disable background analysis
- **`X-Fidelity: Restart Periodic Analysis`** - Restart background monitoring
- **`X-Fidelity: Show Periodic Analysis Status`** - View background analysis state

### Report & Export Commands
- **`X-Fidelity: Export Report`** - Copy analysis results to clipboard
- **`X-Fidelity: Report History`** - View analysis history
- **`X-Fidelity: Show Performance Metrics`** - Display performance data
- **`X-Fidelity: Share Report`** - Share analysis results
- **`X-Fidelity: Compare Reports`** - Compare analysis results
- **`X-Fidelity: View Trends`** - View analysis trends over time

### Tree View Commands
- **`X-Fidelity: Refresh Issues Tree`** - Refresh issues display
- **`X-Fidelity: Group Issues by Severity`** - Group by error severity
- **`X-Fidelity: Group Issues by Rule`** - Group by rule type
- **`X-Fidelity: Group Issues by File`** - Group by file location
- **`X-Fidelity: Group Issues by Category`** - Group by analysis category

### Diagnostic & Debug Commands
- **`X-Fidelity: Debug Diagnostics`** - Show diagnostic system info
- **`X-Fidelity: Show Test Results`** - Display test analysis results

### Configuration Commands
- **`X-Fidelity: Reset Configuration`** - Reset to default settings
- **`X-Fidelity: Advanced Settings`** - Open advanced configuration

## 📊 Working with Issues

### Understanding Issue Severity
- **🔴 Error** - Critical issues that should be fixed immediately
- **🟡 Warning** - Important issues that should be addressed
- **🔵 Info** - Suggestions and best practice recommendations
- **💡 Hint** - Minor improvements and style suggestions

### Issue Actions
1. **Navigate to issue:** Click on any issue in the tree view or problems panel
2. **Add exemption:** Right-click → "Add Exemption" to suppress specific issues
3. **Bulk exemptions:** Select multiple issues for batch exemption management
4. **Learn more:** Access detailed rule documentation and fix guidance

### Code Actions
When hovering over highlighted code:
- **Quick Fix** - Apply automatic fixes when available
- **Add Exemption** - Suppress this specific issue
- **Show Rule Info** - View detailed rule documentation
- **Bulk Actions** - Manage multiple related issues

## 📁 Output Files

X-Fidelity creates a `.xfiResults/` directory in your workspace containing:

### Analysis Results
- **`XFI_RESULT.json`** - Latest analysis results in JSON format
- **`xfi-report-{timestamp}.json`** - Timestamped analysis reports
- **`xfi-report-{timestamp}.md`** - Human-readable Markdown reports

### Logs and History
- **`x-fidelity.log`** - Extension activity logs
- **`.xfidelity-history.json`** - Analysis history and trends

### Configuration
- **`.xfi-config.json`** - Project-specific configuration (if created)

## 🔧 Troubleshooting

### Common Issues

**Extension not analyzing:**
1. Check the Output panel for X-Fidelity logs
2. Verify workspace contains supported file types
3. Check exclude patterns in settings
4. Try running analysis manually via Command Palette
5. Check CLI source configuration (bundled/global/local/custom)

**Performance issues:**
1. Increase `maxFileSize` limit if needed
2. Add large directories to `excludePatterns`
3. Adjust `cliTimeout` for faster feedback
4. Use bundled CLI for best performance (default)
5. Configure periodic analysis settings
6. Monitor with performance metrics commands

**No issues showing:**
1. Verify archetype matches your project type
2. Check if files match `includePatterns`
3. Ensure rules are enabled in configuration
4. Check Problems Panel filter settings
5. Use diagnostic commands to debug extension state

### Debug Mode
Enable debug logging in settings:
```json
{
  "xfidelity.debugMode": true
}
```

### Support
- **View Logs:** Command Palette → "X-Fidelity: Show Output Channel"
- **GitHub Issues:** [Report bugs and feature requests](https://github.com/zotoio/x-fidelity/issues)
- **Documentation:** [Full documentation website](https://zotoio.github.io/x-fidelity/)

## 🎯 Best Practices

### Getting Started
1. **Start with defaults** - The built-in archetype configurations work well out of the box
2. **Review initial results** - Understand the types of issues detected in your codebase
3. **Gradually customize** - Add exemptions and tune settings based on your needs
4. **Use tree views** - Organize and prioritize issues using different grouping modes

### Team Usage
1. **Share configuration** - Commit `.xfi-config.json` for consistent team analysis
2. **Use remote config** - Centralize rules via config server for multiple projects
3. **Regular analysis** - Enable auto-analysis or run manually before commits
4. **Review reports** - Use generated reports for code quality discussions

### Performance Optimization
1. **Exclude unnecessary files** - Add build outputs and dependencies to exclude patterns
2. **Set appropriate timeouts** - Balance thoroughness with development speed
3. **Use file size limits** - Skip analysis of very large generated files
4. **Monitor metrics** - Use performance commands to track analysis efficiency

## 📚 Learn More

- **Full Documentation:** https://zotoio.github.io/x-fidelity/
- **VSCode Extension Guide:** https://zotoio.github.io/x-fidelity/vscode-extension/
- **Configuration Reference:** https://zotoio.github.io/x-fidelity/archetypes/
- **Plugin Development:** https://zotoio.github.io/x-fidelity/plugins/overview/
- **CI/CD Integration:** https://zotoio.github.io/x-fidelity/ci-cd/overview/

---

**Happy coding with X-Fidelity! 🚀**
