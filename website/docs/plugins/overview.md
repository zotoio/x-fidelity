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

1. Install plugin packages:
```bash
yarn add xfi-plugin-name
```

2. Enable plugins when running x-fidelity:
```bash
xfidelity . -e xfi-plugin-name another-plugin
```

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
