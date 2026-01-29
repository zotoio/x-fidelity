# Topic: Webhook Security Patterns

## Fact: GitHub Webhook Signature Validation
### Modified: 2026-01-29
### Priority: H

The `validateGithubWebhook` middleware authenticates GitHub webhook requests using HMAC-SHA256 signatures. The implementation:

1. Reads the `x-hub-signature-256` header from the request
2. Computes HMAC-SHA256 digest of the request body using the shared secret
3. Compares the computed digest with the provided signature

```typescript
export function validateGithubWebhook(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!githubSecret) {
    return res.status(500).send('Server is not configured for webhooks');
  }

  if (!signature) {
    return res.status(400).send('No X-Hub-Signature-256 found on request');
  }

  const hmac = crypto.createHmac('sha256', githubSecret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(400).send('Invalid signature');
  }

  next();
}
```

**Security Note**: The secret is loaded from `GITHUB_WEBHOOK_SECRET` environment variable, never hardcoded.

### References
1. [validateGithubWebhook.ts](../../packages/x-fidelity-server/src/middleware/validateGithubWebhook.ts)

---

## Fact: Shared Secret Middleware for API Authentication
### Modified: 2026-01-29
### Priority: H

The `checkSharedSecret` middleware provides simple API key authentication via the `x-shared-secret` header:

```typescript
const SHARED_SECRET = process.env.XFI_SHARED_SECRET;
const maskedSecret = SHARED_SECRET 
  ? `${SHARED_SECRET.substring(0, 4)}****${SHARED_SECRET.substring(SHARED_SECRET.length - 4)}` 
  : 'not set';

export function checkSharedSecret(req: Request, res: Response, next: NextFunction) {
  const clientSecret = req.headers['x-shared-secret'];
  if (SHARED_SECRET && clientSecret !== SHARED_SECRET) {
    logger.error(`Unauthorized access attempt with incorrect shared secret: ${maskedSecret}`);
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
```

**Security Features**:
- Secret loaded from `XFI_SHARED_SECRET` environment variable
- Failed attempts logged with masked secret (first 4 + last 4 chars visible)
- Returns 403 Forbidden for invalid secrets
- If no secret configured, allows all requests (development mode)

### References
1. [checkSharedSecret.ts](../../packages/x-fidelity-server/src/middleware/checkSharedSecret.ts)

---

## Fact: Security Audit Logging Pattern
### Modified: 2026-01-29
### Priority: M

All security modules use a consistent audit logging pattern via `securityLogger`:

```typescript
export const securityLogger = {
  auditAccess: (resource: string, action: string, result: 'allowed' | 'denied', details?: Record<string, any>) => {
    logger.info({ 
      security: true, 
      resource, 
      action, 
      result,
      details: details || {},
      timestamp: new Date().toISOString(),
      severity: result === 'denied' ? 'warning' : 'info'
    }, `Security audit: ${result.toUpperCase()} - ${action} on ${resource}`);
  },

  logSecurityViolation: (attackType: string, source: string, details: Record<string, any>) => {
    logger.error({
      security: true,
      violation: true,
      attackType,
      source,
      details,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    }, `SECURITY VIOLATION: ${attackType} from ${source}`);
  },

  logValidationSuccess: (validationType: string, input: string, details?: Record<string, any>) => {
    // Debug-level logging for successful validations
  }
};
```

**Usage Pattern**: All security decisions (allow/deny) must be logged for audit trail.

### References
1. [security/index.ts - securityLogger](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: Environment Variable Secret Management
### Modified: 2026-01-29
### Priority: H

X-Fidelity security modules consistently use environment variables for secrets:

| Variable | Purpose | Used By |
|----------|---------|---------|
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC validation | validateGithubWebhook |
| `XFI_SHARED_SECRET` | API authentication header | checkSharedSecret |
| `OPENAI_API_KEY` | OpenAI plugin authentication | OpenAI plugin |

**Best Practices Enforced**:
1. Secrets never hardcoded in source
2. Missing secrets cause graceful failures (500 for webhooks, bypass for shared secret in dev)
3. Secrets never logged directly - always masked
4. Environment-specific secrets via `.env` files (not committed)

### References
1. [validateGithubWebhook.ts](../../packages/x-fidelity-server/src/middleware/validateGithubWebhook.ts)
2. [checkSharedSecret.ts](../../packages/x-fidelity-server/src/middleware/checkSharedSecret.ts)
