---
description: X-Fidelity plugin system architecture and development patterns
crux: true
---

# Plugin Architecture

## Plugin System Overview
X-Fidelity uses a modular plugin architecture located in **[packages/x-fidelity-plugins](mdc:packages/x-fidelity-plugins)** with the following structure:

## Core Plugins
- **xfiPluginAst** - AST analysis and code complexity metrics
- **xfiPluginDependency** - Dependency analysis and management
- **xfiPluginFilesystem** - File system operations and validation
- **xfiPluginOpenAI** - AI-powered code analysis
- **xfiPluginPatterns** - Code pattern detection
- **xfiPluginReactPatterns** - React-specific pattern analysis
- **xfiPluginRemoteStringValidator** - Remote validation services
- **xfiPluginRequiredFiles** - Required file existence validation
- **xfiPluginSimpleExample** - Template for new plugin development

## Plugin Structure
Each plugin follows this standard structure:
```
xfiPlugin{Name}/
├── index.ts          # Main plugin export
├── facts/            # Data collection logic
│   ├── {name}Fact.ts
│   └── {name}Fact.test.ts
├── operators/        # Analysis and processing logic
│   ├── {name}Operator.ts
│   └── {name}Operator.test.ts
├── sampleRules/      # Example rule configurations
│   └── {name}-rule.json
└── types.ts         # Plugin-specific type definitions
```

## Plugin Development Pattern
1. **Facts**: Collect raw data from codebase analysis
2. **Operators**: Process facts into actionable insights
3. **Rules**: Define how operators should be applied
4. **Types**: Provide strong typing for plugin interfaces

## Key Plugin Files
- **[src/index.ts](mdc:packages/x-fidelity-plugins/src/index.ts)** - Main plugin registry
- **[src/sharedPluginUtils/astUtils.ts](mdc:packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils.ts)** - Shared utilities for AST manipulation

## Plugin Integration
Plugins are automatically loaded by the core engine and extend the analysis capabilities. The plugin system supports:
- Dynamic fact collection
- Configurable operators
- Custom rule definitions
- Type-safe interfaces
- Comprehensive testing framework

## Development Guidelines
- All plugins must include comprehensive unit tests
- Follow the established naming conventions
- Implement both facts and operators for complete functionality
- Provide sample rules for documentation
- Use shared utilities when possible to avoid duplication
