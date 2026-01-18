---
sidebar_position: 3
---

# Rule Builder GUI

The X-Fidelity Rule Builder is an interactive web-based tool for creating and editing analysis rules without writing JSON by hand. It provides a visual interface that makes rule creation more intuitive and less error-prone.

## Launch the Rule Builder

**[Open Rule Builder](/x-fidelity/rule-builder/)**

## Features

### Visual Tree Editor

Navigate your rule structure using an intuitive tree view. Click on any node (conditions, events, operators) to select and edit it. The tree provides a clear hierarchical view of your rule's structure.

### Form-Based Editing

Edit selected nodes using a form interface with proper field validation. The form adapts to the type of node you're editing:
- **Conditions**: Configure facts, operators, and values
- **Events**: Set event types and message parameters
- **Rule metadata**: Edit name, description, and plugins

### Live JSON Preview

The right panel shows a live JSON preview that updates as you make changes. The JSON view is:
- **Synchronized**: Changes in the form immediately update the JSON
- **Bidirectional**: You can also edit the JSON directly
- **Validated**: Schema validation highlights any errors

### Template Library

Start from pre-built templates for common rule patterns:
- Dependency version checks
- Code pattern detection
- File structure validation
- Security checks

Click the **Templates** button in the header to browse available templates.

### Rule Simulation

Test your rules against sample code before deploying them. The simulation panel at the bottom allows you to:
- Load fixture files from the demo configuration
- Run your rule against the loaded fixtures
- View detailed results showing which conditions matched

## Getting Started

### 1. Start with a Template

1. Click the **Templates** button in the header
2. Browse categories: Security, Dependencies, Patterns, etc.
3. Click a template to load it
4. The rule will appear in the editor ready for customization

### 2. Customize Your Rule

Use the form editor to modify the rule:

1. **Edit rule metadata** (top of form)
   - Name: Unique identifier with `-global` or `-iterative` suffix
   - Description: Human-readable explanation
   - Plugins: Required plugins for facts/operators used

2. **Modify conditions** (click in tree to select)
   - Fact: The data source to evaluate
   - Operator: The comparison function
   - Value: The expected value or pattern

3. **Configure event** (select event node in tree)
   - Type: `warning` or `fatality`
   - Message: Description shown when rule triggers
   - Details: Additional context data

### 3. Test with Simulation

1. Expand the **Simulation Panel** at the bottom
2. Select a fixture from the dropdown
3. Click **Run Simulation**
4. Review results showing matched conditions and events

### 4. Export Your Rule

When satisfied with your rule:

1. Click the **Copy** button above the JSON preview
2. The rule JSON is copied to your clipboard
3. Save it to your rules directory (e.g., `rules/my-rule.json`)
4. Reference the rule in your archetype configuration

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+C` / `Cmd+C` | Copy selected |
| `Escape` | Deselect current node |

## Theme Support

The Rule Builder supports both light and dark modes:
- Click the sun/moon icon in the header to toggle
- Theme preference syncs with your Docusaurus docs preference
- Uses consistent X-Fidelity colors across both modes

## Tips and Best Practices

### Naming Conventions

- Use **kebab-case** for rule names: `detect-api-keys-iterative`
- Always include the scope suffix:
  - `-global` for repository-wide checks (run once)
  - `-iterative` for per-file checks (run on each matching file)

### Condition Structure

- Use `all` for conditions that must **all** be true (AND logic)
- Use `any` for conditions where **at least one** must be true (OR logic)
- Nest condition groups for complex logic

### Common Patterns

#### Check for a Pattern in Code

```json
{
  "fact": "globalFileAnalysis",
  "operator": "regexMatchWithPosition",
  "value": {
    "pattern": "console\\.log\\(",
    "flags": "g",
    "resultFact": "consoleLogMatches"
  }
}
```

#### Validate Dependency Version

```json
{
  "fact": "repoDependencyFacts",
  "operator": "outdatedFramework",
  "value": {
    "package": "react",
    "minVersion": "18.0.0"
  }
}
```

#### Check AST Complexity

```json
{
  "fact": "functionComplexity",
  "operator": "astComplexity",
  "value": {
    "threshold": 10
  }
}
```

## Next Steps

- Learn about all available [Operators](/docs/operators)
- Explore [Facts](/docs/facts) for data collection
- Read the [Rules Cookbook](./rules-cookbook) for more examples
- Create your first rule with [Hello Rule](./hello-rule)
