# Node Binary Path Override Setting

## Overview

The `xfidelity.nodeGlobalBinPath` setting provides a failsafe mechanism to override automatic binary discovery for all Node.js-related commands (node, npm, yarn, npx, etc.).

## When to Use

Use this setting when:

- Automatic binary discovery fails for your specific setup
- You have a custom Node.js installation in a non-standard location
- You're using a version manager that isn't automatically detected
- You want to ensure consistent binary paths across your team

## Configuration

Add this setting to your VSCode settings (User or Workspace):

```json
{
  "xfidelity.nodeGlobalBinPath": "/path/to/your/node/bin"
}
```

## Platform Examples

### macOS with Homebrew
```json
{
  "xfidelity.nodeGlobalBinPath": "/opt/homebrew/bin"
}
```

### macOS with nvm (specific version)
```json
{
  "xfidelity.nodeGlobalBinPath": "~/.nvm/versions/node/v20.0.0/bin"
}
```

### Linux with custom installation
```json
{
  "xfidelity.nodeGlobalBinPath": "/usr/local/node/bin"
}
```

### Windows with Node.js installer
```json
{
  "xfidelity.nodeGlobalBinPath": "C:\\Program Files\\nodejs"
}
```

## How It Works

1. When set, this path takes **highest priority** in binary discovery
2. The path is validated to ensure it exists before use
3. If the path doesn't exist, a warning is logged and automatic discovery continues
4. The `~` symbol is automatically expanded to your home directory

## Debugging

To see if your override path is being used:

1. Open the X-Fidelity output channel in VSCode
2. Run an analysis
3. Look for log messages like:
   - `"Using override binary path: /your/path"`
   - `"Override binary path does not exist: /your/path"` (if path is invalid)

## Default Behavior

Leave this setting empty (`""`) to use automatic binary discovery, which handles:
- nvm (Node Version Manager)
- volta
- fnm (Fast Node Manager)
- Homebrew installations
- System package managers
- Standard installation paths

The automatic discovery should work for most users without needing this override.