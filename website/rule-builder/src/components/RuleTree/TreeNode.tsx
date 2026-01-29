/**
 * TreeNode - Individual tree node component with Radix Collapsible
 * 
 * Renders a single node in the rule tree with:
 * - Expand/collapse functionality
 * - Selection state
 * - Context menu integration
 * - Validation error display
 * - Keyboard navigation support
 */

import * as React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRightIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { TreeNode as TreeNodeData } from '../../store/ruleStore';
import { TreeNodeIcon, getGroupTypeFromLabel } from './TreeNodeIcon';
import { TreeContextMenu, type TreeContextMenuAction } from './TreeContextMenu';
import { pathToString, pathsEqual } from '../../lib/utils/pathUtils';
import styles from './styles.module.css';

interface TreeNodeProps {
  node: TreeNodeData;
  selectedPath: string[];
  expandedPaths: Set<string>;
  validationErrors: Map<string, string[]>;
  onSelect: (path: string[]) => void;
  onToggle: (pathString: string) => void;
  onContextAction: (action: TreeContextMenuAction) => void;
  onDrop?: (sourcePath: string[], targetPath: string[], insertIndex: number) => void;
  level?: number;
}

/**
 * Get node label for display
 */
function getDisplayLabel(node: TreeNodeData): string {
  if (node.type === 'condition' && node.data) {
    const data = node.data as { fact?: string; operator?: string; value?: unknown };
    if (data.fact) {
      return data.fact;
    }
  }
  return node.label;
}

/**
 * Get condition preview text
 */
function getConditionPreview(node: TreeNodeData): string | null {
  if (node.type !== 'condition' || !node.data) return null;
  
  const data = node.data as { fact?: string; operator?: string; value?: unknown };
  if (!data.operator || data.value === undefined) return null;
  
  const valueStr = typeof data.value === 'string' 
    ? `"${data.value.substring(0, 20)}${data.value.length > 20 ? '...' : ''}"`
    : JSON.stringify(data.value);
  
  return `${data.operator} ${valueStr}`;
}

/**
 * Get icon type for a node
 */
function getIconType(node: TreeNodeData): 'root' | 'conditions' | 'all' | 'any' | 'not' | 'condition' | 'event' | 'condition-group' | 'rule' {
  if (node.type === 'condition-group') {
    return getGroupTypeFromLabel(node.label);
  }
  // Map node types to valid icon types
  if (node.type === 'event-param') {
    return 'event';
  }
  return node.type;
}

/**
 * Check if a node can be dragged
 */
function canDrag(node: TreeNodeData): boolean {
  // Can drag conditions and condition groups (but not root-level nodes)
  return (
    (node.type === 'condition' || node.type === 'condition-group') &&
    node.path.length > 2 // Must be within a conditions array
  );
}

/**
 * Check if a node can accept drops
 */
function canAcceptDrop(node: TreeNodeData): boolean {
  // Can drop into condition groups (all/any) and the conditions container
  return (
    node.type === 'conditions' ||
    node.type === 'condition-group'
  );
}

/**
 * Get the drop target path for a node
 */
function getDropTargetPath(node: TreeNodeData): string[] | null {
  if (node.type === 'conditions') {
    // Drop into the first group (all or any)
    if (node.children.length > 0) {
      const firstChild = node.children[0];
      if (firstChild && (firstChild.type === 'condition-group' || firstChild.label.startsWith('ALL') || firstChild.label.startsWith('ANY'))) {
        return firstChild.path;
      }
    }
    return null;
  }
  if (node.type === 'condition-group') {
    // Check if this is the root group (path is ['conditions', groupType])
    // Root group's path already points to the array
    if (node.path.length === 2 && node.path[0] === 'conditions') {
      return node.path;
    }
    // Nested groups need the groupType appended to reach the array
    const label = node.label.toLowerCase();
    if (label.startsWith('all')) {
      return [...node.path, 'all'];
    } else if (label.startsWith('any')) {
      return [...node.path, 'any'];
    }
  }
  return null;
}

/**
 * TreeNode component
 */
export function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  validationErrors,
  onSelect,
  onToggle,
  onContextAction,
  onDrop,
  level = 0,
}: TreeNodeProps): JSX.Element {
  const pathString = pathToString(node.path);
  const isSelected = pathsEqual(selectedPath, node.path);
  const isExpanded = expandedPaths.has(pathString);
  const hasChildren = node.children.length > 0;
  const errors = validationErrors.get(pathString) || [];
  const hasErrors = errors.length > 0;
  
  const displayLabel = getDisplayLabel(node);
  const conditionPreview = getConditionPreview(node);
  const iconType = getIconType(node);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'inside' | 'after' | null>(null);
  
  const isDraggable = canDrag(node);
  const isDropTarget = canAcceptDrop(node);
  
  /**
   * Handle node click - selects the node and toggles expand/collapse if it has children
   */
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
    // Also toggle expand/collapse if the node has children
    if (hasChildren) {
      onToggle(pathString);
    }
  }, [node.path, onSelect, hasChildren, pathString, onToggle]);
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(node.path);
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !isExpanded) {
          onToggle(pathString);
        }
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          onToggle(pathString);
        }
        break;
    }
  }, [node.path, hasChildren, isExpanded, pathString, onSelect, onToggle]);
  
  /**
   * Handle drag start
   */
  const handleDragStart = React.useCallback((e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-rule-node', JSON.stringify(node.path));
  }, [isDraggable, node.path]);
  
  /**
   * Handle drag end
   */
  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);
  
  /**
   * Handle drag over
   */
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (!isDropTarget && !isDraggable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (isDropTarget) {
      // For drop targets (groups), always drop inside
      setDropPosition('inside');
    } else if (isDraggable) {
      // For draggable items, determine before/after based on position
      if (y < height / 2) {
        setDropPosition('before');
      } else {
        setDropPosition('after');
      }
    }
    
    setIsDragOver(true);
  }, [isDropTarget, isDraggable]);
  
  /**
   * Handle drag leave
   */
  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving this element (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
      setDropPosition(null);
    }
  }, []);
  
  /**
   * Handle drop
   */
  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDropPosition(null);
    
    if (!onDrop) return;
    
    const data = e.dataTransfer.getData('application/x-rule-node');
    if (!data) return;
    
    try {
      const sourcePath = JSON.parse(data) as string[];
      
      // Prevent dropping on self
      if (pathsEqual(sourcePath, node.path)) return;
      
      // Prevent dropping on own descendants
      const isDescendant = node.path.length > sourcePath.length &&
        sourcePath.every((seg, i) => seg === node.path[i]);
      if (isDescendant) return;
      
      if (isDropTarget) {
        // Drop inside a group - get the array path
        const targetArrayPath = getDropTargetPath(node);
        if (targetArrayPath) {
          // Insert at the end of the array
          onDrop(sourcePath, targetArrayPath, node.children.length);
        }
      } else if (dropPosition && isDraggable) {
        // Drop before/after a sibling
        const parentPath = node.path.slice(0, -1);
        const currentIndex = parseInt(node.path[node.path.length - 1] ?? '0', 10);
        const insertIndex = dropPosition === 'before' ? currentIndex : currentIndex + 1;
        onDrop(sourcePath, parentPath, insertIndex);
      }
    } catch {
      // Invalid data
    }
  }, [onDrop, node, isDropTarget, isDraggable, dropPosition]);
  
  // Build class names
  const nodeClasses = [
    styles.treeNode,
    isSelected && styles.selected,
    hasErrors && styles.hasError,
    isDragging && styles.dragging,
    isDragOver && styles.dragOver,
    isDragOver && dropPosition === 'before' && styles.dropBefore,
    isDragOver && dropPosition === 'after' && styles.dropAfter,
    isDragOver && dropPosition === 'inside' && styles.dropInside,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={styles.treeNodeWrapper} data-testid={`tree-node-${pathString || 'root'}`}>
      <Collapsible.Root
        open={isExpanded}
        onOpenChange={() => onToggle(pathString)}
      >
        <TreeContextMenu node={node} onAction={onContextAction}>
          <div
            draggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={nodeClasses}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={level + 1}
            data-path={pathString}
          >
            {/* Expand/collapse button */}
            {hasChildren ? (
              <Collapsible.Trigger asChild>
                <button
                  className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
                  onClick={(e) => e.stopPropagation()} // Prevent node selection when clicking expand
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  tabIndex={-1}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </Collapsible.Trigger>
            ) : (
              <span className={styles.expandPlaceholder} aria-hidden="true" />
            )}
            
            {/* Node icon */}
            <span className={styles.nodeIcon}>
              <TreeNodeIcon type={iconType} />
            </span>
            
            {/* Node label */}
            <span className={styles.nodeLabel}>
              {displayLabel}
              {conditionPreview && (
                <span className={styles.conditionPreview}>
                  {conditionPreview}
                </span>
              )}
            </span>
          </div>
        </TreeContextMenu>
        
        {/* Validation errors */}
        {hasErrors && errors.map((error, index) => (
          <div key={index} className={styles.errorMessage}>
            <ExclamationTriangleIcon className={styles.errorIcon} />
            <span>{error}</span>
          </div>
        ))}
        
        {/* Children */}
        {hasChildren && (
          <Collapsible.Content className={styles.collapsibleContent}>
            <div className={styles.nodeChildren} role="group">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  selectedPath={selectedPath}
                  expandedPaths={expandedPaths}
                  validationErrors={validationErrors}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  onContextAction={onContextAction}
                  onDrop={onDrop}
                  level={level + 1}
                />
              ))}
            </div>
          </Collapsible.Content>
        )}
      </Collapsible.Root>
    </div>
  );
}

export default TreeNode;
