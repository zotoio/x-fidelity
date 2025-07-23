# XFI_RESULT.json Location Format Support

The X-Fidelity VSCode extension provides comprehensive location highlighting for all types of issue data structures found in XFI_RESULT.json files. This document details the supported formats, extraction priorities, and debugging capabilities.

## Overview

The enhanced `DiagnosticLocationExtractor` uses a priority-based approach to extract location information from various data structures in XFI_RESULT.json, ensuring accurate code highlighting for all rule types and analysis results.

## Supported Location Formats

### 1. AST/Function Complexity Location (High Precision)

**Priority:** Highest  
**Confidence:** High  
**Use Case:** Function complexity analysis, AST-based rules

```json
{
  "ruleFailure": "functionComplexity-iterative",
  "details": {
    "details": {
      "complexities": [{
        "metrics": {
          "location": {
            "startLine": 145,
            "endLine": 231,
            "startColumn": 1,
            "endColumn": 2
          }
        }
      }]
    }
  }
}
```

**Result:** Precise multi-line highlighting with exact start/end coordinates.

### 2. Direct Location Objects (High Precision)

**Priority:** High  
**Confidence:** High  
**Use Case:** Rules with explicit location data

```json
{
  "ruleFailure": "enhancedRule",
  "details": {
    "location": {
      "startLine": 100,
      "startColumn": 5,
      "endLine": 105,
      "endColumn": 10
    }
  }
}
```

**Result:** Precise highlighting with exact coordinates.

### 3. Start/End Range Format (High Precision)

**Priority:** High  
**Confidence:** High  
**Use Case:** LSP-style location data

```json
{
  "ruleFailure": "startEndRule",
  "location": {
    "start": { "line": 75, "character": 12 },
    "end": { "line": 78, "character": 20 }
  }
}
```

**Result:** Precise multi-line highlighting using LSP-style coordinates.

### 4. Pattern-Based Details Array (Medium Precision)

**Priority:** Medium  
**Confidence:** Medium  
**Use Case:** Pattern matching rules, sensitive data detection

```json
{
  "ruleFailure": "sensitiveLogging-iterative",
  "details": {
    "details": [{
      "match": "(api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key)",
      "lineNumber": 110,
      "line": "...v.O***-key';",
      "columnNumber": 15
    }]
  }
}
```

**Result:** Line-based highlighting with accurate column positioning when available.

### 5. Enhanced Pattern Matches (Medium Precision)

**Priority:** Medium  
**Confidence:** Medium  
**Use Case:** Pattern rules with improved accuracy

```json
{
  "ruleFailure": "patternRule",
  "details": {
    "details": [{
      "lineNumber": 60,
      "columnNumber": 8,
      "match": "(api[_-]?key)",
      "matchedText": "api_key",
      "line": "const api_key = 'secret';"
    }]
  }
}
```

**Result:** Accurate highlighting using actual matched text length.

### 6. Direct Details LineNumber (Medium Precision)

**Priority:** Medium  
**Confidence:** Medium  
**Use Case:** Simple location-based rules

```json
{
  "ruleFailure": "customRule",
  "details": {
    "lineNumber": 42,
    "columnNumber": 10,
    "message": "Custom rule violation"
  }
}
```

**Result:** Line-based highlighting with column positioning.

### 7. Range Objects (Medium Precision)

**Priority:** Medium  
**Confidence:** Medium  
**Use Case:** AST rules with range data

```json
{
  "ruleFailure": "astRule",
  "details": {
    "range": {
      "start": { "line": 50, "column": 10 },
      "end": { "line": 50, "column": 25 }
    }
  }
}
```

**Result:** Range-based highlighting with start/end coordinates.

### 8. Position Objects (Medium Precision)

**Priority:** Medium  
**Confidence:** Medium  
**Use Case:** LSP-style position data

```json
{
  "ruleFailure": "positionRule",
  "details": {
    "position": {
      "line": 85,
      "character": 20
    }
  }
}
```

**Result:** Position-based highlighting with default range.

### 9. File-Level Rules (File Scope)

**Priority:** Special handling  
**Confidence:** Medium  
**Use Case:** File-wide analysis rules

```json
{
  "ruleFailure": "codeRhythm-iterative",
  "details": {
    "message": "Code structure analysis suggests potential readability issues.",
    "consistency": 0.4,
    "complexity": 0.3,
    "readability": 0.7
  }
}
```

**Result:** Highlights at line 1 with file-level scope indicator.

### 10. Repository-Level Rules (Global Scope)

**Priority:** Special handling  
**Confidence:** Medium  
**Use Case:** Repository-wide issues

```json
{
  "filePath": "REPO_GLOBAL_CHECK",
  "ruleFailure": "outdatedFramework-global",
  "details": {
    "message": "Core framework dependencies do not meet minimum version requirements!"
  }
}
```

**Result:** Virtual file highlighting for repository-wide issues.

## Location Extraction Priority

The location extractor uses the following priority order:

1. **File-level rules** (specific rule patterns)
2. **Complexity metrics** (AST analysis with precise coordinates)
3. **Location objects** (direct location data)
4. **AST nodes** (AST node information)
5. **Details arrays** (pattern-based matches)
6. **Enhanced pattern matches** (improved pattern accuracy)
7. **Matches arrays** (alternative pattern format)
8. **Range objects** (start/end range data)
9. **Position objects** (LSP-style positions)
10. **Details line numbers** (direct line number properties)
11. **Legacy fields** (backward compatibility)

## Confidence Levels

### High Confidence
- Precise location data with start/end coordinates
- AST complexity metrics with exact positioning
- Direct location objects with complete coordinate data

### Medium Confidence
- Good location data with line numbers
- Pattern matches with column information
- Range objects with start/end data

### Low Confidence
- Basic location data or fallback
- Legacy field extraction
- File-level rules without specific positioning

## Enhanced Features

### Smart Range Calculation
The extractor intelligently calculates highlighting ranges based on available data:

- **Actual match length:** Uses `matchedText` or `matchLength` when available
- **Pattern detection:** Distinguishes between regex patterns and actual text
- **Default ranges:** Applies reasonable defaults for optimal visibility

### Metadata Tracking
Each extraction includes debugging metadata:

```typescript
{
  location: LocationInfo,
  found: boolean,
  confidence: 'high' | 'medium' | 'low',
  metadata: {
    extractorUsed: string,
    rawData: any
  }
}
```

### Validation and Sanitization
All location data is validated and sanitized:

- **Coordinate validation:** Ensures non-negative values
- **Range consistency:** Validates start/end relationships
- **Boundary checks:** Prevents out-of-bounds highlighting

## Debugging Location Extraction

### Enable Debug Logging

Add to your VSCode settings:

```json
{
  "x-fidelity.logLevel": "debug",
  "x-fidelity.enableLocationDebugging": true
}
```

### Debug Information Logged

- Which extractor was used for each diagnostic
- Available data structures in the error object
- Location extraction confidence levels
- Suggestions for improving location data

### Using DiagnosticDebugger

```typescript
import { DiagnosticDebugger } from '../utils/diagnosticDebugger';

// Analyze location extraction
DiagnosticDebugger.analyzeLocationExtraction(error, result);

// Validate highlighting accuracy
const validation = await DiagnosticDebugger.validateHighlightingAccuracy(uri, diagnostic);

// Generate comprehensive report
const report = DiagnosticDebugger.generateDiagnosticReport(diagnostics);
```

## Testing Your Location Formats

### Unit Testing

Create tests for your specific location format:

```typescript
describe('Custom Location Format', () => {
  it('should extract location from custom format', () => {
    const error = {
      ruleFailure: 'customRule',
      customLocation: {
        lineNumber: 50,
        columnNumber: 10
      }
    };

    const result = DiagnosticLocationExtractor.extractLocation(error);
    
    expect(result.found).toBe(true);
    expect(result.location.startLine).toBe(50);
    expect(result.location.startColumn).toBe(10);
  });
});
```

### Integration Testing

Validate end-to-end highlighting:

```typescript
// Run analysis and check highlighting
await executeCommandSafely('xfidelity.runAnalysis');
const diagnostics = vscode.languages.getDiagnostics();

// Validate each diagnostic
for (const [uri, diags] of diagnostics) {
  for (const diag of diags.filter(d => d.source === 'X-Fidelity')) {
    const validation = await DiagnosticDebugger.validateHighlightingAccuracy(uri, diag);
    expect(validation.valid).toBe(true);
  }
}
```

## Best Practices for Rule Authors

### 1. Provide Precise Location Data

**Recommended:**
```json
{
  "details": {
    "location": {
      "startLine": 145,
      "startColumn": 1,
      "endLine": 231,
      "endColumn": 2
    }
  }
}
```

**Avoid:**
```json
{
  "details": {
    "message": "Issue somewhere in file"
  }
}
```

### 2. Include Column Information

**Recommended:**
```json
{
  "details": {
    "lineNumber": 42,
    "columnNumber": 10
  }
}
```

**Avoid:**
```json
{
  "details": {
    "lineNumber": 42
  }
}
```

### 3. Use Appropriate Range Sizes

For pattern matches, provide accurate range information:

```json
{
  "details": [{
    "lineNumber": 50,
    "columnNumber": 8,
    "matchLength": 7,  // Actual match length
    "matchedText": "api_key"  // Actual matched text
  }]
}
```

### 4. Consider File-Level vs Line-Level Rules

Design rules appropriately for their scope:

- **File-level rules:** Code rhythm, overall complexity
- **Line-level rules:** Specific violations, pattern matches
- **Multi-line rules:** Function complexity, large code blocks

## Troubleshooting

### Common Issues

#### 1. Highlighting Too Large
**Problem:** Highlighting spans too many characters
**Solution:** Provide more precise `endColumn` or `matchLength`

#### 2. Highlighting at Wrong Location
**Problem:** Highlighting appears at incorrect line/column
**Solution:** Verify 1-based vs 0-based coordinate systems

#### 3. No Highlighting Appears
**Problem:** Diagnostic doesn't highlight code
**Solution:** Check console for extraction failures and follow suggestions

#### 4. Performance Issues
**Problem:** Slow highlighting with many diagnostics
**Solution:** Optimize location data structure and use appropriate confidence levels

### Getting Help

1. **Enable debug logging** to see extraction details
2. **Use DiagnosticDebugger** for comprehensive analysis
3. **Check extraction confidence** levels in logs
4. **Validate highlighting accuracy** with built-in tools
5. **Review suggestions** for improving location data

## Future Enhancements

The location extraction system is designed to be extensible. Future enhancements may include:

- **Machine learning-based location prediction**
- **Context-aware range calculation**
- **Multi-file highlighting support**
- **Interactive highlighting configuration**
- **Real-time location validation**

## Contributing

To contribute new location extractors or improve existing ones:

1. Add extractor method to `DiagnosticLocationExtractor`
2. Update priority order in `extractLocation` method
3. Add comprehensive unit tests
4. Update this documentation
5. Ensure backward compatibility

For questions or contributions, please refer to the main X-Fidelity documentation and contribution guidelines. 