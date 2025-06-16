# X-Fidelity VS Code Extension

This extension integrates the X-Fidelity code analysis tool into Visual Studio Code, providing real-time architectural analysis and feedback for your codebase.

## Features

- Automatic code analysis based on managed archetypes
- Real-time diagnostics for architectural issues
- Configurable analysis intervals
- Support for local and remote configuration

## Requirements

- Visual Studio Code 1.80.0 or higher

## Extension Settings

This extension contributes the following settings:

* `xfidelity.runInterval`: Interval (in seconds) for running background analysis. Set to 0 to disable periodic runs.
* `xfidelity.archetype`: The X-Fidelity archetype to use for analysis.
* `xfidelity.configServer`: URL of the X-Fidelity config server (optional).
* `xfidelity.localConfigPath`: Path to local X-Fidelity configuration (relative to workspace root, optional).
* `xfidelity.openaiEnabled`: Enable OpenAI analysis for advanced code insights (requires API key).
* `xfidelity.telemetryCollector`: URL where telemetry data will be sent (optional).

## Usage

1. Install the extension
2. Open a workspace containing a project you want to analyze
3. The extension will automatically run analysis based on the configured interval
4. View issues in the Problems panel
5. Run analysis manually using the command "X-Fidelity: Run Analysis Now"

## Known Issues

- Line number precision may vary depending on the rule implementation
- Global repository issues are shown in the output panel rather than as diagnostics

## Release Notes

### 0.0.1

Initial release of X-Fidelity VS Code extension.
