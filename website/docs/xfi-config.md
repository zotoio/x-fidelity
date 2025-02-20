---
sidebar_position: 13
---

# Repository Configuration

The `.xfi-config.json` file allows you to configure x-fidelity behavior specific to your repository.

## Overview

The `.xfi-config.json` file provides repository-specific configurations that override or supplement global settings. This is particularly useful for:
- Excluding false positives
- Customizing behavior for specific repositories
- Managing repository-specific exceptions

## Configuration File

Place `.xfi-config.json` in your repository's root directory:

```json
{
  "sensitiveFileFalsePositives": [
    "path/to/exclude/file1.js",
    "path/to/exclude/file2.ts"
  ]
}
```

## Configuration Options

### sensitiveFileFalsePositives

An array of file paths that should be excluded from sensitive data checks:

```json
{
  "sensitiveFileFalsePositives": [
    "src/config/defaults.ts",
    "test/fixtures/mockData.js"
  ]
}
```

- Paths should be relative to repository root
- Supports glob patterns
- Case-sensitive matching

## Usage Examples

### Excluding Test Files

```json
{
  "sensitiveFileFalsePositives": [
    "test/**/*.mock.ts",
    "test/fixtures/*.json"
  ]
}
```

### Excluding Configuration Files

```json
{
  "sensitiveFileFalsePositives": [
    "config/*.example.js",
    "src/defaults.ts"
  ]
}
```

## Best Practices

1. **Version Control**:
   - Include `.xfi-config.json` in version control
   - Document changes in commit messages
   - Review changes during code review

2. **Documentation**:
   - Comment excluded files
   - Explain exclusion reasons
   - Keep documentation up-to-date

3. **Regular Review**:
   - Periodically review exclusions
   - Remove unnecessary exclusions
   - Update as codebase changes

4. **Minimal Use**:
   - Use sparingly
   - Fix issues when possible
   - Don't use to bypass security checks

5. **Team Communication**:
   - Discuss exclusions with team
   - Document decisions
   - Consider alternatives

## Validation

x-fidelity validates `.xfi-config.json` using JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "sensitiveFileFalsePositives": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "additionalProperties": false
}
```

## Error Handling

If `.xfi-config.json` is invalid:
1. Error message displayed
2. Default configuration used
3. Analysis continues

## Next Steps

- Configure [Local Rules](local-config)
- Set up [Remote Configuration](remote-config)
- Learn about [Exemptions](exemptions)
