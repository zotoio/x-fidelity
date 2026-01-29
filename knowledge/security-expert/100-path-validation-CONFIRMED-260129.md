# Topic: Path Validation Patterns

## Fact: PathValidator Prevents Directory Traversal Attacks
### Modified: 2026-01-29
### Priority: H

The `pathValidator.ts` module provides secure path validation to prevent directory traversal attacks. The core function `validateDirectoryPath()` performs two critical checks:

1. **Allowed Prefix Validation**: Paths must start with an allowed prefix from `MUTABLE_SECURITY_CONFIG.ALLOWED_PATH_PREFIXES`
2. **Traversal Pattern Detection**: Paths containing `..` or null bytes (`\0`) are rejected

```typescript
export function validateDirectoryPath(dirPath: string): boolean {
  const resolvedPath = path.resolve(dirPath);
  
  // Must be within allowed prefixes
  const isAllowed = MUTABLE_SECURITY_CONFIG.ALLOWED_PATH_PREFIXES.some(prefix => 
    resolvedPath.startsWith(path.resolve(prefix))
  );
  
  // Check for path traversal attempts
  if (dirPath.includes('..') || dirPath.includes('\0')) {
    securityLogger.auditAccess(dirPath, 'PATH_VALIDATION', 'denied', {
      reason: 'Path traversal attempt detected'
    });
    return false;
  }
  
  return isAllowed;
}
```

All validation results are logged via `securityLogger.auditAccess()` for security auditing.

### References
1. [pathValidator.ts](../../packages/x-fidelity-core/src/security/pathValidator.ts)
2. [security/index.ts - MUTABLE_SECURITY_CONFIG](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: Secure Path Creation with createSecurePath
### Modified: 2026-01-29
### Priority: H

The `createSecurePath()` function combines base path resolution with validation, providing a safe way to construct paths from user input. It:

1. Uses `path.resolve()` to normalize the path (never string concatenation)
2. Validates the resolved path against security constraints
3. Throws `PathTraversalError` if validation fails

```typescript
export function createSecurePath(basePath: string, userPath: string): string {
  const resolvedPath = path.resolve(basePath, userPath);
  
  if (!validateDirectoryPath(resolvedPath)) {
    throw new PathTraversalError(userPath, 'Path validation failed');
  }
  
  return resolvedPath;
}
```

**Usage Pattern**: Always use `createSecurePath()` when constructing paths from untrusted input rather than manual concatenation.

### References
1. [pathValidator.ts](../../packages/x-fidelity-core/src/security/pathValidator.ts)
2. [security/index.ts - PathTraversalError](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: Dynamic Path Prefix Configuration
### Modified: 2026-01-29
### Priority: M

The security module supports runtime updates to allowed path prefixes via `updateAllowedPaths()`. This enables:

- Test-specific path allowances for Jest
- Dynamic workspace root configuration
- Extension of allowed directories at runtime

```typescript
export const MUTABLE_SECURITY_CONFIG = {
  ALLOWED_PATH_PREFIXES: ['/tmp/', process.cwd()],
};

export function updateAllowedPaths(newPaths: string[]): void {
  MUTABLE_SECURITY_CONFIG.ALLOWED_PATH_PREFIXES = [...newPaths];
}
```

Default allowed paths include `/tmp/` and the current working directory. Additional paths like workspace roots and package directories should be added during initialization.

### References
1. [security/index.ts](../../packages/x-fidelity-core/src/security/index.ts)

---

## Fact: Security Error Types for Path Validation
### Modified: 2026-01-29
### Priority: M

The security module defines typed error classes for consistent error handling:

- **`SecurityError`**: Base class with security type, message, and details
- **`PathTraversalError`**: Specific to path traversal attempts

All security errors automatically log to `securityLogger.logSecurityViolation()` on construction:

```typescript
export class PathTraversalError extends SecurityError {
  constructor(path: string, reason: string) {
    super('PathTraversal', `Path traversal attempt blocked: ${reason}`, { path });
  }
}
```

This ensures all security violations are audited even if the error is caught and handled silently.

### References
1. [security/index.ts - SecurityError, PathTraversalError](../../packages/x-fidelity-core/src/security/index.ts)
