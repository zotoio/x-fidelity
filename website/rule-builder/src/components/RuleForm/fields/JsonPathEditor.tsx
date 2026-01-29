/**
 * JsonPathEditor - Input for JSON path expressions
 *
 * Provides a specialized input for entering JSONPath expressions
 * with syntax hints and validation.
 */

import { useState, useCallback } from 'react';
import { FieldTooltip } from '../tooltips/FieldTooltip';

export interface JsonPathEditorProps {
  /** Current path value */
  value: string;
  /** Called when path changes */
  onChange: (path: string) => void;
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
 * JsonPathEditor component
 */
export function JsonPathEditor({
  value,
  onChange,
  label = 'Path',
  error,
  disabled = false,
  id,
}: JsonPathEditorProps): JSX.Element {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      const validationError = validateJsonPath(newValue);
      setLocalError(validationError);
    },
    [onChange]
  );

  const displayError = error || localError;

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <FieldTooltip
          title="JSONPath Expression"
          description="Extract a specific value from the fact result using JSONPath syntax."
          hint="Optional - leave empty to use the entire fact result"
          example={
            <div className="space-y-1">
              <code>$.fileName</code>
              <span className="text-foreground-muted"> - Get fileName property</span>
              <br />
              <code>$.dependencies[*]</code>
              <span className="text-foreground-muted"> - Get all dependencies</span>
              <br />
              <code>$.data[0].name</code>
              <span className="text-foreground-muted"> - Get first item&apos;s name</span>
            </div>
          }
          documentationUrl="/docs/jsonpath"
        />
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          id={id}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          placeholder="$.property.path"
          className={`
            w-full px-3 py-2 rounded-md bg-background border text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${displayError ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
        />
      </div>

      {/* Hint */}
      <p className="text-xs text-foreground-muted">
        JSONPath to extract from fact result (e.g., $.fileName)
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
