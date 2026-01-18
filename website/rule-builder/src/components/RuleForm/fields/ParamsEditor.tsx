/**
 * ParamsEditor - Editor for fact parameters
 *
 * Provides a UI for editing the optional params object
 * that can be passed to facts when evaluating conditions.
 */

import { useState, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { getFactByName } from '../data/factCatalog';
import type { FactParameter } from '../data/factCatalog';
import { FieldTooltip } from '../tooltips/FieldTooltip';

export interface ParamsEditorProps {
  /** Current params object */
  value: Record<string, unknown>;
  /** Called when params change */
  onChange: (params: Record<string, unknown>) => void;
  /** Currently selected fact (for parameter hints) */
  selectedFact?: string;
  /** Label for the field */
  label?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
}

/**
 * Determine the value type for display
 */
function getValueType(value: unknown, paramDef?: FactParameter): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  // Use paramDef type if available
  if (paramDef?.type) {
    const type = paramDef.type.toLowerCase();
    if (type.includes('array') || type.includes('[]')) return 'array';
    if (type.includes('object')) return 'object';
    if (type.includes('boolean') || type.includes('bool')) return 'boolean';
    if (type.includes('number') || type.includes('int') || type.includes('float')) return 'number';
  }
  
  // Infer from value
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

/**
 * Array value editor for parameters
 * Provides a list-based UI where each array item can be edited individually
 */
function ArrayValueEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: unknown[];
  onChange: (value: unknown[]) => void;
  disabled?: boolean;
  placeholder?: string;
}): JSX.Element {
  // Determine if this is an array of complex objects or simple values
  const isComplexArray = value.some(item => typeof item === 'object' && item !== null);
  
  // For complex arrays, fall back to JSON editor
  if (isComplexArray) {
    return (
      <ComplexArrayEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  // Handle adding a new item
  const handleAddItem = useCallback(() => {
    onChange([...value, '']);
  }, [value, onChange]);

  // Handle updating an item
  const handleUpdateItem = useCallback(
    (index: number, newValue: string) => {
      const updated = [...value];
      updated[index] = newValue;
      onChange(updated);
    },
    [value, onChange]
  );

  // Handle removing an item
  const handleRemoveItem = useCallback(
    (index: number) => {
      const updated = value.filter((_, i) => i !== index);
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div className="space-y-2 w-full overflow-hidden">
      {/* List of items */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-2 w-full">
              <span className="text-xs text-foreground-muted w-5 text-right flex-shrink-0">{index + 1}.</span>
              <input
                type="text"
                value={String(item)}
                onChange={(e) => handleUpdateItem(index, e.target.value)}
                disabled={disabled}
                placeholder={placeholder || 'Enter value'}
                className="flex-1 min-w-0 px-2 py-1 text-sm font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                disabled={disabled}
                className="p-1 text-foreground-muted hover:text-error rounded hover:bg-error/10 transition-colors flex-shrink-0"
                aria-label={`Remove item ${index + 1}`}
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {value.length === 0 && (
        <p className="text-xs text-foreground-muted text-center py-1">
          No items. Click "Add Item" to start.
        </p>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={handleAddItem}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background-lighter border border-border rounded hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        <PlusIcon className="w-3 h-3" />
        Add Item
      </button>
    </div>
  );
}

/**
 * Complex array editor for arrays of objects (uses JSON textarea)
 */
function ComplexArrayEditor({
  value,
  onChange,
  disabled,
}: {
  value: unknown[];
  onChange: (value: unknown[]) => void;
  disabled?: boolean;
}): JSX.Element {
  const [localValue, setLocalValue] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = useCallback(
    (inputValue: string) => {
      setLocalValue(inputValue);
      try {
        const parsed = JSON.parse(inputValue);
        if (Array.isArray(parsed)) {
          onChange(parsed);
          setParseError(null);
        } else {
          setParseError('Must be a JSON array');
        }
      } catch {
        setParseError('Invalid JSON');
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-1">
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder='[{"key": "value"}]'
        className={`
          w-full px-2 py-1.5 text-sm font-mono bg-background border rounded resize-y
          focus:outline-none focus:ring-1 focus:ring-accent
          ${parseError ? 'border-error' : 'border-border'}
        `}
      />
      {parseError && <p className="text-xs text-error">{parseError}</p>}
      <p className="text-xs text-foreground-muted">JSON array of objects</p>
    </div>
  );
}

/**
 * Object value editor for parameters
 */
function ObjectValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
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
      } catch {
        setParseError('Invalid JSON');
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-1">
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder='{"key": "value"}'
        className={`
          w-full px-2 py-1.5 text-sm font-mono bg-background border rounded resize-y
          focus:outline-none focus:ring-1 focus:ring-accent
          ${parseError ? 'border-error' : 'border-border'}
        `}
      />
      {parseError && <p className="text-xs text-error">{parseError}</p>}
    </div>
  );
}

/**
 * Single parameter row component
 */
function ParamRow({
  name,
  value,
  paramDef,
  onNameChange,
  onValueChange,
  onDelete,
  disabled,
  isNew,
}: {
  name: string;
  value: unknown;
  paramDef?: FactParameter;
  onNameChange: (newName: string) => void;
  onValueChange: (newValue: unknown) => void;
  onDelete: () => void;
  disabled?: boolean;
  isNew?: boolean;
}): JSX.Element {
  const valueType = getValueType(value, paramDef);
  
  const [localValue, setLocalValue] = useState(() => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value ?? '');
  });

  const handleStringValueChange = useCallback(
    (inputValue: string) => {
      setLocalValue(inputValue);

      // Try to parse as JSON if it looks like JSON
      if (inputValue.startsWith('{') || inputValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(inputValue);
          onValueChange(parsed);
          return;
        } catch {
          // Fall through to string
        }
      }

      // Try to parse as number
      if (/^-?\d+(\.\d+)?$/.test(inputValue)) {
        onValueChange(parseFloat(inputValue));
        return;
      }

      // Try to parse as boolean
      if (inputValue === 'true') {
        onValueChange(true);
        return;
      }
      if (inputValue === 'false') {
        onValueChange(false);
        return;
      }

      // Default to string
      onValueChange(inputValue);
    },
    [onValueChange]
  );

  // Render value editor based on type
  const renderValueEditor = () => {
    switch (valueType) {
      case 'array':
        return (
          <ArrayValueEditor
            value={Array.isArray(value) ? value : []}
            onChange={onValueChange}
            disabled={disabled}
            placeholder={paramDef?.example ? String(paramDef.example) : undefined}
          />
        );
      
      case 'object':
        return (
          <ObjectValueEditor
            value={typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}}
            onChange={onValueChange}
            disabled={disabled}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={value === true}
                onChange={() => onValueChange(true)}
                disabled={disabled}
                className="w-3.5 h-3.5 text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">true</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={value === false}
                onChange={() => onValueChange(false)}
                disabled={disabled}
                className="w-3.5 h-3.5 text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">false</span>
            </label>
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={typeof value === 'number' ? value : 0}
            onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            placeholder={paramDef?.example ? String(paramDef.example) : 'Value'}
            className="w-full px-2 py-1.5 text-sm font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleStringValueChange(e.target.value)}
            disabled={disabled}
            placeholder={paramDef?.example ? String(paramDef.example) : 'Value'}
            className="w-full px-2 py-1.5 text-sm font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        );
    }
  };

  return (
    <div className="flex items-start gap-2">
      {/* Parameter name */}
      <div className="flex-1 min-w-0">
        {isNew ? (
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={disabled}
            placeholder="Parameter name"
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm text-foreground">{name}</span>
            {paramDef && (
              <span className="text-xs text-foreground-muted">
                ({paramDef.type}{paramDef.required ? ', required' : ''})
              </span>
            )}
          </div>
        )}
        {paramDef?.description && (
          <p className="text-xs text-foreground-muted mt-0.5">{paramDef.description}</p>
        )}
        {/* Type indicator when no paramDef */}
        {!paramDef && valueType !== 'string' && (
          <span className="text-xs text-foreground-muted">({valueType})</span>
        )}
      </div>

      {/* Parameter value */}
      <div className="flex-1 min-w-0">
        {renderValueEditor()}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="p-1.5 text-foreground-muted hover:text-error rounded hover:bg-error/10 transition-colors"
        aria-label="Delete parameter"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * ParamsEditor component
 */
export function ParamsEditor({
  value,
  onChange,
  selectedFact,
  label = 'Parameters',
  disabled = false,
}: ParamsEditorProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(Object.keys(value || {}).length > 0);
  const [newParamName, setNewParamName] = useState('');

  // Get fact metadata for parameter hints
  const factMetadata = useMemo(
    () => (selectedFact ? getFactByName(selectedFact) : undefined),
    [selectedFact]
  );

  // Get known parameters from fact metadata
  const knownParams = useMemo(() => {
    return factMetadata?.parameters || [];
  }, [factMetadata]);

  // Get map of known param definitions by name
  const paramDefMap = useMemo(() => {
    const map = new Map<string, FactParameter>();
    for (const param of knownParams) {
      map.set(param.name, param);
    }
    return map;
  }, [knownParams]);

  // Get current param entries
  const paramEntries = useMemo(() => {
    return Object.entries(value || {});
  }, [value]);

  const handleParamChange = useCallback(
    (paramName: string, paramValue: unknown) => {
      const newParams = { ...value, [paramName]: paramValue };
      onChange(newParams);
    },
    [value, onChange]
  );

  const handleParamDelete = useCallback(
    (paramName: string) => {
      const newParams = { ...value };
      delete newParams[paramName];
      onChange(newParams);
    },
    [value, onChange]
  );

  const handleParamRename = useCallback(
    (oldName: string, newName: string) => {
      if (!newName || newName === oldName) return;

      const newParams: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value || {})) {
        if (key === oldName) {
          newParams[newName] = val;
        } else {
          newParams[key] = val;
        }
      }
      onChange(newParams);
    },
    [value, onChange]
  );

  const handleAddParam = useCallback(() => {
    const paramName = newParamName.trim();
    if (!paramName || value[paramName] !== undefined) return;

    const newParams = { ...value, [paramName]: '' };
    onChange(newParams);
    setNewParamName('');
  }, [newParamName, value, onChange]);

  const handleAddKnownParam = useCallback(
    (param: FactParameter) => {
      if (value[param.name] !== undefined) return;

      // Determine default value based on type
      let defaultValue: unknown;
      if (param.default !== undefined) {
        defaultValue = param.default;
      } else {
        // Use type-appropriate defaults
        switch (param.type) {
          case 'array':
            defaultValue = [];
            break;
          case 'object':
            defaultValue = {};
            break;
          case 'boolean':
            defaultValue = false;
            break;
          case 'number':
            defaultValue = 0;
            break;
          default:
            defaultValue = '';
        }
      }
      const newParams = { ...value, [param.name]: defaultValue };
      onChange(newParams);
    },
    [value, onChange]
  );

  // Get suggested parameters that aren't already added
  const suggestedParams = useMemo(() => {
    return knownParams.filter((p) => value[p.name] === undefined);
  }, [knownParams, value]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          {label}
          <span className="text-xs text-foreground-muted font-normal">
            ({paramEntries.length} {paramEntries.length === 1 ? 'param' : 'params'})
          </span>
        </button>
        <FieldTooltip
          title="Fact Parameters"
          description="Optional parameters to pass when evaluating the fact. These can customize how the fact collects data."
          hint="Check the fact documentation for available parameters"
        />
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 bg-background rounded-lg border border-border space-y-3">
          {/* Existing parameters */}
          {paramEntries.length > 0 && (
            <div className="space-y-2">
              {paramEntries.map(([paramName, paramValue]) => (
                <ParamRow
                  key={paramName}
                  name={paramName}
                  value={paramValue}
                  paramDef={paramDefMap.get(paramName)}
                  onNameChange={(newName) => handleParamRename(paramName, newName)}
                  onValueChange={(newValue) => handleParamChange(paramName, newValue)}
                  onDelete={() => handleParamDelete(paramName)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {paramEntries.length === 0 && (
            <p className="text-sm text-foreground-muted text-center py-2">
              No parameters set
            </p>
          )}

          {/* Suggested parameters from fact metadata */}
          {suggestedParams.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-foreground-muted mb-2">
                Suggested parameters:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedParams.map((param) => (
                  <button
                    key={param.name}
                    type="button"
                    onClick={() => handleAddKnownParam(param)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background-lighter border border-border rounded hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span className="font-mono">{param.name}</span>
                    {param.required && (
                      <span className="text-warning">*</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add custom parameter */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParam();
                  }
                }}
                disabled={disabled}
                placeholder="Custom parameter name"
                className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={handleAddParam}
                disabled={disabled || !newParamName.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
