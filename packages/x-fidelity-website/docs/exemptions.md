---
sidebar_position: 10
---

# Exemptions

Exemptions in x-fidelity provide a way to temporarily waive specific rules for a given repository. This feature is useful when you need to make exceptions to your standard rules due to specific project requirements or during a transition period.

## How Exemptions Work

1. **Definition**: An exemption is defined for a specific rule and repository URL, with an expiration date and a reason.

2. **Storage**: Exemptions can be stored in two ways:
   - Single JSON file: `[archetype]-exemptions.json`
   - Directory of JSON files: `[archetype]-exemptions/*.json`

3. **Structure**: Each exemption is an object with:
   ```json
   {
     "repoUrl": "git@github.com:org/repo.git",
     "rule": "outdatedFramework-global",
     "expirationDate": "2024-12-31",
     "reason": "Upgrade scheduled for Q4"
   }
   ```

4. **Application**: When x-fidelity runs, it checks if there's an active exemption for each rule violation before reporting it.

## Managing Exemptions

### Local Configuration

Create an exemptions file or directory:

```bash
# Single file approach
touch config/node-fullstack-exemptions.json

# Directory approach
mkdir -p config/node-fullstack-exemptions
touch config/node-fullstack-exemptions/team1-exemptions.json
```

### Remote Configuration

Exemptions can be fetched from the config server:

```bash
xfidelity . --configServer https://config-server.example.com
```

The server endpoint `/archetypes/:archetype/exemptions` provides the exemptions.

### Example Exemption Files

Single file (`node-fullstack-exemptions.json`):
```json
[
  {
    "repoUrl": "git@github.com:org/repo.git",
    "rule": "outdatedFramework-global",
    "expirationDate": "2024-12-31",
    "reason": "Upgrade scheduled for Q4"
  },
  {
    "repoUrl": "git@github.com:org/repo.git",
    "rule": "sensitiveLogging-iterative",
    "expirationDate": "2024-09-30",
    "reason": "Security audit planned for Q3"
  }
]
```

Directory structure:
```
node-fullstack-exemptions/
├── team1-exemptions.json
└── team2-exemptions.json
```

## Security Considerations

1. **Access Control**: 
   - Limit who can create/modify exemptions
   - Use version control for exemption files
   - Require approval for exemption changes

2. **Expiration Dates**:
   - Set realistic but short-term dates
   - Review exemptions regularly
   - Plan for removing exemptions

3. **Documentation**:
   - Require clear reasons for exemptions
   - Document planned resolution dates
   - Track exemption patterns

## Best Practices

1. **Limited Duration**:
   - Set short-term expiration dates
   - Renew if necessary rather than setting far-future dates
   - Plan for removing exemptions

2. **Clear Documentation**:
   - Provide detailed reasons
   - Include ticket/issue references
   - Document resolution plans

3. **Regular Review**:
   - Monitor active exemptions
   - Track expiration dates
   - Plan for remediation

4. **Minimal Use**:
   - Use exemptions sparingly
   - Address root causes
   - Plan for permanent fixes

5. **Team Communication**:
   - Notify teams of exemptions
   - Share remediation plans
   - Track progress

## Telemetry

Exemption usage is tracked through telemetry:
- Exemption allowed events
- Expiration tracking
- Usage patterns

## Next Steps

- Learn about [GitHub Webhooks](github-webhooks)
- Configure [CI/CD Integration](ci-cd/overview)
- Set up [Remote Configuration](remote-configuration)
