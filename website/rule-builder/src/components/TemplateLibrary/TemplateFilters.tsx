/**
 * TemplateFilters Component
 *
 * Filter dropdowns for plugin, use case, and complexity.
 * Uses Radix UI Select for accessible dropdown menus.
 */

import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { pluginInfo, useCaseInfo } from '../../lib/templates/types';
import type { PluginType, UseCaseType, ComplexityLevel, TemplateSource } from '../../lib/templates/types';

interface TemplateFiltersProps {
  /** Current plugin filter */
  plugin: PluginType | 'all';

  /** Current use case filter */
  useCase: UseCaseType | 'all';

  /** Current complexity filter */
  complexity: ComplexityLevel | 'all';

  /** Current source filter */
  source: TemplateSource | 'all';

  /** Called when plugin filter changes */
  onPluginChange: (plugin: PluginType | 'all') => void;

  /** Called when use case filter changes */
  onUseCaseChange: (useCase: UseCaseType | 'all') => void;

  /** Called when complexity filter changes */
  onComplexityChange: (complexity: ComplexityLevel | 'all') => void;

  /** Called when source filter changes */
  onSourceChange: (source: TemplateSource | 'all') => void;

  /** Reset all filters */
  onReset: () => void;

  /** Whether any filters are active */
  hasActiveFilters: boolean;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

function SelectItem({ value, children }: SelectItemProps): JSX.Element {
  return (
    <Select.Item
      value={value}
      className="relative flex items-center px-8 py-2 text-sm rounded cursor-pointer outline-none text-foreground hover:bg-accent data-[highlighted]:bg-accent"
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
        <CheckIcon className="w-4 h-4" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  options: Array<{ value: string; label: string; icon?: string }>;
}

function FilterSelect({ value, onValueChange, label, options }: FilterSelectProps): JSX.Element {
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-foreground-muted">{label}</label>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger
          className="inline-flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-background-secondary focus-ring min-w-[140px]"
          aria-label={label}
        >
          <Select.Value>
            <span className="flex items-center gap-2">
              {selectedOption?.icon && <span>{selectedOption.icon}</span>}
              {selectedOption?.label}
            </span>
          </Select.Value>
          <Select.Icon>
            <ChevronDownIcon className="w-4 h-4 text-foreground-muted" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 overflow-hidden rounded-md border border-border bg-background shadow-md animate-fade-in"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    {option.icon && <span>{option.icon}</span>}
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function TemplateFilters({
  plugin,
  useCase,
  complexity,
  source,
  onPluginChange,
  onUseCaseChange,
  onComplexityChange,
  onSourceChange,
  onReset,
  hasActiveFilters,
}: TemplateFiltersProps): JSX.Element {
  const pluginOptions = [
    { value: 'all', label: 'All Plugins', icon: '🔌' },
    ...Object.entries(pluginInfo).map(([key, info]) => ({
      value: key,
      label: info.label,
      icon: info.icon,
    })),
  ];

  const useCaseOptions = [
    { value: 'all', label: 'All Use Cases', icon: '📋' },
    ...Object.entries(useCaseInfo).map(([key, info]) => ({
      value: key,
      label: info.label,
      icon: info.icon,
    })),
  ];

  const complexityOptions = [
    { value: 'all', label: 'All Levels', icon: '📊' },
    { value: 'beginner', label: 'Beginner', icon: '⭐' },
    { value: 'intermediate', label: 'Intermediate', icon: '⭐⭐' },
    { value: 'advanced', label: 'Advanced', icon: '⭐⭐⭐' },
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Sources', icon: '📦' },
    { value: 'teaching', label: 'Teaching', icon: '📚' },
    { value: 'democonfig', label: 'Demo Config', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterSelect
        value={plugin}
        onValueChange={(v) => onPluginChange(v as PluginType | 'all')}
        label="Plugin"
        options={pluginOptions}
      />

      <FilterSelect
        value={useCase}
        onValueChange={(v) => onUseCaseChange(v as UseCaseType | 'all')}
        label="Use Case"
        options={useCaseOptions}
      />

      <FilterSelect
        value={complexity}
        onValueChange={(v) => onComplexityChange(v as ComplexityLevel | 'all')}
        label="Complexity"
        options={complexityOptions}
      />

      <FilterSelect
        value={source}
        onValueChange={(v) => onSourceChange(v as TemplateSource | 'all')}
        label="Source"
        options={sourceOptions}
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground rounded-md hover:bg-background-secondary transition-colors"
          aria-label="Clear all filters"
        >
          <Cross2Icon className="w-3.5 h-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default TemplateFilters;
