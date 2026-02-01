---
description: Security patterns and path validation requirements
crux: true
---

# Security and Path Validation

## Critical Security Pattern
The X-Fidelity project implements strict path validation to prevent directory traversal attacks and unauthorized file access.

### Allowed Path Patterns
```typescript
const allowedBasePaths = [
    process.cwd(),
    workspaceRoot,
    path.resolve(workspaceRoot, 'packages'),
    path.resolve(workspaceRoot, 'dist'),
    '/tmp',
    path.resolve(__dirname, '..', '..'),
    // Demo config access
    path.resolve(workspaceRoot, 'packages', 'x-fidelity-democonfig'),
    path.resolve(workspaceRoot, 'packages', 'x-fidelity-democonfig', 'src'),
    // Test allowances
    '/path/to/local/config' // For Jest testing
];
```

### Security Requirements
1. **Always use `path.resolve()`** for robust path handling instead of string manipulation
2. **Validate against allowed directories** before file access
3. **Include workspace root detection** for monorepo environments
4. **Add test-specific allowances** when needed for Jest testing
5. **Implement proper error messages** that don't leak sensitive path information

### Example Implementation
```typescript
const resolvedConfigPath = path.resolve(localConfigPath);
const isPathAllowed = allowedBasePaths.some(basePath => {
    const resolvedBasePath = path.resolve(basePath);
    return resolvedConfigPath.startsWith(resolvedBasePath);
});

if (!isPathAllowed) {
    logger.warn(`Config path outside allowed directories: ${resolvedConfigPath}`);
    throw new Error('Local config path outside allowed directories');
}
```

## File System Security
- Use `fs.existsSync()` and `fs.access()` with proper error handling
- Validate file extensions when appropriate
- Never trust user-provided paths without validation
- Log security violations for monitoring

## GitHub Webhook Security
Located in **[packages/x-fidelity-server](mdc:packages/x-fidelity-server)**, webhook endpoints implement:
- Secret validation for GitHub webhooks
- File download validation for config updates
- Directory creation with proper permissions
