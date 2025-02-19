---
sidebar_position: 13
---

# GitHub Webhooks

x-fidelity's config server supports GitHub webhooks for real-time configuration updates and pull request checks.

## Overview

The config server exposes two webhook endpoints:
- `/github-config-update`: Updates local config when repository changes
- `/github-pull-request-check`: Validates pull requests (future feature)

## Setup

1. Configure webhook secret:
```bash
export GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

2. Add webhook in GitHub:
   - Go to repository/organization settings
   - Add webhook
   - Set payload URL to `https://your-server/github-config-update`
   - Set content type to `application/json`
   - Set secret to match `GITHUB_WEBHOOK_SECRET`
   - Select events: `Push`

## Config Update Webhook

The `/github-config-update` endpoint:
- Validates webhook signature
- Clears server cache
- Updates local configuration
- Supports branch-specific updates

Example payload:
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "name": "x-fidelity-config",
    "owner": {
      "name": "organization"
    }
  }
}
```

## Security

The webhook implementation includes:
- Signature validation using HMAC-SHA256
- Shared secret verification
- Rate limiting
- Input validation
- Path traversal prevention

## Best Practices

1. **Security**:
   - Use strong webhook secrets
   - Enable HTTPS
   - Implement rate limiting
   - Validate payloads

2. **Configuration**:
   - Use dedicated config repositories
   - Follow branch protection rules
   - Document webhook setup
   - Monitor webhook activity

3. **Error Handling**:
   - Log webhook failures
   - Set up notifications
   - Monitor server health
   - Handle timeouts

## Next Steps

- Set up [CI/CD Integration](ci-cd/overview)
- Configure [Remote Configuration](remote-configuration)
- Implement [Telemetry](telemetry)
