---
sidebar_position: 3
---

# Key Concepts

Understanding these core concepts will help you make the most of x-fidelity.

## Archetypes

An archetype is a template that defines:
- Rules to apply
- Directory structure
- Required dependencies
- File patterns to analyze
- Custom operators and facts

Example archetype:
```json
{
    "name": "node-fullstack",
    "rules": ["outdatedFramework-global", "sensitiveLogging-iterative"],
    "operators": ["fileContains", "outdatedFramework"],
    "facts": ["repoFilesystemFacts", "repoDependencyFacts"],
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

## Rules

Rules define conditions to check and actions to take. They can be:
- **Global**: Applied once per repository
- **Iterative**: Applied to each matching file

Example rule:
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

## Facts

Facts are data providers that:
- Collect information about your codebase
- Feed into rule conditions
- Can be synchronous or asynchronous
- Are extensible via plugins

Built-in facts include:
- File system information
- Dependency versions
- OpenAI analysis results

## Operators

Operators evaluate conditions by:
- Comparing fact values
- Implementing custom logic
- Supporting complex validations

Built-in operators include:
- `fileContains`
- `outdatedFramework`
- `nonStandardDirectoryStructure`
- `openaiAnalysisHighSeverity`

## Exemptions

Exemptions allow temporary rule waivers:
- Time-limited exceptions
- Specific to repository/rule pairs
- Include expiration dates
- Require documented reasons

Example exemption:
```json
{
    "repoUrl": "git@github.com:org/repo.git",
    "rule": "outdatedFramework-global",
    "expirationDate": "2024-12-31",
    "reason": "Upgrade scheduled for Q4"
}
```

## Plugins

Plugins extend functionality by adding:
- Custom facts
- Custom operators
- Error handlers
- Validation logic

Example plugin:
```javascript
module.exports = {
    name: 'my-plugin',
    version: '1.0.0',
    facts: [{
        name: 'customFact',
        fn: async () => ({ result: 'data' })
    }],
    operators: [{
        name: 'customOperator',
        fn: (factValue, expected) => factValue === expected
    }]
};
```

## Configuration Server

The config server provides:
- Centralized rule management
- Remote configuration
- Real-time updates
- Telemetry collection
- GitHub webhook integration

## Local Configuration

Local config allows:
- Offline development
- Custom rule testing
- Quick iterations
- Development flexibility

## Next Steps

- Set up your first [Archetype](archetypes)
- Create custom [Rules](rules)
- Learn about [Plugins](plugins/overview)
