# X-Fidelity Security Guidelines

This document outlines the security measures implemented in X-Fidelity and provides guidelines for maintaining security best practices.

## ✅ Security Fixes Implemented

### SSRF (Server-Side Request Forgery) Protection

**Fixed Issues:**
- CodeQL Issues #119-122: SSRF vulnerabilities in `packages/x-fidelity-core/src/utils/axiosClient.ts`

**Implemented Solutions:**
1. **Centralized URL Sanitization**: Created `createSanitizedUrl()` function that validates and reconstructs URLs from trusted components
2. **Domain Allowlist**: Only allows requests to `api.github.com`, `raw.githubusercontent.com`, and `github.com`
3. **Protocol Enforcement**: Requires HTTPS for all external requests
4. **Private IP Blocking**: Prevents requests to private IP ranges (10.x, 192.168.x, 127.x, etc.)
5. **DNS Resolution Validation**: Checks that domains resolve to safe IP addresses
6. **Input Validation**: Validates URL length and format

### Command Injection Protection

**Fixed Issues:**
- CodeQL Issues #123-124: Command injection vulnerabilities in `packages/x-fidelity-server/src/routes/githubWebhookPullRequestCheckRoute.ts`

**Implemented Solutions:**
1. **SafeGitCommand Class**: Immutable command execution with validated arguments
2. **Command Allowlist**: Only permits `clone`, `fetch`, and `checkout` git commands
3. **Argument Sanitization**: Validates all command arguments for dangerous characters
4. **Path Traversal Prevention**: Blocks `..` and `~` in command arguments
5. **Length Limits**: Enforces maximum argument length (500 characters)

## 🏗️ Security Architecture

### Security Module Structure

```
packages/x-fidelity-core/src/security/
├── index.ts                    # Central security exports and constants
├── urlValidator.ts             # SSRF protection utilities
├── commandValidator.ts         # Command injection prevention
├── pathValidator.ts            # Path traversal protection
├── inputSanitizer.ts          # General input validation
└── __tests__/
    └── security.integration.test.ts  # Comprehensive security tests
```

### Key Security Components

1. **SecurityLogger**: Audit logging for all security events
2. **SecurityError Classes**: Typed security exceptions (`SSRFError`, `CommandInjectionError`, `PathTraversalError`)
3. **Security Constants**: Centralized configuration for allowed domains, commands, etc.
4. **Input Validation**: Comprehensive validation utilities

## 🔒 Security Best Practices

### For Developers

1. **URL Handling**
   ```typescript
   // ✅ Good: Use sanitized URLs
   import { createSanitizedUrl } from '@x-fidelity/core/security';
   const safeUrl = createSanitizedUrl(userProvidedUrl);
   
   // ❌ Bad: Direct user input
   const response = await axios.get(userProvidedUrl);
   ```

2. **Command Execution**
   ```typescript
   // ✅ Good: Use SafeGitCommand
   import { SafeGitCommand } from '@x-fidelity/core/security';
   const cmd = new SafeGitCommand('clone', ['--depth=1', repoUrl, localPath]);
   await cmd.execute();
   
   // ❌ Bad: Direct command construction
   const result = execSync(`git clone ${userInput}`);
   ```

3. **Input Validation**
   ```typescript
   // ✅ Good: Validate inputs
   import { validateInput, sanitizeString } from '@x-fidelity/core/security';
   if (!validateInput(userInput)) {
     throw new Error('Invalid input');
   }
   
   // ❌ Bad: Trust user input
   const query = `SELECT * FROM users WHERE name = '${userInput}'`;
   ```

### Code Review Checklist

- [ ] All external URLs are validated using `createSanitizedUrl()`
- [ ] Command execution uses `SafeGitCommand` or equivalent validation
- [ ] User inputs are validated and sanitized
- [ ] No hardcoded secrets or sensitive data
- [ ] Error messages don't leak sensitive information
- [ ] Path operations use `validateDirectoryPath()`

## 🧪 Security Testing

### Running Security Tests

```bash
# Run comprehensive security tests
cd packages/x-fidelity-core
yarn test src/security/__tests__/security.integration.test.ts

# Run full test suite to verify no regressions
cd ../../
yarn test
```

### Test Coverage

Our security tests cover:
- ✅ SSRF attack vectors (private IPs, unauthorized domains, protocol bypasses)
- ✅ Command injection attempts (shell metacharacters, path traversal)
- ✅ Input validation edge cases
- ✅ Error handling and logging
- ✅ Real-world attack scenarios

## 🚨 Incident Response

### If Security Issues Are Detected

1. **Immediate Response**
   - Stop the affected service if actively exploited
   - Assess scope and impact
   - Document the issue

2. **Investigation**
   - Review security logs for similar patterns
   - Check for data exposure or system compromise
   - Identify root cause

3. **Remediation**
   - Apply security fixes following this document's patterns
   - Update tests to prevent regression
   - Deploy fixes urgently

4. **Post-Incident**
   - Update security guidelines
   - Enhance monitoring and detection
   - Conduct security review

## 📋 Security Monitoring

### Audit Logging

All security events are logged with structured data:
```typescript
{
  security: true,
  action: 'URL_VALIDATION',
  result: 'denied',
  resource: 'https://evil.com',
  reason: 'Domain not in allowlist',
  timestamp: '2025-01-01T00:00:00.000Z'
}
```

### Key Metrics to Monitor

- Failed URL validations
- Blocked command execution attempts
- Unusual request patterns
- Error rates in security components

## 🔄 Security Updates

### Adding New Domains

To add allowed domains:
1. Update `ALLOWED_DOMAINS` in `packages/x-fidelity-core/src/security/urlValidator.ts`
2. Add corresponding tests
3. Document business justification
4. Get security team approval

### Adding New Commands

To add allowed git commands:
1. Update `ALLOWED_GIT_COMMANDS` in `packages/x-fidelity-core/src/security/index.ts`
2. Implement validation in `SafeGitCommand`
3. Add comprehensive tests
4. Security review required

## 📚 Additional Resources

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Command Injection Prevention](https://owasp.org/www-community/attacks/Command_Injection)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🤝 Contributing Security Improvements

When contributing security enhancements:
1. Follow the established patterns in this document
2. Add comprehensive tests for all scenarios
3. Update documentation
4. Request security team review
5. Consider backward compatibility

---

**Security Contact**: Report security issues to the development team with "SECURITY:" prefix in the issue title.

**Last Updated**: January 2025
