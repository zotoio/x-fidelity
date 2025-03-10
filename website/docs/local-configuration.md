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

### Notification Configuration

Example notification settings in `.xfi-config.json`:
```json
{
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

## Best Practices

1. **Version Control**: Keep configurations in version control
2. **Documentation**: Document custom rules and archetypes
3. **Testing**: Test configurations before deployment
4. **Organization**: Use clear naming conventions
5. **Maintenance**: Regularly review and update configurations

## Next Steps

- Learn about [Remote Configuration](remote-configuration)
- Explore [Archetypes](archetypes)
- Create custom [Rules](rules)
