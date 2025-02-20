---
sidebar_position: 8
---

# Local Configuration

x-fidelity supports local configuration for development and testing purposes. This guide explains how to set up and use local configuration files.

## Directory Structure

Your local configuration directory should follow this structure with archetypes in the root:

```
config/
├── node-fullstack.json
│   java-microservice.json
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
        },
        "blacklistPatterns": [
            ".*\\/\\..*",
            ".*\\.(log|lock)$",
            ".*\\/(dist|build|node_modules)(\\/.*|$)"
        ],
        "whitelistPatterns": [
            ".*\\.(ts|tsx|js|jsx)$"
        ]
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

## Hot Reloading

When running in server mode, x-fidelity watches your local configuration directory for changes and automatically reloads configurations when files are modified.

## Best Practices

1. **Version Control**:
   - Keep configurations in version control
   - Use a dedicated repository for configurations
   - Follow branching strategies for changes

2. **Documentation**:
   - Document custom rules and archetypes
   - Include examples and use cases
   - Maintain a changelog

3. **Testing**:
   - Test configurations before deployment
   - Validate rule effectiveness
   - Check for false positives

4. **Organization**:
   - Use clear naming conventions
   - Group related rules together
   - Maintain consistent structure

5. **Maintenance**:
   - Regularly review configurations
   - Update outdated rules
   - Remove unused configurations
   - Monitor effectiveness

## Next Steps

- Learn about [Remote Configuration](remote-configuration)
- Explore [Archetypes](archetypes)
- Create custom [Rules](rules)
