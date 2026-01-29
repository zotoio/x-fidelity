---
sidebar_position: 1
---

# Hello Rule

Create your first rule and run it.

## 1. Minimal rule

Save a rule file (e.g., `rules/hello-rule.json`) in your config directory:

```json
{
  "name": "hello-rule",
  "description": "Flags files containing TODO",
  "conditions": {
    "all": [
      {
        "fact": "globalFileAnalysis",
        "operator": "regexMatchWithPosition",
        "value": {
          "pattern": "TODO",
          "flags": "g",
          "resultFact": "todoMatches"
        }
      }
    ]
  },
  "event": {
    "type": "warning",
    "params": {
      "message": "Found TODOs",
      "details": {
        "matches": { "fact": "todoMatches" }
      }
    }
  }
}
```

Uses the Patterns plugin facts/operators `globalFileAnalysis` + `regexMatchWithPosition`.

## 2. Reference in archetype config

Add to your archetype config (e.g., `node-fullstack.json`):

```json
{
  "name": "node-fullstack",
  "plugins": ["xfiPluginPatterns"],
  "rules": ["hello-rule"]
}
```

## 3. Run

```bash
# Use local config path
xfidelity . --localConfigPath /absolute/path/to/config
```

## 4. Tips

- Use `xfiPluginFilesystem` and `xfiPluginAst` for deeper checks
- Add `value.resultFact` to store matches for use in event params
- Validate rule JSON structure against examples in the docs

## 5. Next

- Try the [Rule Builder GUI](https://zotoio.github.io/x-fidelity/rule-builder/) to create rules visually
- Explore the [Rules Cookbook](./rules-cookbook)
- Learn about [Operators](../operators)
