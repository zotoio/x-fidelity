---
sidebar_position: 1
---

# Plugin Overview

x-fidelity supports plugins that allow you to extend its core functionality without modifying the main codebase. This guide explains how plugins work and how to use them.

## What are Plugins?

Plugins are Node.js modules that:
- Add custom facts
- Add custom operators
- Provide error handlers
- Add validation logic
- Include sample rules

## Built-in Plugins

x-fidelity comes with several built-in plugins:

### Remote String Validator Plugin

The `xfiPluginRemoteStringValidator` plugin provides:
- Remote validation functionality
- Pattern extraction
- API integration
- Custom HTTP methods

Example usage:
```json
{
    "fact": "remoteSubstringValidation",
    "params": {
        "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
        "validationParams": {
            "url": "http://validator.example.com/check",
            "method": "POST",
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "value": "#MATCH#"
            },
            "checkJsonPath": "$.valid"
        },
        "resultFact": "validationResult"
    },
    "operator": "invalidRemoteValidation",
    "value": true
}
```

### Simple Example Plugin

The `xfiPluginSimpleExample` plugin demonstrates:
- Basic plugin structure
- Custom fact creation
- Custom operator creation
- Sample rule implementation

Example usage:
```json
{
    "fact": "customFact",
    "operator": "customOperator",
    "value": "custom fact data"
}
```

## Using Plugins

There are two ways to use plugins with x-fidelity:

### 1. Via CLI Option

Install plugin packages and enable them when running x-fidelity:
```bash
# Install plugins
yarn add xfi-plugin-name

# Enable plugins via CLI
xfidelity . -e xfi-plugin-name another-plugin
```

### 2. Via Archetype Configuration

Specify plugins directly in your archetype configuration:
```json
{
    "name": "my-archetype",
    "plugins": [
        "xfi-plugin-name",
        "another-plugin"
    ],
    // other archetype properties...
}
```

When using an archetype with specified plugins, x-fidelity will automatically load them without requiring the `-e` flag.

**Note:** If you specify plugins both in the archetype and via CLI, all plugins will be loaded, with CLI-specified plugins loaded first.

## Plugin Features

### Facts

Plugins can add new facts that:
- Collect custom data
- Integrate with external services
- Process files differently
- Add computed values

### Operators

Plugins can add new operators that:
- Implement custom logic
- Add validation rules
- Integrate with external tools
- Process fact data

### Error Handlers

Plugins can provide custom error handling:
- Custom error messages
- Error severity levels
- Error actions
- Notification integration

## Next Steps

- Learn how to [Create Plugins](creating-plugins)
- See [Plugin Examples](plugin-examples)
- Read [Best Practices](best-practices)
