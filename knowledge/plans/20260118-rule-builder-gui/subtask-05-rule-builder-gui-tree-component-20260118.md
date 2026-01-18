# Subtask: Tree Navigation Component

## Metadata
- **Subtask ID**: 05
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-engineer
- **Dependencies**: 01 (SPA Scaffold), 04 (State Management)
- **Created**: 20260118

## Objective
Build the tree navigation component that displays the hierarchical structure of a rule (conditions, nested groups, event). Users can click nodes to select them for editing in the form panel, and use context menus to add/remove nodes.

## Deliverables Checklist
- [ ] Create tree component with Radix Collapsible
- [ ] Display rule structure as navigable tree:
  - [ ] Root node (rule name)
  - [ ] Conditions node with nested all/any/not groups
  - [ ] Individual condition nodes
  - [ ] Event node with params
- [ ] Implement node selection with visual highlight
- [ ] Add context menu for:
  - [ ] Add condition
  - [ ] Add condition group (all/any)
  - [ ] Delete node
  - [ ] Duplicate node
- [ ] Show node type icons (fact, operator, group, event)
- [ ] Display validation errors inline
- [ ] Add drag-and-drop reordering (stretch goal)
- [ ] Support keyboard navigation (a11y)

## Files to Create/Modify
```
website/rule-builder/src/components/RuleTree/
├── index.ts
├── RuleTree.tsx                      # Main component
├── TreeNode.tsx                      # Individual node component
├── TreeNodeIcon.tsx                  # Node type icons
├── TreeContextMenu.tsx               # Right-click menu
├── styles.module.css                 # Component styles
└── hooks/
    └── useTreeNavigation.ts          # Keyboard navigation

website/rule-builder/src/components/RuleTree/__tests__/
├── RuleTree.test.tsx
└── TreeNode.test.tsx
```

## Definition of Done
- [ ] Tree renders complete rule structure
- [ ] Nodes are expandable/collapsible
- [ ] Clicking node selects it and updates store
- [ ] Context menu operations work correctly
- [ ] Validation errors show on affected nodes
- [ ] Keyboard navigation works (arrow keys, enter)
- [ ] Screen reader accessible
- [ ] Styled to match Docusaurus theme

## Implementation Notes

### Tree Node Structure
```typescript
interface TreeNodeData {
  id: string;                    // Unique ID for React keys
  path: string[];                // Path in rule JSON
  type: 'root' | 'conditions' | 'all' | 'any' | 'not' | 'condition' | 'event';
  label: string;                 // Display label
  children: TreeNodeData[];
  hasError: boolean;
  errorMessage?: string;
}

// Derive from rule JSON
function ruleToTree(rule: RuleDefinition): TreeNodeData {
  return {
    id: 'root',
    path: [],
    type: 'root',
    label: rule.name,
    children: [
      conditionsToTree(rule.conditions, ['conditions']),
      eventToTree(rule.event, ['event']),
    ],
  };
}
```

### Node Type Icons
| Type | Icon | Description |
|------|------|-------------|
| root | 📋 | Rule root |
| conditions | 🔀 | Conditions container |
| all | ∧ | AND group |
| any | ∨ | OR group |
| not | ¬ | NOT wrapper |
| condition | ◉ | Individual condition |
| event | ⚡ | Event definition |

### Context Menu Actions
```typescript
const contextMenuItems = [
  { label: 'Add Condition', action: 'addCondition', icon: '+' },
  { label: 'Add AND Group', action: 'addAll', icon: '∧' },
  { label: 'Add OR Group', action: 'addAny', icon: '∨' },
  { separator: true },
  { label: 'Duplicate', action: 'duplicate', icon: '⧉' },
  { label: 'Delete', action: 'delete', icon: '🗑', destructive: true },
];
```

### Styling
```css
/* Match Docusaurus sidebar style */
.treeNode {
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.treeNode:hover {
  background: var(--ifm-color-emphasis-200);
}

.treeNode.selected {
  background: var(--ifm-color-primary-lighter);
  color: var(--ifm-color-primary-contrast-foreground);
}

.treeNode.hasError {
  border-left: 3px solid var(--ifm-color-danger);
}
```

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create unit tests for TreeNode component
- Test tree rendering with mock rule data
- Test selection updates store correctly
- Test context menu actions
- Manual keyboard navigation testing
- Defer integration testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
