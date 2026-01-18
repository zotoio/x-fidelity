/**
 * PathSelector - Dropdown for selecting JSONPath with suggested paths
 *
 * Features:
 * - Dropdown with fact-specific suggested paths
 * - Option to enter custom path
 * - Shows path descriptions
 * - Validates custom paths
 */

import { useState, useMemo, useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { getSuggestedPaths, allowsCustomPath, type SuggestedPath } from '../data/factCatalog';
import { FieldTooltip } from '../tooltips/FieldTooltip';

export interface PathSelectorProps {
  /** Current path value */
  value: string;
  /** Called when path changes */
  onChange: (path: string) => void;
  /** The selected fact name (to get suggested paths) */
  factName: string;
  /** Label for the field */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** ID for accessibility */
  id?: string;
}

/** Special value to indicate custom path mode */
const CUSTOM_PATH_VALUE = '__custom__';

/**
 * Validate a JSONPath expression (basic validation)
 */
function validateJsonPath(path: string): string | null {
  if (!path) return null; // Empty is valid (optional field)

  if (!path.startsWith('$')) {
    return 'JSONPath must start with $';
  }

  // Check for common syntax errors
  const invalidPatterns = [
    { pattern: /\.\.$/, message: 'Path cannot end with ..' },
    { pattern: /\[\]/, message: 'Empty brackets are not allowed' },
    { pattern: /\.$/, message: 'Path cannot end with .' },
  ];

  for (const { pattern, message } of invalidPatterns) {
    if (pattern.test(path)) {
      return message;
    }
  }

  return null;
}

/**
 * PathSelector component
 */
export function PathSelector({
  value,
  onChange,
  factName,
  label = 'Path',
  error,
  disabled = false,
  id,
}: PathSelectorProps): JSX.Element {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Get suggested paths for the current fact
  const suggestedPaths = useMemo(() => getSuggestedPaths(factName), [factName]);
  const canUseCustomPath = useMemo(() => allowsCustomPath(factName), [factName]);

  // Check if current value is a suggested path
  const isSuggestedPath = useMemo(
    () => suggestedPaths.some((p) => p.path === value),
    [suggestedPaths, value]
  );

  // Determine if we're in custom mode
  const showCustomInput = useMemo(() => {
    if (isCustomMode) return true;
    if (!value) return false;
    return !isSuggestedPath && value !== '';
  }, [isCustomMode, value, isSuggestedPath]);

  // Get selected path metadata
  const selectedPath = useMemo(
    () => suggestedPaths.find((p) => p.path === value),
    [suggestedPaths, value]
  );

  // Handle selection from dropdown
  const handleSelectChange = useCallback(
    (newValue: string) => {
      if (newValue === CUSTOM_PATH_VALUE) {
        setIsCustomMode(true);
        setCustomValue(value || '$.'); // Start with common prefix
      } else {
        setIsCustomMode(false);
        setCustomValue('');
        setLocalError(null);
        onChange(newValue);
      }
    },
    [value, onChange]
  );

  // Handle custom path input
  const handleCustomChange = useCallback(
    (newValue: string) => {
      setCustomValue(newValue);
      const validationError = validateJsonPath(newValue);
      setLocalError(validationError);
      onChange(newValue);
    },
    [onChange]
  );

  // Exit custom mode and clear
  const handleExitCustomMode = useCallback(() => {
    setIsCustomMode(false);
    setCustomValue('');
    setLocalError(null);
    // Select first suggested path or empty
    if (suggestedPaths.length > 0) {
      onChange(suggestedPaths[0].path);
    } else {
      onChange('');
    }
  }, [suggestedPaths, onChange]);

  const displayError = error || localError;
  const displayValue = showCustomInput ? CUSTOM_PATH_VALUE : value;

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <FieldTooltip
          title="JSONPath Expression"
          description="Select a path to extract a specific value from the fact result."
          hint="Choose from suggested paths or enter a custom path"
          example={
            <div className="space-y-1">
              <code>$.extension</code>
              <span className="text-foreground-muted"> - Get file extension</span>
              <br />
              <code>$.fileName</code>
              <span className="text-foreground-muted"> - Get file name</span>
            </div>
          }
          documentationUrl="/docs/jsonpath"
        />
      </div>

      {/* Dropdown or custom input */}
      {suggestedPaths.length > 0 ? (
        <>
          {/* Main selector */}
          <Select.Root
            value={displayValue}
            onValueChange={handleSelectChange}
            disabled={disabled}
          >
            <Select.Trigger
              id={id}
              aria-label={`${label}: ${value || 'Select a path'}`}
              className={`
                flex items-center justify-between w-full px-3 py-2 rounded-md
                bg-background border text-sm font-mono
                focus:outline-none focus:ring-2 focus:ring-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                ${displayError ? 'border-error' : 'border-border hover:border-border-hover'}
              `}
            >
              <Select.Value>
                {showCustomInput ? (
                  <span className="flex items-center gap-1.5">
                    <Pencil2Icon className="w-3.5 h-3.5 text-foreground-muted" />
                    <span className="text-foreground-muted">Custom path</span>
                  </span>
                ) : selectedPath ? (
                  <span>{selectedPath.path}</span>
                ) : (
                  <span className="text-foreground-muted">Select a path...</span>
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
                <Select.ScrollUpButton className="flex items-center justify-center h-6 cursor-default" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
                  <ChevronUpIcon className="w-4 h-4" />
                </Select.ScrollUpButton>

                <Select.Viewport className="p-1" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
                  {/* Suggested paths */}
                  <Select.Group>
                    <Select.Label className="px-2 py-1.5 text-xs font-medium text-foreground-muted uppercase tracking-wide">
                      Suggested Paths
                    </Select.Label>
                    {suggestedPaths.map((path) => (
                      <Select.Item
                        key={path.path}
                        value={path.path}
                        className="relative flex items-start gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none data-[highlighted]:bg-accent/50"
                      >
                        <Select.ItemIndicator className="absolute left-1 top-2">
                          <CheckIcon className="w-3.5 h-3.5 text-primary" />
                        </Select.ItemIndicator>
                        <div className="pl-5 min-w-0">
                          <Select.ItemText>
                            <span className="font-mono text-foreground">{path.path}</span>
                          </Select.ItemText>
                          <p className="text-xs text-foreground-muted">
                            {path.description}
                          </p>
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Group>

                  {/* Custom path option */}
                  {canUseCustomPath && (
                    <Select.Group>
                      <Select.Separator className="h-px my-1 bg-border" />
                      <Select.Item
                        value={CUSTOM_PATH_VALUE}
                        className="relative flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none data-[highlighted]:bg-accent/50"
                      >
                        <Select.ItemIndicator className="absolute left-1">
                          <CheckIcon className="w-3.5 h-3.5 text-primary" />
                        </Select.ItemIndicator>
                        <div className="pl-5 flex items-center gap-1.5">
                          <Pencil2Icon className="w-3.5 h-3.5 text-foreground-muted" />
                          <Select.ItemText>
                            <span className="text-foreground">Enter custom path...</span>
                          </Select.ItemText>
                        </div>
                      </Select.Item>
                    </Select.Group>
                  )}
                </Select.Viewport>

                <Select.ScrollDownButton className="flex items-center justify-center h-6 cursor-default" style={{ backgroundColor: 'var(--xfi-background-elevated)' }}>
                  <ChevronDownIcon className="w-4 h-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Custom path input (shown when in custom mode) */}
          {showCustomInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customValue || value}
                onChange={(e) => handleCustomChange(e.target.value)}
                disabled={disabled}
                placeholder="$.custom.path"
                className={`
                  flex-1 px-3 py-2 rounded-md bg-background border text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-accent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${displayError ? 'border-error' : 'border-border hover:border-border-hover'}
                `}
              />
              <button
                type="button"
                onClick={handleExitCustomMode}
                disabled={disabled}
                className="px-3 py-2 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                title="Use suggested path instead"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        /* Fallback to plain input if no suggested paths */
        <input
          type="text"
          id={id}
          value={value || ''}
          onChange={(e) => {
            const newValue = e.target.value;
            const validationError = validateJsonPath(newValue);
            setLocalError(validationError);
            onChange(newValue);
          }}
          disabled={disabled}
          placeholder="$.property.path"
          className={`
            w-full px-3 py-2 rounded-md bg-background border text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${displayError ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
        />
      )}

      {/* Hint */}
      <p className="text-xs text-foreground-muted">
        {selectedPath
          ? selectedPath.description
          : 'JSONPath to extract from fact result (e.g., $.fileName)'}
      </p>

      {/* Error message */}
      {displayError && (
        <p className="text-xs text-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
