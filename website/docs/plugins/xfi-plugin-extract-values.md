---
sidebar_position: 12
title: Extract Values Plugin (xfiPluginExtractValues)
---

### Overview

The Extract Values plugin (`xfiPluginExtractValues`) provides a flexible way to extract values from files and expose them as runtime facts for other rules to validate. It supports multiple strategies per file extension and a robust fallback to regex. Extraction never throws; failures are captured in the result so rules/events can reference them.

### Strategies

- jsonpath for `.json`
- yaml-jsonpath for `.yaml`/`.yml` (parse YAML to JSON, then JSONPath)
- xpath for `.xml`
- ast-jsonpath / ast-query (reusing the `ast` fact from `xfiPluginAst` when present)
- regex fallback for any filetype

### Security

- No arbitrary filesystem access; only works on `fileData` provided by the engine.
- XML DOCTYPE is blocked (prevents XXE).
- Caps for content size, match count, and regex length.
- Logging avoids sensitive content (summaries only).

### Fact: extractValues

Invoked per file to perform extraction and optionally store the result as a runtime fact for later use in rule events.

Params schema (simplified):

```json
{
  "resultFact": "myExtractedValues",
  "strategies": {
    ".json": { "type": "jsonpath", "paths": ["$.version"] },
    ".yml":  { "type": "yaml-jsonpath", "paths": ["$.services[*].image"] },
    ".xml":  { "type": "xpath", "expressions": ["//service/@id"] },
    ".ts":   { "type": "ast-jsonpath", "paths": ["$.tree.rootNode.childCount"] }
  },
  "defaultStrategy": { "type": "regex", "pattern": "API_KEY=(.*)", "flags": "i" },
  "include": [".*"],
  "exclude": [".*/dist/.*"],
  "limits": { "maxContentBytes": 1048576, "maxMatches": 100, "maxPatternLength": 1024 },
  "dedupe": true,
  "captureContext": true
}
```

Result fact shape:

```ts
type ExtractValuesResult = {
  strategyUsed: 'jsonpath' | 'yaml-jsonpath' | 'xpath' | 'regex' | 'ast-jsonpath' | 'ast-query';
  matches: Array<{ value: any; location?: { filePath: string; line?: number; column?: number }; meta?: any }>;
  errors: Array<{ code: string; message: string; details?: any }>;
  stats: { totalMatches: number; truncated?: boolean; durationMs: number };
  file: { path: string; ext: string; size?: number };
}
```

### Operator: matchesSatisfy

Use this operator to evaluate the `extractValues` results with param-driven conditions (contains, counts, every/some, strategy checks, composition via all/any/none).

Common params:

```json
{
  "requireMatches": true,
  "requireNoErrors": true,
  "count": { "op": ">=", "value": 1 },
  "contains": { "value": "x", "mode": "any" },
  "countWhere": { "path": "name", "equals": "y", "op": ">", "value": 1 },
  "every": { "path": "id", "predicate": "isNumber" },
  "strategyIs": "regex"
}
```

Composability:

```json
{
  "all": [
    { "requireNoErrors": true },
    { "count": { "op": ">=", "value": 3 } },
    { "contains": { "regex": "^svc-", "flags": "i", "mode": "any" } }
  ]
}
```

### Example Rules

JSON (extract version):

```json
{
  "name": "json-extract-version-iterative",
  "conditions": {
    "all": [
      {
        "fact": "extractValues",
        "params": {
          "resultFact": "pkgVersion",
          "strategies": { ".json": { "type": "jsonpath", "paths": ["$.version"] } }
        },
        "operator": "matchesSatisfy",
        "value": { "requireMatches": true, "count": { "op": "==", "value": 1 }, "every": { "predicate": "isString" } }
      }
    ]
  },
  "event": {
    "type": "info",
    "params": { "message": "Extracted package version", "details": { "fact": "pkgVersion" } }
  }
}
```

YAML (extract service images):

```json
{
  "name": "yaml-extract-images-iterative",
  "conditions": {
    "all": [
      {
        "fact": "extractValues",
        "params": {
          "resultFact": "composeImages",
          "strategies": { ".yml": { "type": "yaml-jsonpath", "paths": ["$.services[*].image"] } }
        },
        "operator": "matchesSatisfy",
        "value": { "requireMatches": true, "count": { "op": ">=", "value": 1 } }
      }
    ]
  },
  "event": {
    "type": "info",
    "params": { "message": "Extracted docker images", "details": { "fact": "composeImages" } }
  }
}
```

XML (extract attribute ids):

```json
{
  "name": "xml-extract-ids-iterative",
  "conditions": {
    "all": [
      {
        "fact": "extractValues",
        "params": {
          "resultFact": "xmlServiceIds",
          "strategies": { ".xml": { "type": "xpath", "expressions": ["//service/@id"] } }
        },
        "operator": "matchesSatisfy",
        "value": { "requireMatches": true, "count": { "op": ">=", "value": 1 } }
      }
    ]
  },
  "event": {
    "type": "info",
    "params": { "message": "Extracted IDs", "details": { "fact": "xmlServiceIds" } }
  }
}
```

Regex fallback (env key):

```json
{
  "name": "regex-env-api-key-iterative",
  "conditions": {
    "all": [
      {
        "fact": "extractValues",
        "params": {
          "resultFact": "envApiKey",
          "defaultStrategy": { "type": "regex", "pattern": "^API_KEY=(.*)$", "flags": "im" },
          "captureContext": true
        },
        "operator": "matchesSatisfy",
        "value": { "requireMatches": true, "count": { "op": ">=", "value": 1 } }
      }
    ]
  },
  "event": {
    "type": "warning",
    "params": { "message": "API key detected", "details": { "fact": "envApiKey" } }
  }
}
```

AST (import modules):

```json
{
  "name": "ast-extract-imports-iterative",
  "conditions": {
    "all": [
      {
        "fact": "extractValues",
        "params": {
          "resultFact": "moduleImports",
          "strategies": { ".ts": { "type": "ast-jsonpath", "paths": ["$.tree.rootNode.type"] } }
        },
        "operator": "matchesSatisfy",
        "value": { "requireNoErrors": true, "count": { "op": ">=", "value": 1 } }
      }
    ]
  },
  "event": {
    "type": "info",
    "params": { "message": "Extracted AST info", "details": { "fact": "moduleImports" } }
  }
}
```

### Tips

- Prefer JSONPath/YAML JSONPath/XPath for structured data.
- Use `limits.maxMatches` to prevent excessive result sizes.
- Include the `resultFact` in event `details` to surface extraction results and errors in findings.
- For AST strategies, ensure `xfiPluginAst` is enabled so the `ast` fact is available.


