/**
 * RootForm - Form for editing rule root properties
 *
 * Allows editing of:
 * - Rule name (camelCase first part, then kebab-case, e.g., myRule-iterative)
 * - Rule priority (1-100)
 * - Global rule toggle (adds REPO_GLOBAL_CHECK condition)
 */

import { useCallback, useMemo } from 'react';
import { useValidation } from '../../../hooks';
import { FieldTooltip } from '../tooltips/FieldTooltip';
import { useFormState } from '../hooks/useFormState';
import { useRuleStore } from '../../../store/ruleStore';
import { useShallow } from 'zustand/shallow';
import { GlobeIcon } from '@radix-ui/react-icons';
import {
  isGlobalRule,
  createGlobalCheckCondition,
  findGlobalCheckPath,
} from '../../../lib/utils/globalRuleUtils';
import type { RuleCondition, NestedCondition } from '../../../types';

export interface RootFormProps {
  /** Path to the rule root (empty array) */
  path: string[];
}

/**
 * RootForm component for rule metadata
 */
export function RootForm({ path: _path }: RootFormProps): JSX.Element {
  // Get validation state
  const { getErrorMessage } = useValidation();

  // Form state with debouncing
  const { value: name, setValue: setName } = useFormState<string>(['name']);
  const { value: priority, setValue: setPriority } = useFormState<number>(['priority']);
  const { value: description, setValue: setDescription } = useFormState<string>(['description']);
  const { value: recommendations, setValue: setRecommendations } = useFormState<string[]>(['recommendations']);
  const { value: errorBehavior, setValue: setErrorBehavior } = useFormState<'swallow' | 'fatal' | undefined>(['errorBehavior']);

  // Get rule and store actions for global toggle
  const { rule, updateNode, deleteNode } = useRuleStore(
    useShallow((state) => ({
      rule: state.rule,
      updateNode: state.updateNode,
      deleteNode: state.deleteNode,
    }))
  );

  // Check if rule is currently a global rule
  const isGlobal = useMemo(() => isGlobalRule(rule), [rule]);

  // Validation errors
  const nameError = getErrorMessage(['name']);
  const priorityError = getErrorMessage(['priority']);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow camelCase for first part, kebab-case after hyphens
      // Only allow letters, numbers, and hyphens
      const value = e.target.value
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '');
      setName(value);
    },
    [setName]
  );

  const handlePriorityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 1 && value <= 100) {
        setPriority(value);
      }
    },
    [setPriority]
  );

  const handleGlobalToggle = useCallback(() => {
    if (!rule?.conditions) return;

    if (isGlobal) {
      // Remove the global check condition
      const conditions = rule.conditions;
      if ('all' in conditions && Array.isArray(conditions.all)) {
        const path = findGlobalCheckPath(conditions.all, ['conditions', 'all']);
        if (path) {
          deleteNode(path, 'form');
        }
      } else if ('any' in conditions && Array.isArray(conditions.any)) {
        const path = findGlobalCheckPath(conditions.any, ['conditions', 'any']);
        if (path) {
          deleteNode(path, 'form');
        }
      }
      // Update rule name suffix from -global to -iterative
      if (name?.endsWith('-global')) {
        setName(name.replace(/-global$/, '-iterative'));
      }
    } else {
      // Add the global check condition at the start of the top-level conditions
      const conditions = rule.conditions;
      const globalCondition = createGlobalCheckCondition();
      
      if ('all' in conditions && Array.isArray(conditions.all)) {
        const newConditions: (RuleCondition | NestedCondition)[] = [globalCondition, ...conditions.all];
        updateNode(['conditions', 'all'], newConditions, 'form');
      } else if ('any' in conditions && Array.isArray(conditions.any)) {
        const newConditions: (RuleCondition | NestedCondition)[] = [globalCondition, ...conditions.any];
        updateNode(['conditions', 'any'], newConditions, 'form');
      }
      // Update rule name suffix from -iterative to -global
      if (name?.endsWith('-iterative')) {
        setName(name.replace(/-iterative$/, '-global'));
      }
    }
  }, [rule, isGlobal, updateNode, deleteNode, name, setName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Rule Properties</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Configure the rule name and execution priority
        </p>
      </div>

      {/* Name field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-name" className="text-sm font-medium text-foreground">
            Rule Name
          </label>
          <FieldTooltip
            title="Rule Name"
            description="A unique identifier for this rule. The first part can be camelCase, followed by kebab-case segments."
            hint="Use letters, numbers, and hyphens. Suffix with -iterative or -global."
            example={
              <div className="space-y-1">
                <code>myRule-iterative</code>
                <br />
                <code>noTodoComments-global</code>
                <br />
                <code>max-function-complexity</code>
              </div>
            }
          />
        </div>
        <input
          type="text"
          id="rule-name"
          value={name || ''}
          onChange={handleNameChange}
          placeholder="myRuleName-iterative"
          className={`
            w-full px-3 py-2 rounded-md bg-background border text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-accent
            ${nameError ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
        />
        <p className="text-xs text-foreground-muted">
          camelCase allowed for first part, then kebab-case (e.g., myRule-iterative)
        </p>
        {nameError && (
          <p className="text-xs text-error" role="alert">
            {nameError}
          </p>
        )}
      </div>

      {/* Priority field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-priority" className="text-sm font-medium text-foreground">
            Priority
          </label>
          <FieldTooltip
            title="Rule Priority"
            description="Determines the order in which rules are evaluated. Higher priority rules run first."
            hint="Value between 1 (lowest) and 100 (highest)"
            example="Default is 1. Use higher values for rules that should run before others."
          />
        </div>
        <input
          type="number"
          id="rule-priority"
          value={priority || 1}
          onChange={handlePriorityChange}
          min={1}
          max={100}
          className={`
            w-full px-3 py-2 rounded-md bg-background border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent
            ${priorityError ? 'border-error' : 'border-border hover:border-border-hover'}
          `}
        />
        <p className="text-xs text-foreground-muted">
          Higher priority rules execute first (1-100)
        </p>
        {priorityError && (
          <p className="text-xs text-error" role="alert">
            {priorityError}
          </p>
        )}
      </div>

      {/* Global Rule toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-global" className="text-sm font-medium text-foreground">
            Rule Scope
          </label>
          <FieldTooltip
            title="Global Rule"
            description="Global rules run once against the entire repository instead of per-file. They add a REPO_GLOBAL_CHECK condition."
            hint="Enable for repository-wide checks like file structure, dependency analysis, or cross-file validations."
            example={
              <div className="space-y-1">
                <code>fileData.fileName === 'REPO_GLOBAL_CHECK'</code>
                <br />
                <span className="text-xs">This special condition triggers global evaluation.</span>
              </div>
            }
          />
        </div>
        <button
          type="button"
          id="rule-global"
          onClick={handleGlobalToggle}
          className={`
            w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm
            transition-colors focus:outline-none focus:ring-2 focus:ring-accent
            ${isGlobal 
              ? 'bg-primary/10 border-primary text-foreground' 
              : 'bg-background border-border hover:border-border-hover text-foreground-muted'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <GlobeIcon className={`w-4 h-4 ${isGlobal ? 'text-primary' : 'text-foreground-muted'}`} />
            <span className={isGlobal ? 'text-foreground' : 'text-foreground-muted'}>
              {isGlobal ? 'Global Rule (REPO_GLOBAL_CHECK)' : 'Iterative Rule (per-file)'}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${isGlobal ? 'bg-primary text-white' : 'bg-accent'}`}>
            {isGlobal ? 'ON' : 'OFF'}
          </span>
        </button>
        <p className="text-xs text-foreground-muted">
          {isGlobal 
            ? 'Rule will evaluate once against all repository files'
            : 'Click to enable global evaluation for repository-wide checks'
          }
        </p>
      </div>

      {/* Description field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <FieldTooltip
            title="Rule Description"
            description="A human-readable description of what this rule checks for."
            hint="This appears in analysis reports and helps users understand the rule's purpose."
          />
        </div>
        <textarea
          id="rule-description"
          value={description || ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this rule checks for..."
          rows={2}
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover resize-y"
        />
        <p className="text-xs text-foreground-muted">
          Optional. Explains the rule's purpose in reports.
        </p>
      </div>

      {/* Recommendations field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-recommendations" className="text-sm font-medium text-foreground">
            Recommendations
          </label>
          <FieldTooltip
            title="Fix Recommendations"
            description="A list of recommendations for how to fix issues found by this rule."
            hint="Each line becomes a separate recommendation item."
            example={
              <div className="space-y-1 text-xs">
                <code>Remove sensitive data from logs</code><br/>
                <code>Use environment variables instead</code>
              </div>
            }
          />
        </div>
        <textarea
          id="rule-recommendations"
          value={(recommendations || []).join('\n')}
          onChange={(e) => {
            const lines = e.target.value.split('\n').filter(line => line.trim());
            setRecommendations(lines.length > 0 ? lines : undefined as unknown as string[]);
          }}
          placeholder="Enter recommendations (one per line)..."
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover resize-y"
        />
        <p className="text-xs text-foreground-muted">
          Optional. One recommendation per line.
        </p>
      </div>

      {/* Error Behavior field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="rule-error-behavior" className="text-sm font-medium text-foreground">
            Error Behavior
          </label>
          <FieldTooltip
            title="Error Behavior"
            description="How to handle errors when evaluating this rule's conditions."
            hint="'Swallow' ignores errors silently. 'Fatal' stops analysis on error."
            example={
              <div className="space-y-1 text-xs">
                <code>swallow</code> - Continue if condition fails<br/>
                <code>fatal</code> - Stop analysis on error
              </div>
            }
          />
        </div>
        <select
          id="rule-error-behavior"
          value={errorBehavior || ''}
          onChange={(e) => setErrorBehavior(e.target.value as 'swallow' | 'fatal' | undefined || undefined)}
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm
            focus:outline-none focus:ring-2 focus:ring-accent hover:border-border-hover"
        >
          <option value="">Default (no special handling)</option>
          <option value="swallow">Swallow - Ignore errors silently</option>
          <option value="fatal">Fatal - Stop analysis on error</option>
        </select>
        <p className="text-xs text-foreground-muted">
          Optional. Controls error handling behavior.
        </p>
      </div>

      {/* Info box */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-1">Tip</h4>
        <p className="text-xs text-foreground-muted">
          Select conditions or events in the tree on the left to edit their properties.
          The rule will be validated automatically as you make changes.
        </p>
      </div>
    </div>
  );
}
