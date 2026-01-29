/**
 * ConditionForm - Form for editing individual conditions
 *
 * Provides fields for:
 * - Fact selection
 * - Operator selection
 * - Value input
 * - JSONPath (optional)
 * - Parameters (optional)
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRuleStore } from '../../../store/ruleStore';
import { useValidation } from '../../../hooks';
import { FactSelector } from '../fields/FactSelector';
import { OperatorSelector } from '../fields/OperatorSelector';
import { ValueEditor } from '../fields/ValueEditor';
import { PathSelector } from '../fields/PathSelector';
import { ParamsEditor } from '../fields/ParamsEditor';
import type { RuleCondition, ConditionOperator } from '../../../types';
import { DEBOUNCE_DELAYS } from '../../../lib/utils/debounce';

export interface ConditionFormProps {
  /** Path to the condition */
  path: string[];
  /** The condition data */
  data: RuleCondition;
}

/**
 * ConditionForm component
 */
export function ConditionForm({
  path,
  data,
}: ConditionFormProps): JSX.Element {
  const updateNode = useRuleStore((state) => state.updateNode);
  const { getErrorMessage } = useValidation();

  // Local state for debounced updates
  const [localFact, setLocalFact] = useState(data.fact);
  const [localOperator, setLocalOperator] = useState(data.operator);
  const [localValue, setLocalValue] = useState(data.value);
  const [localPath, setLocalPath] = useState(data.path || '');
  const [localParams, setLocalParams] = useState(data.params || {});

  // Debounce timer refs
  const valueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when data changes from external source
  const lastExternalDataRef = useRef(data);
  useEffect(() => {
    if (data !== lastExternalDataRef.current) {
      setLocalFact(data.fact);
      setLocalOperator(data.operator);
      setLocalValue(data.value);
      setLocalPath(data.path || '');
      setLocalParams(data.params || {});
      lastExternalDataRef.current = data;
    }
  }, [data]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (valueTimerRef.current) clearTimeout(valueTimerRef.current);
      if (pathTimerRef.current) clearTimeout(pathTimerRef.current);
    };
  }, []);

  // Get validation errors
  const factError = getErrorMessage([...path, 'fact']);
  const operatorError = getErrorMessage([...path, 'operator']);
  const valueError = getErrorMessage([...path, 'value']);
  const pathError = getErrorMessage([...path, 'path']);

  // Update entire condition immediately for select changes
  const handleFactChange = useCallback(
    (fact: string) => {
      setLocalFact(fact);
      updateNode(path, { ...data, fact }, 'form');
    },
    [data, path, updateNode]
  );

  const handleOperatorChange = useCallback(
    (operator: ConditionOperator) => {
      setLocalOperator(operator);
      updateNode(path, { ...data, operator }, 'form');
    },
    [data, path, updateNode]
  );

  // Debounced value update
  const handleValueChange = useCallback(
    (value: unknown) => {
      setLocalValue(value);

      if (valueTimerRef.current) {
        clearTimeout(valueTimerRef.current);
      }

      valueTimerRef.current = setTimeout(() => {
        updateNode(path, { ...data, value }, 'form');
        valueTimerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [data, path, updateNode]
  );

  // Debounced path update
  const handlePathChange = useCallback(
    (jsonPath: string) => {
      setLocalPath(jsonPath);

      if (pathTimerRef.current) {
        clearTimeout(pathTimerRef.current);
      }

      pathTimerRef.current = setTimeout(() => {
        const updatedCondition = { ...data };
        if (jsonPath) {
          updatedCondition.path = jsonPath;
        } else {
          delete updatedCondition.path;
        }
        updateNode(path, updatedCondition, 'form');
        pathTimerRef.current = null;
      }, DEBOUNCE_DELAYS.FORM_CHANGE);
    },
    [data, path, updateNode]
  );

  // Immediate params update (already debounced in ParamsEditor)
  const handleParamsChange = useCallback(
    (params: Record<string, unknown>) => {
      setLocalParams(params);
      const updatedCondition = { ...data };
      if (Object.keys(params).length > 0) {
        updatedCondition.params = params;
      } else {
        delete updatedCondition.params;
      }
      updateNode(path, updatedCondition, 'form');
    },
    [data, path, updateNode]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Edit Condition</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Configure what this condition checks
        </p>
      </div>

      {/* Fact selector */}
      <FactSelector
        id="condition-fact"
        value={localFact}
        onChange={handleFactChange}
        error={factError || undefined}
      />

      {/* Path selector with suggested paths */}
      <PathSelector
        id="condition-path"
        value={localPath}
        onChange={handlePathChange}
        factName={localFact}
        error={pathError || undefined}
      />

      {/* Operator selector */}
      <OperatorSelector
        id="condition-operator"
        value={localOperator}
        onChange={handleOperatorChange}
        selectedFact={localFact}
        error={operatorError || undefined}
      />

      {/* Value editor */}
      <ValueEditor
        id="condition-value"
        value={localValue}
        onChange={handleValueChange}
        operator={localOperator}
        error={valueError || undefined}
        placeholder="Enter comparison value"
      />

      {/* Divider */}
      <hr className="border-border" />

      {/* Parameters editor */}
      <ParamsEditor
        value={localParams}
        onChange={handleParamsChange}
        selectedFact={localFact}
      />

      {/* Preview */}
      <div className="p-4 bg-background-secondary rounded-lg border border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Condition Preview</h4>
        <code className="block text-xs font-mono text-foreground overflow-auto">
          <span className="text-primary">{localFact}</span>
          {localPath && (
            <span className="text-foreground-muted">{localPath}</span>
          )}
          {' '}
          <span className="text-primary">{localOperator}</span>
          {' '}
          <span className="text-foreground">{JSON.stringify(localValue)}</span>
        </code>
      </div>
    </div>
  );
}
