---
sidebar_position: 2
---

# Rules Cookbook

Practical rule snippets you can copy‑paste and adapt.

## Regex policy (ban pattern)

```json
{
  "name": "ban-console-log",
  "conditions": {
    "all": [{
      "fact": "globalFileAnalysis",
      "operator": "regexMatch",
      "value": { "pattern": "console\\.log\\(", "flags": "g" }
    }]
  },
  "event": { "type": "warning", "params": { "message": "console.log is not allowed" } }
}
```

## Required files

```json
{
  "name": "must-have-readme",
  "plugins": ["xfiPluginRequiredFiles"],
  "conditions": {
    "all": [{
      "fact": "missingRequiredFiles",
      "operator": "missingRequiredFiles",
      "value": ["README.md"]
    }]
  },
  "event": { "type": "error", "params": { "message": "README.md is missing" } }
}
```

## Complexity threshold

```json
{
  "name": "function-complexity",
  "plugins": ["xfiPluginAst"],
  "conditions": {
    "all": [{
      "fact": "functionComplexity",
      "operator": "astComplexity",
      "value": { "threshold": 12 }
    }]
  },
  "event": { "type": "warning", "params": { "message": "Function too complex" } }
}
```

## Dependency version floor

```json
{
  "name": "react-version-min",
  "plugins": ["xfiPluginDependency"],
  "conditions": {
    "all": [{
      "fact": "repoDependencyFacts",
      "operator": "outdatedFramework",
      "value": { "package": "react", "minVersion": "18.0.0" }
    }]
  },
  "event": { "type": "warning", "params": { "message": "React is below v18" } }
}
```
