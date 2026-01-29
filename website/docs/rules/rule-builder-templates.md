---
sidebar_position: 4
---

# Creating Rule Builder Templates

This guide explains how to contribute new templates to the Rule Builder. Templates help users get started quickly by providing pre-built rule patterns that demonstrate common use cases and best practices.

## Template Structure

Templates are JSON files with metadata that describe their purpose, categorization, and the actual rule definition.

### Full Template Schema

```json
{
  "id": "unique-template-id",
  "name": "rule-name-iterative",
  "displayName": "Human Readable Name",
  "description": "Brief description shown on template card",
  "plugin": "filesystem",
  "useCase": "quality",
  "complexity": "beginner",
  "tags": ["keyword1", "keyword2"],
  "source": "teaching",
  "learningPoints": [
    "Concept this template teaches",
    "Another learning objective"
  ],
  "rule": {
    // The actual rule definition
  }
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the template (kebab-case) |
| `name` | Yes | Rule name with `-global` or `-iterative` suffix |
| `displayName` | Yes | Human-readable name shown in the UI |
| `description` | Yes | Brief description for template cards |
| `plugin` | Yes | Primary plugin used: `filesystem`, `ast`, `dependency`, `react-patterns` |
| `useCase` | Yes | Category: `security`, `quality`, `migration`, `compliance` |
| `complexity` | Yes | Difficulty level: `beginner`, `intermediate`, `advanced` |
| `tags` | No | Array of searchable keywords |
| `source` | Yes | Origin type: `teaching`, `democonfig`, `community` |
| `learningPoints` | No | Educational objectives (recommended for teaching templates) |
| `rule` | Yes | The complete rule JSON definition |

## Template Categories

### By Plugin

Templates are organized by the primary plugin they demonstrate:

- **Filesystem**: Rules checking file existence, content patterns, and structure
- **AST**: Rules analyzing code structure via abstract syntax trees
- **Dependency**: Rules validating package versions and dependencies
- **React Patterns**: Rules specific to React code quality

### By Use Case

- **Security**: Detecting vulnerabilities, secrets, and unsafe patterns
- **Quality**: Enforcing code standards and best practices
- **Migration**: Tracking migration progress and deprecated patterns
- **Compliance**: Ensuring policy and regulatory compliance

### By Complexity

- **Beginner**: Simple rules with single conditions
- **Intermediate**: Multi-condition rules with `all`/`any` logic
- **Advanced**: Nested conditions, custom operators, and complex parameters

## Adding a Teaching Template

Teaching templates are custom examples designed to educate users about rule creation.

### Step 1: Create the Template File

Create a new TypeScript file in `website/rule-builder/src/lib/templates/teaching/`:

```typescript
// website/rule-builder/src/lib/templates/teaching/myTemplate.ts
import { RuleTemplate } from '../types';

export const myNewTemplate: RuleTemplate = {
  id: 'detect-todo-comments',
  name: 'detect-todo-comments-iterative',
  displayName: 'Detect TODO Comments',
  description: 'Find TODO comments that should be resolved before merging',
  plugin: 'filesystem',
  useCase: 'quality',
  complexity: 'beginner',
  tags: ['todo', 'comments', 'cleanup'],
  source: 'teaching',
  learningPoints: [
    'Using fileContains operator for pattern matching',
    'Understanding iterative vs global rules',
    'Setting appropriate event severity'
  ],
  rule: {
    name: 'detect-todo-comments-iterative',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.fileName',
          operator: 'notEqual',
          value: 'REPO_GLOBAL_CHECK'
        },
        {
          fact: 'fileData',
          path: '$.fileContent',
          operator: 'fileContains',
          value: 'TODO'
        }
      ]
    },
    event: {
      type: 'warning',
      params: {
        message: 'TODO comment found - consider resolving before merge',
        details: {
          fact: 'fileData',
          path: '$.filePath'
        }
      }
    }
  }
};
```

### Step 2: Export from Index

Add your template to `website/rule-builder/src/lib/templates/teaching/index.ts`:

```typescript
export { myNewTemplate } from './myTemplate';
```

### Step 3: Register in Template Library

Update `website/rule-builder/src/lib/templates/index.ts` to include your template:

```typescript
import { myNewTemplate } from './teaching/myTemplate';

export const allTemplates: RuleTemplate[] = [
  // ... existing templates
  myNewTemplate,
];
```

### Step 4: Test Locally

1. Navigate to the Rule Builder directory: `cd website/rule-builder`
2. Install dependencies: `yarn install`
3. Start development server: `yarn dev`
4. Open http://localhost:5173 and verify your template appears

### Step 5: Submit PR

Create a pull request with:
- Clear description of what the template teaches
- Any prerequisites users should understand
- Example use cases where this template applies

## Importing from Democonfig

Rules from `packages/x-fidelity-democonfig` are automatically imported during the build process. To add metadata for these rules:

### Step 1: Add Metadata Entry

Update `website/rule-builder/src/lib/templates/democonfig/index.ts`:

```typescript
export const democonfigMetadata: Record<string, Partial<RuleTemplate>> = {
  'existing-rule-name': {
    displayName: 'Human Readable Name',
    description: 'What this rule does',
    plugin: 'filesystem',
    useCase: 'quality',
    complexity: 'intermediate',
    tags: ['relevant', 'keywords']
  },
  // Add your new entry
  'new-democonfig-rule': {
    displayName: 'New Rule Name',
    description: 'Brief description',
    plugin: 'ast',
    useCase: 'security',
    complexity: 'advanced',
    tags: ['security', 'ast']
  }
};
```

### Step 2: Rebuild Templates

The democonfig rules are bundled during build:

```bash
cd website/rule-builder
yarn build
```

## Best Practices

### Template Quality

1. **Clear naming**: Use descriptive, kebab-case names
2. **Helpful descriptions**: Explain what the rule does and when to use it
3. **Appropriate complexity**: Match the complexity level accurately
4. **Relevant tags**: Include searchable keywords users might look for

### Learning Points

For teaching templates, include meaningful learning objectives:

```typescript
learningPoints: [
  'Using the fileContains operator with regex patterns',
  'Combining multiple conditions with "all" logic',
  'Understanding the difference between warning and fatality events'
]
```

### Rule Quality

1. **Valid JSON**: Ensure the rule is valid JSON that passes schema validation
2. **Tested**: Verify the rule works with the simulation panel
3. **Documented**: Include helpful inline comments if the rule is complex
4. **Maintainable**: Use clear fact names and avoid overly complex conditions

## Template Sources

### Teaching Templates

Hand-crafted templates designed for education:
- Located in `website/rule-builder/src/lib/templates/teaching/`
- Include comprehensive `learningPoints`
- Focus on demonstrating specific concepts

### Democonfig Templates

Imported from production demo rules:
- Source: `packages/x-fidelity-democonfig/src/rules/`
- Automatically bundled during build
- Metadata added via `democonfigMetadata` mapping

### Community Templates

Templates contributed by the community:
- Follow the same structure as teaching templates
- Reviewed and approved via pull requests
- May be promoted to teaching or democonfig

## Troubleshooting

### Template Not Appearing

1. Check that the template is exported from the teaching index
2. Verify the template is included in the `allTemplates` array
3. Clear browser cache and restart the dev server

### Validation Errors

1. Ensure the rule JSON matches the expected schema
2. Check that required fields (fact, operator, value) are present
3. Verify the event type is `warning` or `fatality`

### Build Failures

1. Check for TypeScript type errors in the template definition
2. Ensure all imports are correct
3. Run `yarn typecheck` to identify issues

## Next Steps

- [Rule Builder Guide](./rule-builder-guide) - Learn how to use the Rule Builder
- [Rules Cookbook](./rules-cookbook) - More example rule patterns
- [Plugin Development](/docs/plugins/overview) - Create custom plugins
