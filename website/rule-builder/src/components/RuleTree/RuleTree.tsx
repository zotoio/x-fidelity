/**
 * RuleTree - Main tree navigation component for the Rule Builder
 * 
 * Displays the hierarchical structure of a rule with:
 * - Root node (rule name)
 * - Conditions tree with nested all/any/not groups
 * - Individual condition nodes
 * - Event node
 * 
 * Features:
 * - Node selection with visual highlight
 * - Context menu for add/delete/duplicate operations
 * - Validation error display inline
 * - Keyboard navigation (a11y)
 * - Radix Collapsible for expand/collapse
 */

import * as React from 'react';
import { PlusIcon, FileTextIcon } from '@radix-ui/react-icons';
import { useShallow } from 'zustand/react/shallow';
import { useRuleStore } from '../../store/ruleStore';
import { selectTreeStructure } from '../../store/selectors';
import { createEmptyCondition } from '../../store/actions';
import { pathToString, getAtPath, deepClone } from '../../lib/utils/pathUtils';
import type { TreeNode as TreeNodeData } from '../../store/ruleStore';
import type { TreeContextMenuAction } from './TreeContextMenu';
import type { RuleCondition, NestedCondition } from '../../types';
import { TreeNode } from './TreeNode';
import styles from './styles.module.css';

/**
 * Build validation error map from validation errors array
 */
function buildValidationErrorMap(
  errors: Array<{ path: string[]; message: string }>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  for (const error of errors) {
    const pathString = pathToString(error.path);
    const existing = map.get(pathString) || [];
    existing.push(error.message);
    map.set(pathString, existing);
  }
  
  return map;
}

/**
 * RuleTree component
 */
export function RuleTree(): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Select state from store with stable references
  const rule = useRuleStore((state) => state.rule);
  const selectedPath = useRuleStore(useShallow((state) => state.selectedPath));
  const expandedPaths = useRuleStore((state) => state.expandedPaths);
  const validationErrors = useRuleStore(useShallow((state) => state.validationErrors));
  
  // Memoize tree structure to prevent infinite loops
  const treeStructure = React.useMemo(() => {
    const state = useRuleStore.getState();
    return selectTreeStructure(state);
  }, [rule, expandedPaths]);
  
  // Get actions from store
  const selectNode = useRuleStore((state) => state.selectNode);
  const toggleExpanded = useRuleStore((state) => state.toggleExpanded);
  const addCondition = useRuleStore((state) => state.addCondition);
  const addConditionGroup = useRuleStore((state) => state.addConditionGroup);
  const deleteNode = useRuleStore((state) => state.deleteNode);
  const moveNode = useRuleStore((state) => state.moveNode);
  const newRule = useRuleStore((state) => state.newRule);
  
  // Build validation error map
  const validationErrorMap = React.useMemo(
    () => buildValidationErrorMap(validationErrors),
    [validationErrors]
  );
  
  /**
   * Find the appropriate parent path for adding conditions
   */
  const findConditionParentPath = React.useCallback((node: TreeNodeData): string[] => {
    // For condition groups, add to their array (all/any)
    if (node.type === 'condition-group') {
      const groupType = node.label.toLowerCase() as 'all' | 'any' | 'not';
      if (groupType === 'not') {
        // Can't add multiple children to NOT
        return node.path;
      }
      // Check if this is the root group (path is ['conditions', groupType])
      // Root group's path already points to the array
      if (node.path.length === 2 && node.path[0] === 'conditions') {
        return node.path;
      }
      // Nested groups need the groupType appended to reach the array
      return [...node.path, groupType];
    }
    
    // For conditions container, find the root group
    if (node.type === 'conditions' && rule) {
      const rootGroupType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
      return ['conditions', rootGroupType];
    }
    
    // For rule, add to conditions root
    if ((node.type === 'rule' || node.path.length === 0) && rule) {
      const rootGroupType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
      return ['conditions', rootGroupType];
    }
    
    return ['conditions', 'all'];
  }, [rule]);
  
  /**
   * Handle context menu actions
   */
  const handleContextAction = React.useCallback((action: TreeContextMenuAction) => {
    const { type, node } = action;
    
    switch (type) {
      case 'addCondition': {
        const parentPath = findConditionParentPath(node);
        const newCondition = createEmptyCondition();
        addCondition(parentPath, newCondition, 'tree');
        break;
      }
      
      case 'addAll': {
        const parentPath = findConditionParentPath(node);
        addConditionGroup(parentPath, 'all', 'tree');
        break;
      }
      
      case 'addAny': {
        const parentPath = findConditionParentPath(node);
        addConditionGroup(parentPath, 'any', 'tree');
        break;
      }
      
      case 'duplicate': {
        if (!rule || node.path.length < 2) break;
        
        // Get the node data and parent path
        const nodeData = getAtPath<RuleCondition | NestedCondition>(rule, node.path);
        if (!nodeData) break;
        
        // Find the parent array path
        const parentPath = node.path.slice(0, -1);
        const parentArray = getAtPath<Array<RuleCondition | NestedCondition>>(rule, parentPath);
        
        if (Array.isArray(parentArray)) {
          // Insert a copy at the next index
          const clonedData = deepClone(nodeData);
          addCondition(parentPath, clonedData as RuleCondition, 'tree');
        }
        break;
      }
      
      case 'delete': {
        if (node.path.length < 2) break;
        deleteNode(node.path, 'tree');
        break;
      }
    }
  }, [rule, findConditionParentPath, addCondition, addConditionGroup, deleteNode]);
  
  /**
   * Handle node selection
   */
  const handleSelect = React.useCallback((path: string[]) => {
    selectNode(path, 'tree');
  }, [selectNode]);
  
  /**
   * Handle expand/collapse
   */
  const handleToggle = React.useCallback((pathString: string) => {
    toggleExpanded(pathString);
  }, [toggleExpanded]);
  
  /**
   * Handle new rule creation
   */
  const handleNewRule = React.useCallback(() => {
    newRule();
  }, [newRule]);
  
  /**
   * Handle drag and drop
   */
  const handleDrop = React.useCallback((sourcePath: string[], targetPath: string[], insertIndex: number) => {
    moveNode(sourcePath, targetPath, insertIndex, 'tree');
  }, [moveNode]);
  
  // Empty state when no rule is loaded
  if (!rule || treeStructure.length === 0) {
    return (
      <div className={styles.treeContainer}>
        <div className={styles.emptyState}>
          <FileTextIcon className={styles.emptyStateIcon} />
          <div className={styles.emptyStateTitle}>No rule loaded</div>
          <div className={styles.emptyStateDescription}>
            Create a new rule or load one from the template library
          </div>
        </div>
        
        <button
          className={styles.actionButton}
          onClick={handleNewRule}
          aria-label="Create new rule"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Rule</span>
        </button>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={styles.treeContainer}
      role="tree"
      aria-label="Rule structure"
    >
      {treeStructure.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          validationErrors={validationErrorMap}
          onSelect={handleSelect}
          onToggle={handleToggle}
          onContextAction={handleContextAction}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

export default RuleTree;
