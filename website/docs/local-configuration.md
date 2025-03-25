---
sidebar_position: 8
---

# Local Configuration

x-fidelity supports local configuration for development and testing purposes.

## Overview

Local configuration allows you to:
- Test rules offline
- Develop new rules
- Customize archetypes 
- Add custom rules, facts, operators and plugins
- Configure notifications
- Iterate quickly

## Directory Structure

```
config/
├── archetypes/
│   ├── node-fullstack.json
│   └── java-microservice.json
├── rules/
│   ├── sensitiveLogging-iterative.json
│   └── outdatedFramework-global.json
└── exemptions/
    ├── node-fullstack-exemptions/
    │   ├── team1-exemptions.json
    │   └── team2-exemptions.json
    └── java-microservice-exemptions/
        └── team3-exemptions.json
```

## Usage

Run x-fidelity with local config:

```bash
xfidelity . --localConfigPath ./config
```

## Configuration Files

### Repository Configuration (.xfi-config.json)

The `.xfi-config.json` file in your repository root allows you to customize x-fidelity's behavior:

```json
{
    "sensitiveFileFalsePositives": [
        "/src/facts/repoFilesystemFacts.ts"
    ],
    "additionalRules": [
        {
            "name": "custom-rule",
            "conditions": {
                "all": [
                    {
                        "fact": "fileData",
                        "path": "$.fileName", 
                        "operator": "equal",
                        "value": "REPO_GLOBAL_CHECK"
                    }
                ]
            },
            "event": {
                "type": "warning",
                "params": {
                    "message": "Custom rule detected matching data"
                }
            }
        },
        {
            "name": "referenced-rule",
            "path": "rules/custom-rule.json"
        },
        {
            "name": "remote-rule", 
            "url": "https://example.com/rules/custom-rule.json"
        }
    ],
    "additionalFacts": ["customFact"],
    "additionalOperators": ["customOperator"],
    "additionalPlugins": ["xfiPluginSimpleExample"],
    "notifications": {
        "recipients": {
            "email": ["team@example.com"],
            "slack": ["U123456", "U789012"],
            "teams": ["user1@example.com", "user2@example.com"]
        },
        "codeOwners": true,
        "notifyOnSuccess": false,
        "notifyOnFailure": true,
        "customTemplates": {
            "success": "All checks passed successfully! 🎉\n\nArchetype: ${archetype}\nFiles analyzed: ${fileCount}\nExecution time: ${executionTime}s",
            "failure": "Issues found in codebase:\n\nArchetype: ${archetype}\nTotal issues: ${totalIssues}\n- Warnings: ${warningCount}\n- Errors: ${errorCount}\n- Fatalities: ${fatalityCount}\n\nAffected files:\n${affectedFiles}"
        }
    }
}
```

#### sensitiveFileFalsePositives
An array of file paths relative to your repository root that should be excluded from sensitive data checks.

#### additionalRules
An array of custom rules to add to your configuration. Rules can be specified in multiple flexible ways:

1. **Inline Rules**: Define the complete rule configuration directly in the config file:
```json
{
    "name": "custom-inline-rule",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "operator": "regexMatch", 
                "value": "password"
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Found sensitive data"
        }
    }
}
```

2. **Local File References**: Reference rule files relative to your repository or config paths:
```json
{
    "name": "local-rule",
    "path": "rules/custom-rule.json"
}
```
The `path` property supports:
- Absolute paths (relative to repo root)
- Relative paths (relative to config location)
- Glob patterns (e.g. `rules/*.json`, `**/*-rule.json`)
- Multiple base directories searched in order:
  1. Local config directory
  2. Current working directory  
  3. Repository root

3. **Remote Rules**: Load rules from remote URLs:
```json
{
    "name": "remote-rule",
    "url": "https://example.com/rules/custom-rule.json"
}
```
Remote rules support:
- HTTPS URLs
- Authentication headers
- Automatic retries with exponential backoff
- Error handling with detailed logging
- Response validation
- Caching with TTL

4. **Reference Existing Rules**: Reference rules from archetypes:
```json
{
    "name": "sensitiveLogging-iterative",
    "path": "src/demoConfig/rules/sensitiveLogging-iterative-rule.json"
}
```

5. **Plugin Rules**: Load rules provided by plugins:
```json
{
    "additionalPlugins": ["xfiPluginAst"],
    "additionalRules": [
        {
            "name": "functionComplexity-iterative",
            "path": "src/plugins/xfiPluginAst/sampleRules/functionComplexity-iterative-rule.json"
        }
    ]
}
```

Rules are loaded in the order specified. For each rule:
1. The rule is validated against the schema
2. For path/URL rules, the first valid rule found is used
3. Invalid rules are skipped with a warning
4. Rules can be exempted via exemptions config
5. Duplicate rules (same name) are skipped
6. Plugin rules are loaded after archetype rules

Each rule must follow the standard rule schema with:
- `name`: Unique identifier for the rule
- `conditions`: Rule conditions using facts and operators
- `event`: The event to trigger when conditions match
- `errorBehavior`: Optional "swallow" or "fatal" 
- `onError`: Optional error handling configuration

Rule Loading Order:
1. Archetype rules (from config server or local config)
2. Plugin rules (from installed plugins)
3. Additional rules from .xfi-config.json:
   - Inline rules
   - Local file rules
   - Remote URL rules
   - Referenced rules

Duplicate Rule Handling:
- Rules with the same name are not loaded twice
- First rule loaded takes precedence
- Warning logged for duplicate rule names
- Archetype rules take precedence over additional rules

#### additionalFacts
An array of fact names to enable from installed plugins or custom implementations.

#### additionalOperators
An array of operator names to enable from installed plugins or custom implementations.

#### additionalPlugins
An array of plugin names to load. Plugins can provide additional facts, operators and rules.

#### notifications
Configure notification settings for analysis results:
- `recipients` - Configure recipients for different notification channels
- `codeOwners` - Enable/disable notifications to code owners (defaults to true)
- `notifyOnSuccess` - Send notifications for successful checks
- `notifyOnFailure` - Send notifications for failed checks
- `customTemplates` - Custom notification message templates

### Archetype Configuration

Example `node-fullstack.json`:
```json
{
    "name": "node-fullstack",
    "rules": [
        "sensitiveLogging-iterative",
        "outdatedFramework-global"
    ],
    "operators": [
        "fileContains",
        "outdatedFramework"
    ],
    "facts": [
        "repoFilesystemFacts",
        "repoDependencyFacts"
    ],
    "config": {
        "minimumDependencyVersions": {
            "react": ">=17.0.0"
        },
        "standardStructure": {
            "src": {
                "components": null,
                "utils": null
            }
        }
    }
}
```

### Rule Configuration

Example `sensitiveLogging-iterative.json`:
```json
{
    "name": "sensitiveLogging-iterative",
    "conditions": {
        "all": [
            {
                "fact": "fileContent",
                "operator": "contains",
                "value": "password"
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Potential sensitive data exposure"
        }
    }
}
```

### Exemption Configuration

Example `team1-exemptions.json`:
```json
[
    {
        "repoUrl": "git@github.com:org/repo.git",
        "rule": "outdatedFramework-global",
        "expirationDate": "2024-12-31",
        "reason": "Upgrade scheduled for Q4"
    }
]
```

## Best Practices

1. **Version Control**: Keep configurations in version control
2. **Documentation**: Document custom rules and archetypes
3. **Testing**: Test configurations before deployment
4. **Organization**: Use clear naming conventions
5. **Maintenance**: Regularly review and update configurations
6. **Security**: Validate remote rule sources
7. **Modularity**: Break complex rules into smaller, reusable components
8. **Validation**: Test rules with sample data before deployment

## Next Steps

- Learn about [Remote Configuration](remote-configuration)
- Explore [Archetypes](archetypes)
- Create custom [Rules](rules)
- Develop [Plugins](plugins/overview)
