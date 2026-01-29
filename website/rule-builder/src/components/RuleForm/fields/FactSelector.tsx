/**
 * FactSelector - Dropdown for selecting a fact
 *
 * Features:
 * - Searchable dropdown with all available facts
 * - Grouped by plugin
 * - Shows fact descriptions and tags
 * - Integrated tooltip with detailed documentation
 */

import { useState, useMemo, useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { factCatalog, getFactByName, getPluginNames } from '../data/factCatalog';
import type { FactMetadata } from '../data/factCatalog';
import { FactTooltip } from '../tooltips/FactTooltip';

export interface FactSelectorProps {
  /** Currently selected fact name */
  value: string;
  /** Called when a fact is selected */
  onChange: (factName: string) => void;
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
 * FactSelector component with search and grouping
 */
export function FactSelector({
  value,
  onChange,
  label = 'Fact',
  error,
  disabled = false,
  id,
}: FactSelectorProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Get the currently selected fact metadata
  const selectedFact = useMemo(() => getFactByName(value), [value]);

  // Get plugin names for grouping
  const pluginNames = useMemo(() => getPluginNames(), []);

  // Filter facts based on search query
  const filteredFacts = useMemo(() => {
    if (!searchQuery) return factCatalog;

    const lowerQuery = searchQuery.toLowerCase();
    return factCatalog.filter(
      (fact) =>
        fact.name.toLowerCase().includes(lowerQuery) ||
        fact.description.toLowerCase().includes(lowerQuery) ||
        fact.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [searchQuery]);

  // Group filtered facts by plugin
  const groupedFacts = useMemo(() => {
    const groups: Record<string, FactMetadata[]> = {};

    for (const pluginName of pluginNames) {
      const factsInGroup = filteredFacts.filter((f) => f.plugin === pluginName);
      if (factsInGroup.length > 0) {
        groups[pluginName] = factsInGroup;
      }
    }

    return groups;
  }, [filteredFacts, pluginNames]);

  const handleValueChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchQuery('');
    }
  }, []);

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {selectedFact && <FactTooltip fact={selectedFact} />}
      </div>

      {/* Select dropdown */}
      <Select.Root
        value={value}
        onValueChange={handleValueChange}
        open={open}
        onOpenChange={handleOpenChange}
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
          <Select.Value placeholder="Select a fact...">
            {selectedFact ? (
              <span className="font-mono">{selectedFact.name}</span>
            ) : (
              <span className="text-foreground-muted">Select a fact...</span>
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
            {/* Search input */}
            <div className="p-2 border-b border-border" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search facts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                  style={{ backgroundColor: 'var(--xfi-background)' }}
                  // Prevent select from closing when typing
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <Select.Viewport className="p-1 max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
              {Object.entries(groupedFacts).length === 0 ? (
                <div className="py-4 text-center text-sm text-foreground-muted">
                  No facts found
                </div>
              ) : (
                Object.entries(groupedFacts).map(([pluginName, facts]) => (
                  <Select.Group key={pluginName}>
                    <Select.Label className="px-2 py-1.5 text-xs font-medium text-foreground-muted uppercase tracking-wide">
                      {pluginName}
                    </Select.Label>
                    {facts.map((fact) => (
                      <Select.Item
                        key={fact.name}
                        value={fact.name}
                        className="relative flex items-start gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none data-[highlighted]:bg-background-lighter data-[state=checked]:bg-accent/10"
                      >
                        <Select.ItemIndicator className="absolute left-1 top-2">
                          <CheckIcon className="w-3.5 h-3.5 text-accent" />
                        </Select.ItemIndicator>
                        <div className="pl-5 min-w-0">
                          <Select.ItemText>
                            <span className="font-mono text-foreground">{fact.name}</span>
                          </Select.ItemText>
                          <p className="text-xs text-foreground-muted truncate">
                            {fact.description}
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
      {selectedFact && (
        <p className="text-xs text-foreground-muted">{selectedFact.description}</p>
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
