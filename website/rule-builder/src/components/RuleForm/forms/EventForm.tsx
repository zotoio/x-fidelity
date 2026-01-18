/**
 * EventForm - Form for editing rule events
 *
 * Allows configuration of:
 * - Event type (warning, fatality, info)
 * - Event message
 * - Additional event parameters
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRuleStore } from '../../../store/ruleStore';
import { useValidation } from '../../../hooks';
import { FieldTooltip } from '../tooltips/FieldTooltip';
import type { RuleEvent } from '../../../types';
import { DEBOUNCE_DELAYS } from '../../../lib/utils/debounce';

export interface EventFormProps {
  /** Path to the event */
  path: string[];
  /** The event data */
  data: RuleEvent;
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
 * EventForm component
 */
export function EventForm({
  path,
  data,
}: EventFormProps): JSX.Element {
  const updateNode = useRuleStore((state) => state.updateNode);
  const { getErrorMessage } = useValidation();

  // Local state for debounced updates
  const [localType, setLocalType] = useState<EventType>(data.type);
  const [localMessage, setLocalMessage] = useState(data.params.message);
  const [localCategory, setLocalCategory] = useState(data.params.category || '');
  const [localRuleId, setLocalRuleId] = useState(data.params.ruleId || '');

  // Debounce timer refs
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ruleIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when data changes from external source
  const lastExternalDataRef = useRef(data);
  useEffect(() => {
    if (data !== lastExternalDataRef.current) {
      setLocalType(data.type);
      setLocalMessage(data.params.message);
      setLocalCategory(data.params.category || '');
      setLocalRuleId(data.params.ruleId || '');
      lastExternalDataRef.current = data;
    }
  }, [data]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (categoryTimerRef.current) clearTimeout(categoryTimerRef.current);
      if (ruleIdTimerRef.current) clearTimeout(ruleIdTimerRef.current);
    };
  }, []);

  // Get validation errors
  const typeError = getErrorMessage([...path, 'type']);
  const messageError = getErrorMessage([...path, 'params', 'message']);

  // Handle type change (immediate)
  const handleTypeChange = useCallback(
    (type: EventType) => {
      setLocalType(type);
      updateNode(path, { ...data, type }, 'form');
    },
    [data, path, updateNode]
  );

  // Handle message change (debounced)
  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const message = e.target.value;
      setLocalMessage(message);

      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }

      messageTimerRef.current = setTimeout(() => {
        const updatedEvent = {
          ...data,
          params: { ...data.params, message },
        };
        updateNode(path, updatedEvent, 'form');
        messageTimerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [data, path, updateNode]
  );

  // Handle category change (debounced)
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const category = e.target.value;
      setLocalCategory(category);

      if (categoryTimerRef.current) {
        clearTimeout(categoryTimerRef.current);
      }

      categoryTimerRef.current = setTimeout(() => {
        const newParams = { ...data.params };
        if (category) {
          newParams.category = category;
        } else {
          delete newParams.category;
        }
        const updatedEvent = { ...data, params: newParams };
        updateNode(path, updatedEvent, 'form');
        categoryTimerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [data, path, updateNode]
  );

  // Handle ruleId change (debounced)
  const handleRuleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const ruleId = e.target.value;
      setLocalRuleId(ruleId);

      if (ruleIdTimerRef.current) {
        clearTimeout(ruleIdTimerRef.current);
      }

      ruleIdTimerRef.current = setTimeout(() => {
        const newParams = { ...data.params };
        if (ruleId) {
          newParams.ruleId = ruleId;
        } else {
          delete newParams.ruleId;
        }
        const updatedEvent = { ...data, params: newParams };
        updateNode(path, updatedEvent, 'form');
        ruleIdTimerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [data, path, updateNode]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Event Configuration</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Configure what happens when this rule matches
        </p>
      </div>

      {/* Event type selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Event Type
          </label>
          <FieldTooltip
            title="Event Type"
            description="Determines the severity of the issue when this rule triggers."
            example={
              <div className="space-y-1">
                <div><span className="text-warning">Warning:</span> Shows in results, doesn&apos;t fail</div>
                <div><span className="text-error">Fatality:</span> Shows in results, causes failure</div>
                <div><span className="text-info">Info:</span> Informational only</div>
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
                ${localType === option.value
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-hover'
                }
              `}
            >
              <input
                type="radio"
                name="event-type"
                value={option.value}
                checked={localType === option.value}
                onChange={() => handleTypeChange(option.value)}
                className="mt-0.5 w-4 h-4 text-accent focus:ring-accent"
              />
              <div>
                <span className={`text-sm font-medium ${option.color}`}>
                  {option.label}
                </span>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
        {typeError && (
          <p className="text-xs text-error" role="alert">
            {typeError}
          </p>
        )}
      </div>

      {/* Message field */}
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
          value={localMessage}
          onChange={handleMessageChange}
          placeholder="Enter the message to display..."
          rows={3}
          className={`
            w-full px-3 py-2 rounded-md bg-background border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent resize-y
            ${messageError ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
        />
        {messageError && (
          <p className="text-xs text-error" role="alert">
            {messageError}
          </p>
        )}
      </div>

      {/* Category field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="event-category" className="text-sm font-medium text-foreground">
            Category <span className="text-foreground-muted font-normal">(optional)</span>
          </label>
          <FieldTooltip
            title="Event Category"
            description="Group related rules under a category for better organization."
            example="code-quality, security, performance"
          />
        </div>
        <input
          type="text"
          id="event-category"
          value={localCategory}
          onChange={handleCategoryChange}
          placeholder="e.g., code-quality"
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover"
        />
      </div>

      {/* Rule ID field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="event-rule-id" className="text-sm font-medium text-foreground">
            Rule ID <span className="text-foreground-muted font-normal">(optional)</span>
          </label>
          <FieldTooltip
            title="Rule ID"
            description="Optional unique identifier for this rule in reporting."
            hint="If not set, uses the rule name"
          />
        </div>
        <input
          type="text"
          id="event-rule-id"
          value={localRuleId}
          onChange={handleRuleIdChange}
          placeholder="e.g., XFI-001"
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover"
        />
      </div>

      {/* Preview */}
      <div className={`p-4 rounded-lg border ${
        localType === 'fatality' 
          ? 'bg-error/10 border-error/20' 
          : localType === 'warning'
            ? 'bg-warning/10 border-warning/20'
            : 'bg-info/10 border-info/20'
      }`}>
        <h4 className={`text-sm font-medium mb-1 ${
          localType === 'fatality' ? 'text-error' : localType === 'warning' ? 'text-warning' : 'text-info'
        }`}>
          {localType === 'fatality' ? '✕ Fatality' : localType === 'warning' ? '⚠ Warning' : 'ℹ Info'}
        </h4>
        <p className="text-sm text-foreground">
          {localMessage || '(no message)'}
        </p>
        {localCategory && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-background rounded">
            {localCategory}
          </span>
        )}
      </div>
    </div>
  );
}
