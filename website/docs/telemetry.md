---
sidebar_position: 12
---

# Telemetry

x-fidelity includes built-in telemetry support to help track usage and monitor performance.

## Overview

The telemetry system:
- Tracks analysis events
- Monitors performance
- Collects usage statistics
- Supports custom collectors

## Telemetry Events

### Analysis Events

- Analysis start
- Analysis completion
- Rule failures
- Errors encountered
- Exemptions allowed

### Performance Metrics

- Execution time
- Memory usage
- File count
- Rule count
- Cache hits/misses

## Configuration

### CLI Options

```bash
xfidelity . -t https://telemetry.example.com
```

### Environment Variables

```bash
export XFI_SHARED_SECRET=your_secret_here
```

### Headers

Telemetry requests include:
- X-Request-ID: Unique request identifier
- X-Shared-Secret: Authentication secret (partially masked)
- Content-Type: application/json

## Data Format

Example telemetry event:
```json
{
    "eventType": "analysisStart",
    "timestamp": "2024-02-20T10:30:00Z",
    "metadata": {
        "repoPath": "/path/to/repo",
        "archetype": "node-fullstack",
        "requestId": "abc-123",
        "fileCount": 100,
        "ruleCount": 5
    }
}
```

## Security

1. **Authentication**:
   - Shared secret required
   - Secret partially masked in logs
   - HTTPS recommended

2. **Data Protection**:
   - Sensitive data masked
   - PII excluded
   - Data minimization

3. **Access Control**:
   - Rate limiting
   - IP filtering
   - Audit logging

## Best Practices

1. **Collection**:
   - Collect relevant data
   - Respect privacy
   - Handle errors gracefully

2. **Storage**:
   - Secure storage
   - Data retention policy
   - Regular cleanup

3. **Analysis**:
   - Monitor trends
   - Alert on issues
   - Track usage patterns

## Next Steps

- Set up [Remote Configuration](remote-configuration)
- Configure [CI/CD Integration](ci-cd/overview)
- Review [Security Features](security)
