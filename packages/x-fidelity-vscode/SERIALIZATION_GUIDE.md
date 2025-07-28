# Serialization Safety Guide

This guide helps prevent `toJSON` errors and other serialization issues in the X-Fidelity VSCode extension.

## Overview

VSCode extensions frequently need to serialize objects for:
- Webview communication
- Inter-process communication
- State persistence
- Debug logging

However, VSCode objects like `Range`, `Position`, `Uri`, and `Diagnostic` can cause serialization errors if not handled properly.

## Common Serialization Points

### 1. **Webview Communication**
   - Always use `SafeWebview` wrapper
   - Never pass VSCode objects directly

### 2. **IPC Communication**
   - Use `SerializationService` for all IPC messages
   - Define serializable interfaces for all messages

### 3. **Storage**
   - Always serialize before storing in workspace/global state
   - Use type-safe interfaces

## Quick Reference

### ✅ Do This

```typescript
// Use SafeWebview wrapper
import { SafeWebview } from '../utils/safeSerialization';

const safeWebview = new SafeWebview(panel.webview);
await safeWebview.postMessage({
  command: 'updateData',
  data: { message: 'Hello' }
});

// Use SerializationService for complex objects
import { SerializationService } from '../services/serializationService';

const serializer = SerializationService.getInstance();
const result = serializer.serialize(complexObject);
if (result.success) {
  await webview.postMessage(result.data);
}

// Convert VSCode objects to serializable forms
import { toSerializableDiagnostic } from '../types/serialization';

const safeDiagnostic = toSerializableDiagnostic(vscode.diagnostic);
```

### ❌ Don't Do This

```typescript
// Never do direct webview.postMessage with complex objects
webview.postMessage({
  command: 'update',
  data: {
    diagnostics: vscode.diagnostics, // ❌ Contains non-serializable objects
    range: someRange // ❌ VSCode Range object
  }
});

// Never JSON.stringify VSCode objects directly
JSON.stringify(vscode.range); // ❌ May cause toJSON errors

// Never store VSCode objects directly
context.workspaceState.update('data', {
  uri: vscode.Uri.file('/path'), // ❌ Uri is not serializable
  position: new vscode.Position(0, 0) // ❌ Position is not serializable
});
```

## Available Tools

### 1. SafeWebview

Type-safe webview wrapper that prevents serialization errors:

```typescript
import { SafeWebview } from '../utils/safeSerialization';

const safeWebview = new SafeWebview(panel.webview);

// Type-safe message sending
await safeWebview.postMessage({
  command: 'showData',
  data: { items: ['a', 'b', 'c'] } // Only serializable data allowed
});

// Built-in error handling
await safeWebview.postError(new Error('Something went wrong'));
```

### 2. SerializationService

Centralized service for complex serialization:

```typescript
import { SerializationService } from '../services/serializationService';

const serializer = SerializationService.getInstance();

// Serialize with options
const result = serializer.serialize(complexObject, {
  stripFunctions: true,
  maxDepth: 5,
  includeMetadata: true
});

if (result.success) {
  console.log('Serialized successfully', result.data);
  console.log('Size:', result.metadata?.byteSize, 'bytes');
} else {
  console.error('Serialization failed:', result.error);
}

// Debug serialization issues
serializer.debugSerialization(problematicObject, 'MyObject');
```

### 3. Decorators

Automatic serialization with decorators:

```typescript
import { Serializable, NonSerializable, SerializeReturn } from '../utils/serializationDecorators';

@Serializable
class MyClass {
  @NonSerializable
  private vscodeObject: vscode.Range;
  
  public data: string;
  
  @SerializeReturn
  async getData() {
    return { data: this.data, range: this.vscodeObject };
  }
}
```

### 4. Type-Safe Interfaces

Use predefined serializable interfaces:

```typescript
import { 
  SerializableDiagnostic, 
  SerializableRange,
  toSerializableDiagnostic 
} from '../types/serialization';

// Convert VSCode objects to safe types
function processDiagnostics(diagnostics: vscode.Diagnostic[]): SerializableDiagnostic[] {
  return diagnostics.map(toSerializableDiagnostic);
}
```

## Development Checklist

When working with objects that might be serialized:

- [ ] Are you passing data to a webview? Use `SafeWebview`
- [ ] Are you storing VSCode objects? Convert them first
- [ ] Are you using `JSON.stringify`? Consider `SerializationService`
- [ ] Did you add a new message type? Create a serializable interface
- [ ] Are you handling circular references? Use appropriate tools
- [ ] Did you test serialization in both development and production?

## Common Pitfalls

### 1. **VSCode Objects**
These objects cause `toJSON` errors:
- `vscode.Range`
- `vscode.Position` 
- `vscode.Uri`
- `vscode.Diagnostic`
- `vscode.Location`
- `vscode.TextDocument`
- `vscode.WorkspaceFolder`

**Solution**: Convert to serializable interfaces using helper functions.

### 2. **Circular References**
Objects that reference themselves or create cycles:

```typescript
const obj = { name: 'test' };
obj.self = obj; // ❌ Circular reference
```

**Solution**: Use `SerializationService` which handles circular references automatically.

### 3. **Functions**
Functions cannot be serialized:

```typescript
const obj = {
  data: 'test',
  callback: () => {} // ❌ Function property
};
```

**Solution**: Use `@NonSerializable` decorator or strip functions with `SerializationService`.

### 4. **Native Objects**
Map, Set, Buffer, etc. need special handling:

```typescript
const data = {
  items: new Map([['a', 1], ['b', 2]]), // ❌ Map is not serializable
  cache: new Set([1, 2, 3]) // ❌ Set is not serializable
};
```

**Solution**: Convert to plain objects/arrays or use `SerializationService`.

## Testing Serialization

### Unit Tests

```typescript
describe('Serialization', () => {
  let serializer: SerializationService;
  
  beforeEach(() => {
    serializer = SerializationService.getInstance();
  });
  
  it('should serialize VSCode objects safely', () => {
    const range = new vscode.Range(0, 0, 1, 10);
    const result = serializer.serialize(range);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 1, character: 10 }
    });
  });
  
  it('should handle circular references', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;
    
    const result = serializer.serialize(obj);
    expect(result.success).toBe(true);
    expect(result.data.self).toBe('[Circular Reference]');
  });
});
```

### Integration Tests

```typescript
it('should send webview messages safely', async () => {
  const panel = vscode.window.createWebviewPanel(/*...*/);
  const safeWebview = new SafeWebview(panel.webview);
  
  // This should not throw
  await safeWebview.postMessage({
    command: 'test',
    data: { diagnostic: toSerializableDiagnostic(someDiagnostic) }
  });
});
```

## Debugging Serialization Issues

### 1. Enable Debug Mode

```typescript
// In development
if (process.env.NODE_ENV !== 'production') {
  enableSerializationDebugging();
}
```

### 2. Use SerializationService Debug Tools

```typescript
const serializer = SerializationService.getInstance();

// Get detailed stats
const stats = serializer.getSerializationStats(problematicObject);
console.log('Can serialize:', stats.canSerialize);
console.log('Problematic paths:', stats.problematicPaths);

// Debug with labels
serializer.debugSerialization(obj, 'BeforeWebviewSend');
```

### 3. Check Pre-commit Hook

Run the serialization safety check manually:

```bash
./scripts/check-serialization.sh
```

## Configuration

### ESLint Rules

The following ESLint rules help catch serialization issues:

- `no-unsafe-webview-postmessage`: Prevents direct `webview.postMessage` calls
- `no-direct-json-stringify-vscode`: Warns about `JSON.stringify` on VSCode objects

### Pre-commit Hooks

Automatic checks run before each commit to catch:
- Unsafe `webview.postMessage` calls
- Direct `JSON.stringify` on VSCode objects
- Missing serialization imports
- Circular reference patterns

## Performance Considerations

### 1. **Size Limits**
- Keep serialized objects under 1MB for webviews
- Use pagination for large datasets

### 2. **Frequency**
- Debounce frequent updates
- Use diff-based updates when possible

### 3. **Caching**
- Cache serialization results for frequently used objects
- Use `SerializationService.createSafeCopy()` for immutable copies

## Migration Guide

### Updating Existing Code

1. **Replace direct webview.postMessage**:
   ```typescript
   // Before
   webview.postMessage(data);
   
   // After
   const safeWebview = new SafeWebview(webview);
   await safeWebview.postMessage({ command: 'update', data });
   ```

2. **Replace JSON.stringify**:
   ```typescript
   // Before
   JSON.stringify(vscodeObject);
   
   // After
   const serializer = SerializationService.getInstance();
   const result = serializer.serialize(vscodeObject);
   ```

3. **Add type safety**:
   ```typescript
   // Before
   interface Message {
     data: any;
   }
   
   // After
   interface Message {
     data: SerializableValue;
   }
   ```

## Getting Help

- **Linting errors**: Check ESLint output for specific guidance
- **Pre-commit failures**: Run `./scripts/check-serialization.sh` for details
- **Runtime errors**: Use `SerializationService.debugSerialization()`
- **Type errors**: Ensure you're using serializable interfaces

## Additional Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [JSON.stringify MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types) 