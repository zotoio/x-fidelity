/**
 * ValueEditor - Type-aware value input
 *
 * Renders the appropriate input type based on the operator's
 * expected value type (string, number, boolean, array, object).
 */

import { useState, useCallback, useMemo } from 'react';
import { getOperatorByName } from '../data/operatorCatalog';
import type { ConditionOperator } from '../../../types';
import type { OperatorValueType } from '../data/operatorCatalog';
import { FieldTooltip } from '../tooltips/FieldTooltip';

export interface ValueEditorProps {
  /** Current value */
  value: unknown;
  /** Called when value changes */
  onChange: (value: unknown) => void;
  /** Currently selected operator (for type hints) */
  operator?: ConditionOperator;
  /** Override the value type */
  valueType?: OperatorValueType;
  /** Label for the field */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** ID for accessibility */
  id?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Infer value type from operator or value itself
 */
function inferValueType(
  value: unknown,
  operator?: ConditionOperator,
  overrideType?: OperatorValueType
): OperatorValueType {
  if (overrideType) return overrideType;

  // Check operator metadata
  if (operator) {
    const opMeta = getOperatorByName(operator);
    if (opMeta && opMeta.valueType !== 'any') {
      return opMeta.valueType;
    }
  }

  // Infer from value
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

/**
 * StringInput component
 */
function StringInput({
  value,
  onChange,
  disabled,
  id,
  error,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <input
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 rounded-md bg-background border text-sm
        focus:outline-none focus:ring-2 focus:ring-accent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-error' : 'border-border hover:border-border-hover'}
      `}
    />
  );
}

/**
 * NumberInput component
 */
function NumberInput({
  value,
  onChange,
  disabled,
  id,
  error,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <input
      type="number"
      id={id}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      disabled={disabled}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 rounded-md bg-background border text-sm
        focus:outline-none focus:ring-2 focus:ring-accent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-error' : 'border-border hover:border-border-hover'}
      `}
    />
  );
}

/**
 * BooleanInput component
 */
function BooleanInput({
  value,
  onChange,
  disabled,
  id,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  id?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={id}
          checked={value === true}
          onChange={() => onChange(true)}
          disabled={disabled}
          className="w-4 h-4 text-accent focus:ring-accent"
        />
        <span className="text-sm text-foreground">true</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={id}
          checked={value === false}
          onChange={() => onChange(false)}
          disabled={disabled}
          className="w-4 h-4 text-accent focus:ring-accent"
        />
        <span className="text-sm text-foreground">false</span>
      </label>
    </div>
  );
}

/**
 * ArrayInput component - comma-separated values
 */
function ArrayInput({
  value,
  onChange,
  disabled,
  id,
  error,
  placeholder,
}: {
  value: unknown[];
  onChange: (value: unknown[]) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  placeholder?: string;
}): JSX.Element {
  const [localValue, setLocalValue] = useState(value.join(', '));

  const handleChange = useCallback(
    (inputValue: string) => {
      setLocalValue(inputValue);
      // Parse comma-separated values
      const parsed = inputValue
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v !== '');
      onChange(parsed);
    },
    [onChange]
  );

  return (
    <div className="space-y-1">
      <input
        type="text"
        id={id}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || 'Comma-separated values'}
        className={`
          w-full px-3 py-2 rounded-md bg-background border text-sm
          focus:outline-none focus:ring-2 focus:ring-accent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-error' : 'border-border hover:border-border-hover'}
        `}
      />
      <p className="text-xs text-foreground-muted">
        Enter values separated by commas
      </p>
    </div>
  );
}

/**
 * ObjectInput component - JSON editor
 */
function ObjectInput({
  value,
  onChange,
  disabled,
  id,
  error,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
}): JSX.Element {
  const [localValue, setLocalValue] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = useCallback(
    (inputValue: string) => {
      setLocalValue(inputValue);
      try {
        const parsed = JSON.parse(inputValue);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          onChange(parsed);
          setParseError(null);
        } else {
          setParseError('Must be a JSON object');
        }
      } catch (e) {
        setParseError('Invalid JSON');
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-1">
      <textarea
        id={id}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className={`
          w-full px-3 py-2 rounded-md bg-background border text-sm font-mono
          focus:outline-none focus:ring-2 focus:ring-accent
          disabled:opacity-50 disabled:cursor-not-allowed resize-y
          ${error || parseError ? 'border-error' : 'border-border hover:border-border-hover'}
        `}
      />
      {parseError && (
        <p className="text-xs text-error">{parseError}</p>
      )}
    </div>
  );
}

/**
 * ValueEditor component
 */
export function ValueEditor({
  value,
  onChange,
  operator,
  valueType,
  label = 'Value',
  error,
  disabled = false,
  id,
  placeholder,
}: ValueEditorProps): JSX.Element {
  // Determine the value type
  const inferredType = useMemo(
    () => inferValueType(value, operator, valueType),
    [value, operator, valueType]
  );

  // Get tooltip content based on type
  const tooltipDescription = useMemo(() => {
    switch (inferredType) {
      case 'string':
        return 'Enter a text value to compare against the fact result';
      case 'number':
        return 'Enter a numeric value for comparison';
      case 'boolean':
        return 'Select true or false';
      case 'array':
        return 'Enter multiple values separated by commas';
      case 'object':
        return 'Enter a JSON object for complex comparisons';
      default:
        return 'Enter the value to compare against';
    }
  }, [inferredType]);

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <FieldTooltip
          title="Value"
          description={tooltipDescription}
          hint={`Expected type: ${inferredType}`}
        />
      </div>

      {/* Render appropriate input based on type */}
      {inferredType === 'boolean' ? (
        <BooleanInput
          value={Boolean(value)}
          onChange={onChange}
          disabled={disabled}
          id={id}
        />
      ) : inferredType === 'number' ? (
        <NumberInput
          value={typeof value === 'number' ? value : 0}
          onChange={onChange}
          disabled={disabled}
          id={id}
          error={error}
          placeholder={placeholder}
        />
      ) : inferredType === 'array' ? (
        <ArrayInput
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          id={id}
          error={error}
          placeholder={placeholder}
        />
      ) : inferredType === 'object' ? (
        <ObjectInput
          value={typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}}
          onChange={onChange}
          disabled={disabled}
          id={id}
          error={error}
        />
      ) : (
        <StringInput
          value={String(value ?? '')}
          onChange={onChange}
          disabled={disabled}
          id={id}
          error={error}
          placeholder={placeholder}
        />
      )}

      {/* Error message */}
      {error && inferredType !== 'object' && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
