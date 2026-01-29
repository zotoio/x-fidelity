# Topic: Input Sanitization Patterns

## Fact: InputSanitizer Provides String Validation and Cleaning
### Modified: 2026-01-29
### Priority: H

The `inputSanitizer.ts` module provides general input validation and sanitization with two main functions:

**`sanitizeString()`** - Cleans input by removing control characters:
```typescript
export function sanitizeString(input: string, maxLength: number = SECURITY_CONSTANTS.MAX_INPUT_LENGTH): string {
  if (typeof input !== 'string') {
    throw new SecurityError('INPUT_VALIDATION', 'Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new SecurityError('INPUT_VALIDATION', `Input too long: ${input.length} > ${maxLength}`);
  }
  
  // Remove control characters using CONTROL_CHARS_REGEX: /[\x00-\x1f\x7f]/g
  return input.replace(SECURITY_CONSTANTS.CONTROL_CHARS_REGEX, '');
}
```

**`validateInput()`** - Checks input safety without modification:
- Validates string type
- Checks length against `MAX_INPUT_LENGTH` (10000)
- Optionally blocks dangerous characters: `;|&\`$(){}[]<>'"\\*?`
- Always blocks control characters

### References
1. [inputSanitizer.ts](../../packages/x-fidelity-core/src/security/inputSanitizer.ts)
2. [security/index.ts - SECURITY_CONSTANTS](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: URL Validation Prevents SSRF Attacks
### Modified: 2026-01-29
### Priority: H

The `urlValidator.ts` module provides comprehensive URL validation to prevent Server-Side Request Forgery (SSRF) attacks. Key protections:

1. **Protocol Enforcement**: Only HTTPS allowed
2. **Domain Allowlist**: Only `api.github.com`, `raw.githubusercontent.com`, `github.com`
3. **Private IP Blocking**: Blocks RFC 1918/4193 ranges (10.x, 172.16-31.x, 192.168.x, localhost, IPv6 link-local)
4. **DNS Resolution Validation**: Async validation checks resolved IPs aren't private

```typescript
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (localhost)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^::1$/,                    // IPv6 localhost
  /^fe80:/,                   // IPv6 link-local
  /^fc00:|^fd00:/             // IPv6 unique local
];
```

Use `createSanitizedUrl()` to get a validated, reconstructed URL safe for HTTP requests.

### References
1. [urlValidator.ts](../../packages/x-fidelity-core/src/security/urlValidator.ts)

---

## Fact: Command Validation with SafeGitCommand Class
### Modified: 2026-01-29
### Priority: H

The `commandValidator.ts` module prevents command injection through the immutable `SafeGitCommand` class:

**Allowlist**: Only `clone`, `fetch`, `checkout`, `pull` git commands permitted.

**Argument Validation**:
- Must be string type
- Max length 500 characters
- No dangerous shell metacharacters: `;|&\`$(){}[]<>'"\\*?`
- No path traversal (`..`, `~`)
- No control characters

```typescript
export class SafeGitCommand {
  private readonly command: string;
  private readonly args: readonly string[];  // Immutable

  constructor(command: string, args: readonly string[], options?: { cwd?: string; timeout?: number }) {
    if (!SECURITY_CONSTANTS.ALLOWED_GIT_COMMANDS.includes(command)) {
      throw new CommandInjectionError(command, '', `Unauthorized git command: ${command}`);
    }
    // Validate all args, freeze the array for immutability
    this.args = Object.freeze([...args]);
  }

  async execute(): Promise<{ stdout: string; stderr: string }> {
    // Uses child_process.spawn with validated args only
  }
}
```

### References
1. [commandValidator.ts](../../packages/x-fidelity-core/src/security/commandValidator.ts)
2. [security/index.ts - ALLOWED_GIT_COMMANDS, CommandInjectionError](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: Sensitive Data Masking for Logs and Output
### Modified: 2026-01-29
### Priority: M

The `maskSensitiveData.ts` utility automatically masks sensitive values in objects before logging or display. Detected patterns include:

- Passwords, API keys, auth/access/OAuth/JWT tokens
- SSH keys, private keys, secret keys
- Database passwords, connection strings
- Credentials, session tokens, bearer tokens

**Masking Strategy**:
- Values ≤4 chars: Fully masked with `*`
- Values >16 chars: Keep first 6 and last 6, mask middle with `***`
- Values 8-16 chars: Keep first 3 and last 3, mask middle

```typescript
export function maskSensitiveData(obj: any): any {
  // Recursively processes objects, checking both keys and values
  // against sensitivePatterns regex array
}
```

Always use `maskSensitiveData()` before logging objects that may contain secrets.

### References
1. [maskSensitiveData.ts](../../packages/x-fidelity-core/src/utils/maskSensitiveData.ts)
