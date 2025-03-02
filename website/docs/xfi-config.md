---
sidebar_position: 13
---

# Repository Configuration

The `.xfi-config.json` file allows you to configure x-fidelity behavior specific to your repository.

## Overview

The `.xfi-config.json` file provides repository-specific configurations that override or supplement global settings. This is particularly useful for:
- Excluding false positives
- Customizing behavior for specific repositories
- Adding custom rules, facts, operators, and plugins
- Managing repository-specific exceptions

## Configuration File

Place `.xfi-config.json` in your repository's root directory:

```json
{
  "sensitiveFileFalsePositives": [
    "path/to/exclude/file1.js",
    "path/to/exclude/file2.ts"
  ],
  "additionalRules": [],
  "additionalFacts": [],
  "additionalOperators": [],
  "additionalPlugins": []
}
```

## Configuration Options

### sensitiveFileFalsePositives

An array of file paths that should be excluded from sensitive data checks:

```json
{
  "sensitiveFileFalsePositives": [
    "src/config/defaults.ts",
    "test/fixtures/mockData.js"
  ]
}
```

- Paths should be relative to repository root
- Supports glob patterns
- Case-sensitive matching

### additionalPlugins

An array of plugin module names to load for this repository:

```json
{
  "additionalPlugins": [
    "xfiPluginSimpleExample",
    "xfiPluginRequiredFiles",
    "xfiPluginRemoteStringValidator"
  ]
}
```

- Plugin modules must be installed and accessible to x-fidelity
- Plugins provide custom facts and operators that can be used in rules
- Repository-specific plugins are loaded after archetype-specified plugins

### additionalFacts

An array of fact names to add to the archetype's facts:

```json
{
  "additionalFacts": [
    "customFact",
    "missingRequiredFiles",
    "remoteSubstringValidation"
  ]
}
```

- Facts must be provided by loaded plugins
- Repository-specific facts are merged with archetype facts
- Duplicate fact names are only loaded once

### additionalOperators

An array of operator names to add to the archetype's operators:

```json
{
  "additionalOperators": [
    "customOperator",
    "missingRequiredFiles",
    "invalidRemoteValidation"
  ]
}
```

- Operators must be provided by loaded plugins
- Repository-specific operators are merged with archetype operators
- Duplicate operator names are only loaded once

### additionalRules

An array of custom rule definitions to add to the archetype's rules:

```json
{
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
          },
          {
            "fact": "customFact",
            "operator": "customOperator",
            "value": "custom fact data"
          }
        ]
      },
      "event": {
        "type": "warning",
        "params": {
          "message": "Custom rule detected matching data",
          "details": {
            "fact": "customFact"
          }
        }
      }
    }
  ]
}
```

- Rules must follow the standard rule schema
- Rules can use any facts and operators available (including custom ones)
- Repository-specific rules are added to the archetype rules
- Rules are validated before being added

## Complete Example

Here's a complete example of a `.xfi-config.json` file that uses all available options:

```json
{
  "sensitiveFileFalsePositives": [
    "src/config/defaults.ts",
    "test/fixtures/mockData.js"
  ],
  "additionalPlugins": [
    "xfiPluginSimpleExample"
  ],
  "additionalFacts": [
    "customFact"
  ],
  "additionalOperators": [
    "customOperator"
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
          },
          {
            "fact": "customFact",
            "operator": "customOperator",
            "value": "custom fact data"
          }
        ]
      },
      "event": {
        "type": "warning",
        "params": {
          "message": "Custom rule detected matching data",
          "details": {
            "fact": "customFact"
          }
        }
      }
    }
  ]
}
```

## Usage Examples

### Adding Custom Validation with Remote API

```json
{
  "additionalPlugins": ["xfiPluginRemoteStringValidator"],
  "additionalFacts": ["remoteSubstringValidation"],
  "additionalOperators": ["invalidRemoteValidation"],
  "additionalRules": [
    {
      "name": "invalid-system-id",
      "conditions": {
        "all": [
          {
            "fact": "fileData",
            "path": "$.fileName",
            "operator": "equal",
            "value": "config.json"
          },
          {
            "fact": "remoteSubstringValidation",
            "params": {
              "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
              "flags": "gi",
              "validationParams": {
                "url": "http://validation-api/validate",
                "method": "POST",
                "headers": {
                  "Content-Type": "application/json"
                },
                "body": {
                  "systemId": "#MATCH#"
                },
                "checkJsonPath": "$.validSystems[?(@.id == '#MATCH#')]"
              },
              "resultFact": "systemIdValidationResult"
            },
            "operator": "invalidRemoteValidation",
            "value": true
          }
        ]
      },
      "event": {
        "type": "fatality",
        "params": {
          "message": "Invalid system ID detected in configuration",
          "details": {
            "fact": "systemIdValidationResult"
          }
        }
      }
    }
  ]
}
```

### Enforcing Required Files

```json
{
  "additionalPlugins": ["xfiPluginRequiredFiles"],
  "additionalFacts": ["missingRequiredFiles"],
  "additionalOperators": ["missingRequiredFiles"],
  "additionalRules": [
    {
      "name": "required-files-check",
      "conditions": {
        "all": [
          {
            "fact": "fileData",
            "path": "$.fileName",
            "operator": "equal",
            "value": "REPO_GLOBAL_CHECK"
          },
          {
            "fact": "missingRequiredFiles",
            "params": {
              "requiredFiles": [
                "/README.md",
                "/CONTRIBUTING.md",
                "/LICENSE"
              ],
              "resultFact": "missingRequiredFilesResult"
            },
            "operator": "missingRequiredFiles",
            "value": true
          }
        ]
      },
      "event": {
        "type": "warning",
        "params": {
          "message": "Required files are missing from the repository",
          "details": {
            "fact": "missingRequiredFilesResult"
          }
        }
      }
    }
  ]
}
```

## Best Practices

1. **Version Control**:
   - Include `.xfi-config.json` in your version control system to ensure consistency across your team.
   - Document changes in commit messages.
   - Review changes during code review.

2. **Documentation**:
   - Comment custom rules and their purpose.
   - Explain why specific plugins are needed.
   - Keep documentation up-to-date.

3. **Regular Review**:
   - Periodically review your `.xfi-config.json` to ensure the configurations are still necessary and valid.
   - Remove unnecessary rules or plugins.
   - Update as codebase changes.

4. **Minimal Use**:
   - Use custom rules sparingly.
   - Consider adding important rules to the archetype configuration instead.
   - Don't use to bypass security checks.

5. **Team Communication**:
   - Discuss custom rules with team.
   - Document decisions.
   - Consider alternatives.

## Validation

x-fidelity validates `.xfi-config.json` using JSON Schema. Custom rules are also validated against the rule schema before being added to the engine.

## Error Handling

If `.xfi-config.json` is invalid:
1. Error message displayed
2. Default configuration used
3. Analysis continues

If individual custom rules are invalid:
1. Warning message displayed
2. Invalid rules are skipped
3. Valid rules are still applied

## Next Steps

- Configure [Local Rules](local-config)
- Set up [Remote Configuration](remote-config)
- Learn about [Exemptions](exemptions)
- Explore [Creating Plugins](plugins/creating-plugins)
