/**
 * TemplateSearch Component
 *
 * Search input for filtering templates by name, description, and tags.
 */

import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useCallback, useState, useEffect, useRef } from 'react';
import { debounce } from '../../lib/utils/debounce';

interface TemplateSearchProps {
  /** Current search value */
  value: string;

  /** Called when search value changes */
  onChange: (value: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Number of filtered results */
  resultCount?: number;

  /** Total number of templates */
  totalCount?: number;
}

export function TemplateSearch({
  value,
  onChange,
  placeholder = 'Search templates...',
  resultCount,
  totalCount,
}: TemplateSearchProps): JSX.Element {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange to avoid too many updates
  const debouncedOnChange = useCallback(
    debounce((newValue: unknown) => {
      if (typeof newValue === 'string') {
        onChange(newValue);
      }
    }, 200),
    [onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      debouncedOnChange(newValue);
    },
    [debouncedOnChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && localValue) {
        handleClear();
      }
    },
    [localValue, handleClear]
  );

  return (
    <div className="relative">
      {/* Search icon */}
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-20 py-2.5 rounded-lg bg-background-secondary border border-border text-foreground placeholder:text-foreground-muted focus-ring text-sm"
        aria-label="Search templates"
      />

      {/* Right side: Clear button and/or result count */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Clear button */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-background-tertiary transition-colors"
            aria-label="Clear search"
          >
            <Cross2Icon className="w-3.5 h-3.5 text-foreground-muted" />
          </button>
        )}

        {/* Result count */}
        {resultCount !== undefined && totalCount !== undefined && (
          <span className="text-xs text-foreground-muted tabular-nums">
            {resultCount}/{totalCount}
          </span>
        )}
      </div>
    </div>
  );
}

export default TemplateSearch;
