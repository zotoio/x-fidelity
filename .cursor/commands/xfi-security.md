# xfi-security

Perform a security review of X-Fidelity code changes.

## Instructions

This command uses:
- **Subagent**: Use `xfi-security-expert` for comprehensive security analysis

## Security Focus Areas

### 1. Path Validation

All file paths must be validated against allowed directories:

```typescript
const resolvedPath = path.resolve(inputPath);
const isAllowed = allowedBasePaths.some(basePath => {
    return resolvedPath.startsWith(path.resolve(basePath));
});

if (!isAllowed) {
    throw new Error('Path outside allowed directories');
}
```

### 2. Directory Traversal Prevention

Check for `../` patterns in user-provided paths:
- Never concatenate paths without validation
- Always use `path.resolve()` for path operations
- Validate against allowed directory list

### 3. Secret Handling

- Never hardcode secrets
- Use environment variables for credentials
- Don't log sensitive data

```typescript
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable required');
}
```

### 4. Webhook Security (Server)

For GitHub webhook handlers:
- Verify webhook signatures
- Use timing-safe comparison
- Validate payload structure

```typescript
const crypto = require('crypto');

function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### 5. Error Message Sanitization

Don't leak sensitive paths in error messages:

```typescript
// BAD: Leaks path information
throw new Error(`Failed to load: ${fullPath}`);

// GOOD: Generic message with safe logging
logger.error(`Config load failed`, { path: sanitizePath(fullPath) });
throw new Error('Configuration load failed');
```

## Security Checklist

```
Security Review:
- [ ] All paths use path.resolve()
- [ ] Paths validated against allowed directories
- [ ] Error messages don't leak sensitive paths
- [ ] User input is sanitized before use
- [ ] Secrets loaded from environment variables
- [ ] GitHub webhooks verify signatures
- [ ] File operations check permissions
- [ ] Security violations are logged
```

## Common Vulnerabilities to Check

1. **Path Traversal**: `../` in file paths
2. **Information Disclosure**: Sensitive data in errors
3. **Injection**: Unsanitized input in commands
4. **Insecure Defaults**: Missing validation
5. **Credential Exposure**: Hardcoded secrets

## Key Files to Review

- `.cursor/rules/security-path-validation.mdc` - Path validation patterns
- `packages/x-fidelity-server/` - Server with webhook handlers
- `packages/x-fidelity-core/src/core/configManager.ts` - Config loading
- Any file handling user input

## Output Format

```
## Security Review

### Risk Level: [Critical/High/Medium/Low]

### Vulnerabilities Found

1. **[Type]** - Description
   - **Location**: file:line
   - **Impact**: What could be exploited
   - **Remediation**: Specific fix

### Security Best Practices

[List of good security patterns observed]

### Recommendations

[Specific improvements to implement]
```

## Reference

Read the security-path-validation rule for detailed patterns:
`.cursor/rules/security-path-validation.mdc`
