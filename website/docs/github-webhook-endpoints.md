# GitHub Webhook Endpoints

## Overview

The x-fidelity config server provides webhook endpoints for GitHub integration. These endpoints allow automated analysis of code changes and pull requests.

## Available Endpoints

### Main Webhook (`/webhook/github`)
- Handles GitHub webhook events
- Supports push and pull request events
- Triggers analysis based on changes

### Status Check (`/webhook/github/status`) 
- Returns webhook configuration status
- Validates webhook setup

## Configuration

1. In your GitHub repository settings, add a webhook:
   - Payload URL: `https://your-server/webhook/github`
   - Content type: `application/json`
   - Secret: Configure a shared secret
   - Events: Select `push` and `pull_request`

2. Configure the server:
```json
{
  "github": {
    "webhookSecret": "your-secret-here"
  }
}
```

## Event Handling

The webhook processes these events:

### Push Events
- Triggers analysis of changed files
- Updates status checks
- Records results

### Pull Request Events  
- Analyzes PR changes
- Posts status checks
- Adds review comments

## Security

- Validates webhook signatures
- Rate limits requests
- Requires authentication
- Logs all activity

## Error Handling

- Returns appropriate status codes
- Provides detailed error messages
- Retries failed operations
- Alerts on issues

## Monitoring

- Tracks webhook performance
- Records event statistics  
- Monitors error rates
- Alerts on problems

## See Also

- [Remote Configuration](remote-configuration.md)
- [Security](security.md)
- [CI/CD Integration](ci-cd/overview.md)
