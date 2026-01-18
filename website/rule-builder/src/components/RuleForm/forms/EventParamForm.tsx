/**
 * EventParamForm - Form for editing individual event parameters
 *
 * Renders a focused editor for specific event fields:
 * - type: Event type selector
 * - params.message: Message editor
 * - params.category: Category editor
 * - params.ruleId: Rule ID editor
 * - params.details: Details object editor
 * - Other nested params
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRuleStore } from '../../../store/ruleStore';
import { useValidation } from '../../../hooks';
import { FieldTooltip } from '../tooltips/FieldTooltip';
import { DEBOUNCE_DELAYS } from '../../../lib/utils/debounce';
import { getAtPath } from '../../../lib/utils/pathUtils';
import type { RuleEvent } from '../../../types';

export interface EventParamFormProps {
  /** Path to the event parameter */
  path: string[];
  /** The parameter data */
  data: unknown;
}

type EventType = 'warning' | 'fatality' | 'info';

interface EventTypeOption {
  value: EventType;
  label: string;
  description: string;
  color: string;
}

const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    value: 'warning',
    label: 'Warning',
    description: 'Non-blocking issue that should be addressed',
    color: 'text-warning',
  },
  {
    value: 'fatality',
    label: 'Fatality',
    description: 'Blocking issue that must be fixed',
    color: 'text-error',
  },
  {
    value: 'info',
    label: 'Info',
    description: 'Informational message for awareness',
    color: 'text-info',
  },
];

/**
 * Get the field name from the path (last segment after 'event')
 */
function getFieldName(path: string[]): string {
  // path is like ['event', 'type'] or ['event', 'params', 'message']
  if (path.length >= 2 && path[0] === 'event') {
    return path.slice(1).join('.');
  }
  return path.join('.');
}

/**
 * Event Type Editor
 */
function EventTypeEditor({
  value,
  onChange,
  error,
}: {
  value: EventType;
  onChange: (type: EventType) => void;
  error?: string;
}): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Event Type</label>
        <FieldTooltip
          title="Event Type"
          description="Determines the severity of the issue when this rule triggers."
          example={
            <div className="space-y-1">
              <div>
                <span className="text-warning">Warning:</span> Shows in results, doesn&apos;t
                fail
              </div>
              <div>
                <span className="text-error">Fatality:</span> Shows in results, causes failure
              </div>
              <div>
                <span className="text-info">Info:</span> Informational only
              </div>
            </div>
          }
        />
      </div>

      <div className="grid gap-2">
        {EVENT_TYPE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`
              flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
              ${
                value === option.value
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-hover'
              }
            `}
          >
            <input
              type="radio"
              name="event-type"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 w-4 h-4 text-accent focus:ring-accent"
            />
            <div>
              <span className={`text-sm font-medium ${option.color}`}>{option.label}</span>
              <p className="text-xs text-foreground-muted mt-0.5">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Message Editor
 */
function MessageEditor({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (message: string) => void;
  error?: string;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="event-message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <FieldTooltip
          title="Event Message"
          description="The message displayed when this rule triggers. Be clear and actionable."
          hint="Use {fact.property} placeholders for dynamic values"
          example="Found TODO comment that should be resolved"
        />
      </div>
      <textarea
        id="event-message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter the message to display..."
        rows={3}
        className={`
          w-full px-3 py-2 rounded-md bg-background border text-sm
          focus:outline-none focus:ring-2 focus:ring-accent resize-y
          ${error ? 'border-error' : 'border-border hover:border-border-hover'}
        `}
      />
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Text Field Editor (for category, ruleId, etc.)
 */
function TextFieldEditor({
  label,
  value,
  onChange,
  placeholder,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tooltip?: { title: string; description: string; example?: string };
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label} <span className="text-foreground-muted font-normal">(optional)</span>
        </label>
        {tooltip && (
          <FieldTooltip
            title={tooltip.title}
            description={tooltip.description}
            example={tooltip.example}
          />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover"
      />
    </div>
  );
}

/**
 * Params Container Info
 */
function ParamsContainerInfo(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Event Parameters</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Container for event configuration properties
        </p>
      </div>

      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-1">About Parameters</h4>
        <p className="text-xs text-foreground-muted">
          Event parameters configure the message and metadata when this rule fires. Click on
          individual parameters in the tree to edit them:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-foreground-muted">
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong>message</strong> - The text shown when the rule triggers
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong>category</strong> - Optional grouping for the rule
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong>ruleId</strong> - Optional unique identifier
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong>details</strong> - Additional metadata object
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Details Container Info
 */
function DetailsContainerInfo({ data }: { data: Record<string, unknown> }): JSX.Element {
  const entries = Object.entries(data);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Event Details</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Additional metadata for this event
        </p>
      </div>

      <div className="p-4 bg-background-secondary rounded-lg border border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Current Details</h4>
        {entries.length === 0 ? (
          <p className="text-xs text-foreground-muted">No details configured</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <span className="font-medium text-foreground-muted">{key}:</span>
                <span className="text-foreground">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <p className="text-xs text-foreground-muted">
          Click on individual detail properties in the tree to edit them, or use the JSON
          Editor for complex modifications.
        </p>
      </div>
    </div>
  );
}

/**
 * Generic Value Editor for unknown nested properties
 */
function GenericValueEditor({
  fieldName,
  value,
  onChange,
}: {
  fieldName: string;
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const [localValue, setLocalValue] = useState(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  );
  const isString = typeof value === 'string';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Try to parse as JSON if it was originally not a string
    if (!isString) {
      try {
        const parsed = JSON.parse(newValue);
        onChange(parsed);
      } catch {
        // Keep as string if not valid JSON
        onChange(newValue);
      }
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{fieldName}</label>
      {isString ? (
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover"
        />
      ) : (
        <textarea
          value={localValue}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
      )}
    </div>
  );
}

/**
 * Main EventParamForm component
 */
export function EventParamForm({ path, data }: EventParamFormProps): JSX.Element {
  const updateNode = useRuleStore((state) => state.updateNode);
  const rule = useRuleStore((state) => state.rule);
  const { getErrorMessage } = useValidation();

  const fieldName = getFieldName(path);

  // Debounce timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local state for debounced values
  const [localValue, setLocalValue] = useState(data);

  // Sync local state when data changes
  useEffect(() => {
    setLocalValue(data);
  }, [data]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Get the full event for context
  const event = rule?.event as RuleEvent | undefined;

  // Get error for this field
  const error = getErrorMessage(path);

  // Handle immediate updates (for selects)
  const handleImmediateUpdate = useCallback(
    (value: unknown) => {
      updateNode(path, value, 'form');
    },
    [path, updateNode]
  );

  // Handle debounced updates (for text inputs)
  const handleDebouncedUpdate = useCallback(
    (value: unknown) => {
      setLocalValue(value);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        updateNode(path, value, 'form');
        timerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [path, updateNode]
  );

  // Render appropriate editor based on field
  const renderEditor = (): JSX.Element => {
    // event.type
    if (fieldName === 'type') {
      return (
        <EventTypeEditor
          value={(localValue as EventType) || 'warning'}
          onChange={handleImmediateUpdate}
          error={error}
        />
      );
    }

    // event.params (container)
    if (fieldName === 'params') {
      return <ParamsContainerInfo />;
    }

    // event.params.message
    if (fieldName === 'params.message') {
      return (
        <MessageEditor
          value={(localValue as string) || ''}
          onChange={handleDebouncedUpdate}
          error={error}
        />
      );
    }

    // event.params.category
    if (fieldName === 'params.category') {
      return (
        <TextFieldEditor
          label="Category"
          value={(localValue as string) || ''}
          onChange={handleDebouncedUpdate}
          placeholder="e.g., code-quality"
          tooltip={{
            title: 'Event Category',
            description: 'Group related rules under a category for better organization.',
            example: 'code-quality, security, performance',
          }}
        />
      );
    }

    // event.params.ruleId
    if (fieldName === 'params.ruleId') {
      return (
        <TextFieldEditor
          label="Rule ID"
          value={(localValue as string) || ''}
          onChange={handleDebouncedUpdate}
          placeholder="e.g., XFI-001"
          tooltip={{
            title: 'Rule ID',
            description: 'Optional unique identifier for this rule in reporting.',
          }}
        />
      );
    }

    // event.params.details (container)
    if (fieldName === 'params.details') {
      return <DetailsContainerInfo data={(data as Record<string, unknown>) || {}} />;
    }

    // Nested detail properties or other unknown fields
    const lastSegment = path[path.length - 1] || fieldName;
    return (
      <GenericValueEditor
        fieldName={lastSegment}
        value={localValue}
        onChange={handleDebouncedUpdate}
      />
    );
  };

  // Get header info based on field type
  const getHeaderInfo = (): { title: string; description: string } => {
    switch (fieldName) {
      case 'type':
        return {
          title: 'Event Type',
          description: 'Configure the severity level of this rule',
        };
      case 'params':
        return {
          title: 'Event Parameters',
          description: 'Container for event configuration',
        };
      case 'params.message':
        return {
          title: 'Event Message',
          description: 'The message shown when this rule triggers',
        };
      case 'params.category':
        return {
          title: 'Event Category',
          description: 'Optional category for grouping rules',
        };
      case 'params.ruleId':
        return {
          title: 'Rule ID',
          description: 'Optional unique identifier for reporting',
        };
      case 'params.details':
        return {
          title: 'Event Details',
          description: 'Additional metadata for this event',
        };
      default:
        return {
          title: `Edit: ${lastSegment(path)}`,
          description: 'Edit this event property',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">{headerInfo.title}</h3>
        <p className="text-sm text-foreground-muted mt-1">{headerInfo.description}</p>
      </div>

      {/* Editor */}
      {renderEditor()}

      {/* Preview (for type field) */}
      {fieldName === 'type' && event && (
        <div
          className={`p-4 rounded-lg border ${
            event.type === 'fatality'
              ? 'bg-error/10 border-error/20'
              : event.type === 'warning'
                ? 'bg-warning/10 border-warning/20'
                : 'bg-info/10 border-info/20'
          }`}
        >
          <h4
            className={`text-sm font-medium mb-1 ${
              event.type === 'fatality'
                ? 'text-error'
                : event.type === 'warning'
                  ? 'text-warning'
                  : 'text-info'
            }`}
          >
            {event.type === 'fatality'
              ? '✕ Fatality'
              : event.type === 'warning'
                ? '⚠ Warning'
                : 'ℹ Info'}
          </h4>
          <p className="text-sm text-foreground">{event.params?.message || '(no message)'}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to get last segment of path
 */
function lastSegment(path: string[]): string {
  return path[path.length - 1] || 'value';
}
