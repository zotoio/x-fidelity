/**
 * TreeNodeIcon - Node type icons for the rule tree
 * 
 * Provides visual indicators for different node types in the rule tree:
 * - Root: Rule document icon
 * - Conditions: Branch/fork icon
 * - All: AND logical operator
 * - Any: OR logical operator
 * - Not: NOT logical operator
 * - Condition: Individual condition dot
 * - Event: Lightning bolt for event
 */

import {
  FileTextIcon,
  ComponentBooleanIcon,
  CircleIcon,
  LightningBoltIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';

export type TreeNodeType = 
  | 'root' 
  | 'conditions' 
  | 'all' 
  | 'any' 
  | 'not' 
  | 'condition' 
  | 'event' 
  | 'event-param'
  | 'condition-group'
  | 'rule';

interface TreeNodeIconProps {
  type: TreeNodeType;
  className?: string;
}

/**
 * Custom icon component for logical operators
 */
function LogicalIcon({ 
  symbol, 
  className 
}: { 
  symbol: string; 
  className?: string; 
}): JSX.Element {
  return (
    <span 
      className={`inline-flex items-center justify-center w-4 h-4 text-xs font-bold ${className || ''}`}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}

/**
 * Get icon for a specific node type
 */
export function TreeNodeIcon({ type, className = '' }: TreeNodeIconProps): JSX.Element {
  const baseClasses = `w-4 h-4 flex-shrink-0 ${className}`;
  
  switch (type) {
    case 'root':
    case 'rule':
      return (
        <FileTextIcon 
          className={`${baseClasses} text-primary`} 
          aria-label="Rule" 
        />
      );
    
    case 'conditions':
      return (
        <ComponentBooleanIcon 
          className={`${baseClasses} text-foreground-muted`} 
          aria-label="Conditions" 
        />
      );
    
    case 'all':
    case 'condition-group':
      // Default condition-group to 'all' style, parent component can override
      return (
        <LogicalIcon 
          symbol="∧" 
          className={`${baseClasses} text-blue-500`} 
        />
      );
    
    case 'any':
      return (
        <LogicalIcon 
          symbol="∨" 
          className={`${baseClasses} text-purple-500`} 
        />
      );
    
    case 'not':
      return (
        <LogicalIcon 
          symbol="¬" 
          className={`${baseClasses} text-orange-500`} 
        />
      );
    
    case 'condition':
      return (
        <CircleIcon 
          className={`${baseClasses} text-green-500`} 
          aria-label="Condition" 
        />
      );
    
    case 'event':
      return (
        <LightningBoltIcon 
          className={`${baseClasses} text-yellow-500`} 
          aria-label="Event" 
        />
      );
    
    case 'event-param':
      return (
        <InfoCircledIcon 
          className={`${baseClasses} text-yellow-400`} 
          aria-label="Event Parameter" 
        />
      );
    
    default:
      return (
        <CircleIcon 
          className={`${baseClasses} text-foreground-muted`} 
          aria-label="Unknown" 
        />
      );
  }
}

/**
 * Get the actual group type from a condition-group node label
 */
export function getGroupTypeFromLabel(label: string): 'all' | 'any' | 'not' {
  const upperLabel = label.toUpperCase();
  if (upperLabel === 'ALL' || upperLabel.startsWith('ALL')) return 'all';
  if (upperLabel === 'ANY' || upperLabel.startsWith('ANY')) return 'any';
  if (upperLabel === 'NOT' || upperLabel.startsWith('NOT')) return 'not';
  return 'all'; // default
}

export default TreeNodeIcon;
