/**
 * OperatorSelector - Dropdown for selecting an operator
 *
 * Features:
 * - Filters operators compatible with the selected fact
 * - Grouped by category
 * - Shows operator descriptions
 * - Integrated tooltip with examples
 */

import { useMemo, useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@radix-ui/react-icons';
import { operatorCatalog, getOperatorByName, getOperatorsForFact } from '../data/operatorCatalog';
import { getFactByName } from '../data/factCatalog';
import type { OperatorMetadata } from '../data/operatorCatalog';
import type { ConditionOperator } from '../../../types';
import { OperatorTooltip } from '../tooltips/OperatorTooltip';

export interface OperatorSelectorProps {
  /** Currently selected operator name */
  value: ConditionOperator;
  /** Called when an operator is selected */
  onChange: (operator: ConditionOperator) => void;
  /** Currently selected fact (for filtering compatible operators) */
  selectedFact?: string;
  /** Label for the field */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** ID for accessibility */
  id?: string;
}

/**
 * Get category display name
 */
function getCategoryDisplayName(category: OperatorMetadata['category']): string {
  switch (category) {
    case 'comparison':
      return 'Comparison';
    case 'membership':
      return 'Membership';
    case 'pattern':
      return 'Pattern';
    case 'filesystem':
      return 'Filesystem';
    case 'ast':
      return 'AST';
    case 'version':
      return 'Version';
    default:
      return category;
  }
}

/**
 * OperatorSelector component with fact-based filtering
 */
export function OperatorSelector({
  value,
  onChange,
  selectedFact,
  label = 'Operator',
  error,
  disabled = false,
  id,
}: OperatorSelectorProps): JSX.Element {
  // Get the currently selected operator metadata
  const selectedOperator = useMemo(() => getOperatorByName(value), [value]);

  // Get fact metadata to determine compatible operators
  const factMetadata = useMemo(
    () => (selectedFact ? getFactByName(selectedFact) : undefined),
    [selectedFact]
  );

  // Get operators compatible with the selected fact
  const compatibleOperators = useMemo(() => {
    if (factMetadata?.compatibleOperators) {
      return getOperatorsForFact(selectedFact || '', factMetadata.compatibleOperators);
    }
    // If no fact selected or no compatible operators defined, show all
    return operatorCatalog;
  }, [selectedFact, factMetadata]);

  // Group operators by category
  const groupedOperators = useMemo(() => {
    const groups: Record<string, OperatorMetadata[]> = {};

    for (const op of compatibleOperators) {
      const category = op.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category]!.push(op);
    }

    return groups;
  }, [compatibleOperators]);

  const handleValueChange = useCallback(
    (newValue: string) => {
      onChange(newValue as ConditionOperator);
    },
    [onChange]
  );

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {selectedOperator && <OperatorTooltip operator={selectedOperator} />}
      </div>

      {/* Select dropdown */}
      <Select.Root
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <Select.Trigger
          id={id}
          className={`
            flex items-center justify-between w-full px-3 py-2 rounded-md
            bg-background border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
          aria-label={label}
        >
          <Select.Value placeholder="Select an operator...">
            {selectedOperator ? (
              <span className="font-mono">{selectedOperator.name}</span>
            ) : (
              <span className="text-foreground-muted">Select an operator...</span>
            )}
          </Select.Value>
          <Select.Icon>
            <ChevronDownIcon className="w-4 h-4 text-foreground-muted" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 w-[var(--radix-select-trigger-width)] max-h-80 overflow-hidden border border-border rounded-lg shadow-lg"
            position="popper"
            sideOffset={4}
            style={{ backgroundColor: 'var(--xfi-background-elevated)' }}
          >
            <Select.Viewport className="p-1" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
              {Object.entries(groupedOperators).length === 0 ? (
                <div className="py-4 text-center text-sm text-foreground-muted">
                  No compatible operators
                </div>
              ) : (
                Object.entries(groupedOperators).map(([category, operators]) => (
                  <Select.Group key={category}>
                    <Select.Label className="px-2 py-1.5 text-xs font-medium text-foreground-muted uppercase tracking-wide">
                      {getCategoryDisplayName(category as OperatorMetadata['category'])}
                    </Select.Label>
                    {operators.map((op) => (
                      <Select.Item
                        key={op.name}
                        value={op.name}
                        className="relative flex items-start gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none data-[highlighted]:bg-background-lighter data-[state=checked]:bg-accent/10"
                      >
                        <Select.ItemIndicator className="absolute left-1 top-2">
                          <CheckIcon className="w-3.5 h-3.5 text-accent" />
                        </Select.ItemIndicator>
                        <div className="pl-5 min-w-0">
                          <Select.ItemText>
                            <span className="font-mono text-foreground">{op.name}</span>
                          </Select.ItemText>
                          <p className="text-xs text-foreground-muted truncate">
                            {op.description}
                          </p>
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Group>
                ))
              )}
            </Select.Viewport>

            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-background-elevated cursor-default">
              <ChevronUpIcon className="w-4 h-4" />
            </Select.ScrollUpButton>
            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-background-elevated cursor-default">
              <ChevronDownIcon className="w-4 h-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Description hint */}
      {selectedOperator && (
        <p className="text-xs text-foreground-muted">{selectedOperator.description}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
