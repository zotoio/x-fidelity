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

X-Fidelity comes with **9 built-in plugins** that provide comprehensive code analysis capabilities:

### Core Analysis Plugins

#### 1. AST Analysis Plugin (`xfiPluginAst`)
Advanced abstract syntax tree analysis for JavaScript/TypeScript:
- **Facts**: `ast`, `codeRhythm`, `functionComplexity`, `functionCount`
- **Operators**: `astComplexity`, `functionCount`
- **Capabilities**: Code complexity analysis, function metrics, syntax tree parsing

#### 2. Dependency Plugin (`xfiPluginDependency`)
Package dependency version checking and analysis:
- **Facts**: `repoDependencyVersions`, `repoDependencyFacts`, `dependencyData`, `repoDependencyAnalysis`
- **Operators**: `outdatedFramework`
- **Capabilities**: Semver validation, dependency audit, version compliance

#### 3. Filesystem Plugin (`xfiPluginFilesystem`)
File system operations and structure analysis:
- **Facts**: `repoFilesystemFacts`, `repoFileAnalysis`
- **Operators**: `fileContains`, `fileContainsWithPosition`, `nonStandardDirectoryStructure`, `hasFilesWithMultiplePatterns`
- **Capabilities**: Directory structure validation, file content analysis, pattern matching

#### 4. Pattern Matching Plugin (`xfiPluginPatterns`)
Advanced pattern matching and regex analysis:
- **Facts**: `globalFileAnalysis`
- **Operators**: `regexMatch`, `regexMatchWithPosition`, `globalPatternCount`, `globalPatternRatio`
- **Capabilities**: Global pattern analysis, regex matching, position tracking

### Specialized Plugins

#### 5. React Patterns Plugin (`xfiPluginReactPatterns`)
React-specific code pattern detection:
- **Facts**: `effectCleanupFact`, `hookDependencyFact`
- **Operators**: (None currently implemented)
- **Capabilities**: React hooks analysis, effect cleanup detection

#### 6. Remote String Validator Plugin (`xfiPluginRemoteStringValidator`)
External API validation for extracted values:
- **Facts**: `remoteSubstringValidation`
- **Operators**: `invalidRemoteValidation`
- **Capabilities**: Remote validation, HTTP integration, pattern extraction

Example usage:
```json
{
    "fact": "remoteSubstringValidation",
    "params": {
        "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
        "validationParams": {
            "url": "http://validator.example.com/check",
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "body": {"value": "#MATCH#"},
            "checkJsonPath": "$.valid"
        },
        "resultFact": "validationResult"
    },
    "operator": "invalidRemoteValidation",
    "value": true
}
```

#### 7. Required Files Plugin (`xfiPluginRequiredFiles`)
Validates presence of required project files:
- **Facts**: `missingRequiredFiles`
- **Operators**: `missingRequiredFiles`
- **Capabilities**: Required file checking, project structure validation

#### 8. OpenAI Plugin (`xfiPluginOpenAI`)
AI-powered code analysis using OpenAI's language models:
- **Facts**: `openaiAnalysis` (when OpenAI is enabled)
- **Operators**: `openaiAnalysisHighSeverity`
- **Capabilities**: AI code review, pattern detection, best practice suggestions
- **Note**: Requires `OPENAI_API_KEY` environment variable

### Development Plugins

#### 9. Simple Example Plugin (`xfiPluginSimpleExample`)
Template plugin demonstrating plugin structure:
- **Facts**: `customFact`
- **Operators**: `customOperator`
- **Capabilities**: Basic example implementation, plugin development template

Example usage:
```json
{
    "fact": "customFact",
    "operator": "customOperator",
    "value": "custom fact data"
}
```

## Using Plugins

### Built-in Plugin Loading

All built-in plugins are automatically available and loaded as needed based on your archetype configuration. No additional installation is required for the 9 built-in plugins.

### External Plugin Loading

For custom or third-party plugins, there are three ways to load them:

#### 1. Via CLI Option

Install plugin packages and enable them when running x-fidelity:
```bash
# Install external plugins
yarn global add xfi-custom-plugin another-plugin

# Enable plugins via CLI
xfidelity . -e xfi-custom-plugin another-plugin
```

#### 2. Via Archetype Configuration

Specify plugins directly in your archetype configuration:
```json
{
    "name": "my-archetype",
    "plugins": [
        "xfiPluginAst",
        "xfiPluginDependency", 
        "xfi-custom-plugin"
    ],
    "rules": ["myRule-global"],
    "config": {
        // archetype configuration...
    }
}
```

#### 3. Via Project Configuration

Add plugins to your project's `.xfi-config.json` file:
```json
{
    "additionalPlugins": [
        "xfi-custom-plugin",
        "xfiPluginOpenAI"
    ],
    "sensitiveFileFalsePositives": [
        "path/to/exclude/file.js"
    ]
}
```

### Plugin Loading Order

When plugins are specified in multiple places, they are loaded in this order:
1. CLI-specified plugins (`-e` flag)
2. Archetype-specified plugins
3. Project configuration plugins (`.xfi-config.json`)

**Note:** Duplicate plugins are automatically deduplicated, so the same plugin won't be loaded multiple times.

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
