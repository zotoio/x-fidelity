# Notifications

X-Fidelity can send notifications about analysis results through various channels. This feature helps keep teams informed about code quality issues and architectural compliance.

## Configuration

Notifications can be configured both globally and per-repository:

### Global Configuration

Set these environment variables to configure notifications globally:

```bash
# Enable/disable notifications
NOTIFICATIONS_ENABLED=true

# Configure notification providers (comma-separated)
NOTIFICATION_PROVIDERS=email,slack,teams

# Enable/disable notifications for specific events
NOTIFY_ON_SUCCESS=true
NOTIFY_ON_FAILURE=true

# Code owners integration
CODEOWNERS_PATH=.github/CODEOWNERS
CODEOWNERS_ENABLED=true
```

### Repository Configuration

Add notification settings to your `.xfi-config.json`:

```json
{
  "notifications": {
    "recipients": {
      "email": ["team@example.com"],
      "slack": ["#engineering"],
      "teams": ["Engineering Team"]
    },
    "codeOwners": true,
    "notifyOnSuccess": true,
    "notifyOnFailure": true,
    "customTemplates": {
      "success": "All checks passed successfully! 🎉\n\nArchetype: ${archetype}\nFiles analyzed: ${fileCount}\nExecution time: ${executionTime}s",
      "failure": "Issues found in codebase:\n\nArchetype: ${archetype}\nTotal issues: ${totalIssues}\n- Warnings: ${warningCount}\n- Errors: ${errorCount}\n- Fatalities: ${fatalityCount}\n\nAffected files:\n${affectedFiles}"
    }
  }
}
```

## Providers

### Email (Currently Available)

Email is currently the only fully implemented notification provider. Configure email notifications with these environment variables:

```bash
NOTIFICATION_EMAIL_HOST=smtp.example.com
NOTIFICATION_EMAIL_PORT=587
NOTIFICATION_EMAIL_SECURE=false
NOTIFICATION_EMAIL_USER=user@example.com
NOTIFICATION_EMAIL_PASS=password
NOTIFICATION_EMAIL_FROM=xfidelity@example.com
```

### Slack (Coming Soon)

Slack notifications are planned but not yet implemented.

### Microsoft Teams (Coming Soon)

Microsoft Teams notifications are planned but not yet implemented.

## Code Owners Integration

When `codeOwners` is enabled, X-Fidelity will:

1. Parse your CODEOWNERS file
2. Match affected files with code owners
3. Include relevant code owners in notifications

Example CODEOWNERS file:

```
# Default owners for everything
*       @global-owner1 @global-owner2

# Owners for specific paths
/src/frontend/   @frontend-team
/src/backend/    @backend-team
*.ts            @typescript-reviewers
```

## Notification Content

Notifications include:

- Analysis summary (archetype, files analyzed, execution time)
- Issue counts (warnings, errors, fatalities)
- Affected files with issue details
- Links to relevant code (when available)
- Full results in YAML format (email only)


## Best Practices

1. Use team channels rather than individual recipients
2. Enable code owners integration to automatically notify relevant teams
3. Configure success notifications judiciously to avoid notification fatigue
4. Use custom templates to match your team's communication style
5. Include context-specific links (CI/CD runs, documentation) in custom templates

## Troubleshooting

Common issues and solutions:

1. **Notifications not sending**
   - Check if `NOTIFICATIONS_ENABLED` is set to true
   - Verify provider credentials and webhook URLs
   - Check network connectivity to notification services

2. **Missing recipients**
   - Verify CODEOWNERS file syntax
   - Check recipient format in `.xfi-config.json`
   - Ensure providers are properly configured

3. **Rate limiting**
   - Implement exponential backoff for retries
   - Consider batching notifications
   - Monitor provider rate limits

4. **Template errors**
   - Validate template syntax
   - Check for missing variables
   - Use proper escaping for special characters
