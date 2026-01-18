/**
 * useTreeNavigation - Keyboard navigation hook for the rule tree
 * 
 * Implements accessible keyboard navigation:
 * - Arrow Up/Down: Move between sibling nodes
 * - Arrow Left: Collapse current node or move to parent
 * - Arrow Right: Expand current node or move to first child
 * - Enter/Space: Select current node
 * - Home: Go to first node
 * - End: Go to last visible node
 */

import { useCallback, useEffect, useRef } from 'react';
import type { TreeNode } from '../../../store/ruleStore';
import { pathToString } from '../../../lib/utils/pathUtils';

interface UseTreeNavigationOptions {
  nodes: TreeNode[];
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  onToggle: (pathString: string) => void;
  isExpanded: (pathString: string) => boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}

interface UseTreeNavigationReturn {
  /**
   * Get props to spread on a tree item for keyboard navigation
   */
  getNodeProps: (node: TreeNode) => {
    tabIndex: number;
    role: 'treeitem';
    'aria-expanded'?: boolean;
    'aria-selected': boolean;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  
  /**
   * Focus the selected node
   */
  focusSelected: () => void;
}

/**
 * Flatten tree nodes into a list of visible nodes
 */
function getVisibleNodes(
  nodes: TreeNode[],
  isExpanded: (pathString: string) => boolean
): TreeNode[] {
  const result: TreeNode[] = [];
  
  function traverse(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      result.push(node);
      
      const pathString = pathToString(node.path);
      if (node.children.length > 0 && isExpanded(pathString)) {
        traverse(node.children);
      }
    }
  }
  
  traverse(nodes);
  return result;
}

/**
 * Find node index in visible nodes list
 */
function findNodeIndex(visibleNodes: TreeNode[], path: string[]): number {
  const pathString = pathToString(path);
  return visibleNodes.findIndex(
    (node) => pathToString(node.path) === pathString
  );
}

/**
 * useTreeNavigation hook
 */
export function useTreeNavigation({
  nodes,
  selectedPath,
  onSelect,
  onToggle,
  isExpanded,
  containerRef,
}: UseTreeNavigationOptions): UseTreeNavigationReturn {
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  /**
   * Get visible nodes (flattened list of expanded nodes)
   */
  const getVisible = useCallback(() => {
    return getVisibleNodes(nodes, isExpanded);
  }, [nodes, isExpanded]);
  
  /**
   * Navigate to a specific node
   */
  const navigateTo = useCallback((node: TreeNode) => {
    onSelect(node.path);
    
    // Focus the node element
    const pathString = pathToString(node.path);
    const element = nodeRefs.current.get(pathString);
    if (element) {
      element.focus();
    }
  }, [onSelect]);
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    node: TreeNode
  ) => {
    const visibleNodes = getVisible();
    const currentIndex = findNodeIndex(visibleNodes, node.path);
    const pathString = pathToString(node.path);
    const hasChildren = node.children.length > 0;
    const expanded = isExpanded(pathString);
    
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex + 1;
        if (nextIndex < visibleNodes.length) {
          const nextNode = visibleNodes[nextIndex];
          if (nextNode) {
            navigateTo(nextNode);
          }
        }
        break;
      }
      
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          const prevNode = visibleNodes[prevIndex];
          if (prevNode) {
            navigateTo(prevNode);
          }
        }
        break;
      }
      
      case 'ArrowRight': {
        e.preventDefault();
        if (hasChildren) {
          if (!expanded) {
            // Expand current node
            onToggle(pathString);
          } else if (node.children[0]) {
            // Move to first child
            navigateTo(node.children[0]);
          }
        }
        break;
      }
      
      case 'ArrowLeft': {
        e.preventDefault();
        if (hasChildren && expanded) {
          // Collapse current node
          onToggle(pathString);
        } else if (node.path.length > 0) {
          // Move to parent
          const parentPath = node.path.slice(0, -1);
          // Find the parent node in visible nodes
          const parentIndex = visibleNodes.findIndex(
            (n) => pathToString(n.path) === pathToString(parentPath)
          );
          if (parentIndex >= 0) {
            const parentNode = visibleNodes[parentIndex];
            if (parentNode) {
              navigateTo(parentNode);
            }
          }
        }
        break;
      }
      
      case 'Enter':
      case ' ': {
        e.preventDefault();
        onSelect(node.path);
        break;
      }
      
      case 'Home': {
        e.preventDefault();
        const firstNode = visibleNodes[0];
        if (firstNode) {
          navigateTo(firstNode);
        }
        break;
      }
      
      case 'End': {
        e.preventDefault();
        const lastNode = visibleNodes[visibleNodes.length - 1];
        if (lastNode) {
          navigateTo(lastNode);
        }
        break;
      }
    }
  }, [getVisible, isExpanded, navigateTo, onSelect, onToggle]);
  
  /**
   * Focus the currently selected node
   */
  const focusSelected = useCallback(() => {
    const pathString = pathToString(selectedPath);
    const element = nodeRefs.current.get(pathString);
    if (element) {
      element.focus();
    }
  }, [selectedPath]);
  
  /**
   * Get props for a tree node
   */
  const getNodeProps = useCallback((node: TreeNode) => {
    const pathString = pathToString(node.path);
    const hasChildren = node.children.length > 0;
    const isSelected = pathToString(selectedPath) === pathString;
    
    return {
      tabIndex: isSelected ? 0 : -1,
      role: 'treeitem' as const,
      ...(hasChildren && { 'aria-expanded': isExpanded(pathString) }),
      'aria-selected': isSelected,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, node),
      ref: (el: HTMLElement | null) => {
        if (el) {
          nodeRefs.current.set(pathString, el);
        } else {
          nodeRefs.current.delete(pathString);
        }
      },
    };
  }, [selectedPath, isExpanded, handleKeyDown]);
  
  /**
   * Handle container focus - focus selected node or first node
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleContainerFocus = (e: FocusEvent) => {
      // Only handle if focus came from outside the tree
      if (!container.contains(e.relatedTarget as Node)) {
        const visibleNodes = getVisible();
        const selectedIndex = findNodeIndex(visibleNodes, selectedPath);
        
        if (selectedIndex >= 0) {
          focusSelected();
        } else if (visibleNodes[0]) {
          navigateTo(visibleNodes[0]);
        }
      }
    };
    
    container.addEventListener('focus', handleContainerFocus, true);
    return () => {
      container.removeEventListener('focus', handleContainerFocus, true);
    };
  }, [containerRef, getVisible, selectedPath, focusSelected, navigateTo]);
  
  return {
    getNodeProps,
    focusSelected,
  };
}

export default useTreeNavigation;
