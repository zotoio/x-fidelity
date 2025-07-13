---
sidebar_position: 3
---

# Plugin Examples

This guide provides real-world examples of x-fidelity plugins.

## Remote String Validator Plugin

The Remote String Validator plugin demonstrates how to integrate with external APIs:

```javascript
const plugin = {
    name: 'xfiPluginRemoteStringValidator',
    version: '1.0.0',
    facts: [{
        name: 'remoteSubstringValidation',
        fn: async (params) => {
            // Extract strings using regex pattern
            const matches = extractMatches(params.pattern);
            // Validate each match against remote API
            return validateMatches(matches, params.validationParams);
        }
    }],
    operators: [{
        name: 'invalidRemoteValidation',
        fn: (factValue, params) => {
            // Return true if validation failed (indicating rule failure)
            return !factValue.isValid;
        }
    }]
};
```

Example usage in a rule:
```json
{
    "fact": "remoteSubstringValidation",
    "params": {
        "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
        "validationParams": {
            "url": "http://validator.example.com/check",
            "method": "POST",
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "value": "#MATCH#"
            },
            "checkJsonPath": "$.valid"
        },
        "resultFact": "validationResult"
    },
    "operator": "invalidRemoteValidation",
    "value": true
}
```

## Simple Example Plugin

The Simple Example plugin demonstrates basic plugin structure:

```javascript
const plugin = {
    name: 'xfiPluginSimpleExample',
    version: '1.0.0',
    facts: [{
        name: 'customFact',
        fn: async () => ({ result: 'custom fact data' })
    }],
    operators: [{
        name: 'customOperator',
        fn: (factValue, expectedValue) => factValue === expectedValue
    }]
};
```

Example usage:
```json
{
    "name": "custom-plugin-rule",
    "conditions": {
        "all": [
            {
                "fact": "customFact",
                "operator": "customOperator",
                "value": "custom fact data"
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Custom rule triggered"
        }
    }
}
```

## Error Demo Plugin

Shows error handling implementation:

```javascript
const plugin = {
    name: 'xfiPluginErrorDemo',
    version: '1.0.0',
    facts: [{
        name: 'errorFact',
        fn: async () => {
            throw new Error('Simulated error');
        }
    }],
    onError: (error) => ({
        message: `Error demo: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};
```

## Testing Examples

### Fact Testing

```javascript
describe('remoteSubstringValidation', () => {
    it('should validate extracted strings', async () => {
        const params = {
            pattern: 'test-(\\d+)',
            validationParams: {
                url: 'http://api.example.com/validate'
            }
        };
        
        const result = await plugin.facts[0].fn(params);
        expect(result.isValid).toBe(true);
    });
});
```

### Operator Testing

```javascript
describe('invalidRemoteValidation', () => {
    it('should handle validation results', () => {
        const factValue = { isValid: false };
        const result = plugin.operators[0].fn(factValue);
        expect(result).toBe(true);
    });
});
```

### Error Handler Testing

```javascript
describe('error handling', () => {
    it('should format errors correctly', () => {
        const error = new Error('Test error');
        const result = plugin.onError(error);
        expect(result.level).toBe('warning');
        expect(result.message).toContain('Test error');
    });
});
```

## Best Practices

1. **Error Handling**:
   - Implement comprehensive error handling
   - Use appropriate error levels
   - Include useful error details

2. **Testing**:
   - Write unit tests for facts and operators
   - Test error handling
   - Include integration tests

3. **Documentation**:
   - Document plugin features
   - Include usage examples
   - Explain configuration options

4. **Security**:
   - Validate inputs
   - Handle sensitive data carefully
   - Follow security best practices

## Next Steps

- Learn about [Plugin Best Practices](best-practices)
- Create your own plugin
- Contribute to existing plugins
