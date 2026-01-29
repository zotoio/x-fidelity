/**
 * TreeContextMenu - Right-click context menu for tree nodes
 * 
 * Provides actions for:
 * - Adding conditions
 * - Adding condition groups (all/any)
 * - Duplicating nodes
 * - Deleting nodes
 */

import * as React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  PlusIcon,
  CopyIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import type { TreeNode } from '../../store/ruleStore';

export interface TreeContextMenuAction {
  type: 'addCondition' | 'addAll' | 'addAny' | 'duplicate' | 'delete';
  node: TreeNode;
}

interface TreeContextMenuProps {
  children: React.ReactNode;
  node: TreeNode;
  onAction: (action: TreeContextMenuAction) => void;
  disabled?: boolean;
}

/**
 * Menu item with icon
 */
function MenuItem({
  children,
  icon: Icon,
  onClick,
  destructive = false,
  disabled = false,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <ContextMenu.Item
      className={`
        flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none
        rounded-sm select-none
        ${destructive 
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950 focus:bg-red-50 dark:focus:bg-red-950' 
          : 'text-foreground hover:bg-accent focus:bg-accent'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="w-4 h-4" />
      {children}
    </ContextMenu.Item>
  );
}

/**
 * Logical operator icon component
 */
function LogicalIcon({ symbol }: { symbol: string }): JSX.Element {
  return (
    <span className="w-4 h-4 inline-flex items-center justify-center text-xs font-bold">
      {symbol}
    </span>
  );
}

/**
 * Check if a node can have children added
 */
function canAddChildren(node: TreeNode): boolean {
  // Can add to condition groups (all/any) and conditions container
  return (
    node.type === 'conditions' ||
    node.type === 'condition-group' ||
    node.type === 'rule'
  );
}

/**
 * Check if a node can be deleted
 */
function canDelete(node: TreeNode): boolean {
  // Can't delete root-level nodes (rule, conditions, event)
  return node.path.length > 1;
}

/**
 * Check if a node can be duplicated
 */
function canDuplicate(node: TreeNode): boolean {
  // Can duplicate conditions and condition groups within arrays
  return (
    node.type === 'condition' ||
    (node.type === 'condition-group' && node.path.length > 1)
  );
}

/**
 * TreeContextMenu component
 */
export function TreeContextMenu({
  children,
  node,
  onAction,
  disabled = false,
}: TreeContextMenuProps): JSX.Element {
  const handleAddCondition = React.useCallback(() => {
    onAction({ type: 'addCondition', node });
  }, [node, onAction]);

  const handleAddAll = React.useCallback(() => {
    onAction({ type: 'addAll', node });
  }, [node, onAction]);

  const handleAddAny = React.useCallback(() => {
    onAction({ type: 'addAny', node });
  }, [node, onAction]);

  const handleDuplicate = React.useCallback(() => {
    onAction({ type: 'duplicate', node });
  }, [node, onAction]);

  const handleDelete = React.useCallback(() => {
    onAction({ type: 'delete', node });
  }, [node, onAction]);

  const showAddChildren = canAddChildren(node);
  const showDuplicate = canDuplicate(node);
  const showDelete = canDelete(node);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="
            min-w-[180px] bg-background border border-border rounded-lg shadow-lg
            py-1 z-50 animate-in fade-in-0 zoom-in-95
          "
          alignOffset={5}
        >
          {showAddChildren && (
            <>
              <MenuItem icon={PlusIcon} onClick={handleAddCondition}>
                Add Condition
              </MenuItem>
              
              <MenuItem 
                icon={() => <LogicalIcon symbol="∧" />} 
                onClick={handleAddAll}
              >
                Add AND Group
              </MenuItem>
              
              <MenuItem 
                icon={() => <LogicalIcon symbol="∨" />} 
                onClick={handleAddAny}
              >
                Add OR Group
              </MenuItem>
              
              {(showDuplicate || showDelete) && (
                <ContextMenu.Separator className="h-px bg-border my-1" />
              )}
            </>
          )}
          
          {showDuplicate && (
            <MenuItem icon={CopyIcon} onClick={handleDuplicate}>
              Duplicate
            </MenuItem>
          )}
          
          {showDelete && (
            <MenuItem 
              icon={TrashIcon} 
              onClick={handleDelete}
              destructive
            >
              Delete
            </MenuItem>
          )}
          
          {!showAddChildren && !showDuplicate && !showDelete && (
            <div className="px-3 py-2 text-sm text-foreground-muted italic">
              No actions available
            </div>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default TreeContextMenu;
