/**
 * ConditionGroupForm - Form for editing condition groups (all/any/not)
 *
 * Allows changing the logic type of the condition group.
 */

import { useMemo, useCallback } from 'react';
import { useRuleStore } from '../../../store/ruleStore';
import { FieldTooltip } from '../tooltips/FieldTooltip';
import type { NestedCondition } from '../../../types';

export interface ConditionGroupFormProps {
  /** Path to the condition group */
  path: string[];
  /** The condition group data */
  data: NestedCondition;
}

type GroupType = 'all' | 'any' | 'not';

interface GroupTypeOption {
  value: GroupType;
  label: string;
  description: string;
}

const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  {
    value: 'all',
    label: 'ALL (AND)',
    description: 'All conditions must be true',
  },
  {
    value: 'any',
    label: 'ANY (OR)',
    description: 'At least one condition must be true',
  },
  {
    value: 'not',
    label: 'NOT',
    description: 'The condition must NOT be true',
  },
];

/**
 * ConditionGroupForm component
 */
export function ConditionGroupForm({
  path,
  data,
}: ConditionGroupFormProps): JSX.Element {
  const updateNode = useRuleStore((state) => state.updateNode);

  // Determine current group type
  const currentType = useMemo((): GroupType => {
    if ('all' in data) return 'all';
    if ('any' in data) return 'any';
    if ('not' in data) return 'not';
    return 'all'; // Default
  }, [data]);

  // Get the children of the current group
  const currentChildren = useMemo(() => {
    if ('all' in data) return data.all;
    if ('any' in data) return data.any;
    if ('not' in data) return data.not;
    return [];
  }, [data]);

  // Handle group type change
  const handleTypeChange = useCallback(
    (newType: GroupType) => {
      if (newType === currentType) return;

      // Create new group with the same children
      let newGroup: NestedCondition;

      if (newType === 'not') {
        // NOT only supports a single child
        const firstChild = Array.isArray(currentChildren) ? currentChildren[0] : currentChildren;
        newGroup = { not: firstChild || { fact: '', operator: 'equal', value: '' } };
      } else {
        // ALL/ANY support multiple children
        const childArray = Array.isArray(currentChildren) ? currentChildren : currentChildren ? [currentChildren] : [];
        newGroup = { [newType]: childArray } as NestedCondition;
      }

      // Update at parent path
      const parentPath = path.slice(0, -1);
      const lastSegment = path[path.length - 1] ?? '';

      if (parentPath.length === 0) {
        // This is the root conditions object
        updateNode(['conditions'], newGroup, 'form');
      } else {
        // This is a nested group
        updateNode([...parentPath, lastSegment as string], newGroup, 'form');
      }
    },
    [currentType, currentChildren, path, updateNode]
  );

  // Count children
  const childCount = useMemo(() => {
    if (Array.isArray(currentChildren)) {
      return currentChildren.length;
    }
    return currentChildren ? 1 : 0;
  }, [currentChildren]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Condition Group</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Configure how conditions in this group are evaluated
        </p>
      </div>

      {/* Group type selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Logic Type
          </label>
          <FieldTooltip
            title="Condition Logic"
            description="Determines how multiple conditions in this group are combined."
            example={
              <div className="space-y-1">
                <div><strong>ALL:</strong> condition1 AND condition2 AND ...</div>
                <div><strong>ANY:</strong> condition1 OR condition2 OR ...</div>
                <div><strong>NOT:</strong> NOT condition</div>
              </div>
            }
          />
        </div>

        <div className="grid gap-2">
          {GROUP_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${currentType === option.value
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-hover'
                }
              `}
            >
              <input
                type="radio"
                name="group-type"
                value={option.value}
                checked={currentType === option.value}
                onChange={() => handleTypeChange(option.value)}
                className="mt-0.5 w-4 h-4 text-accent focus:ring-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Group info */}
      <div className="p-4 bg-background-secondary rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Group Status</span>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-foreground-muted">Type:</dt>
          <dd className="font-medium text-primary">{currentType.toUpperCase()}</dd>
          <dt className="text-foreground-muted">Children:</dt>
          <dd className="font-medium text-foreground">{childCount} condition(s)</dd>
        </dl>
      </div>

      {/* Warning for NOT with multiple children */}
      {currentType === 'not' && childCount > 1 && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <h4 className="text-sm font-medium text-warning mb-1">Warning</h4>
          <p className="text-xs text-foreground-muted">
            NOT groups should only contain a single condition. Extra conditions will be ignored.
          </p>
        </div>
      )}

      {/* Tip */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-1">Tip</h4>
        <p className="text-xs text-foreground-muted">
          Use the tree view to add, remove, or reorder conditions within this group.
          Click on individual conditions to edit their properties.
        </p>
      </div>
    </div>
  );
}
