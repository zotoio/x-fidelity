/**
 * ConditionResultItem Component
 * 
 * Displays the result of a single condition evaluation.
 */

import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon, ClockIcon } from '@radix-ui/react-icons';
import { FactValueViewer } from './FactValueViewer';
import type { ConditionResult } from '../../lib/simulation/types';

export interface ConditionResultItemProps {
  /** The condition result to display */
  result: ConditionResult;
  /** Optional index for display */
  index?: number;
  /** Optional className */
  className?: string;
}

/**
 * Format operator for display
 */
function formatOperator(operator: string): string {
  const operatorMap: Record<string, string> = {
    equal: '=',
    notEqual: '≠',
    lessThan: '<',
    lessThanInclusive: '≤',
    greaterThan: '>',
    greaterThanInclusive: '≥',
    in: 'in',
    notIn: 'not in',
    contains: 'contains',
    doesNotContain: 'does not contain',
    fileContains: 'file contains',
    astComplexity: 'ast complexity',
    outdatedFramework: 'outdated framework',
  };
  
  return operatorMap[operator] || operator;
}

/**
 * Format compare value for display
 */
function formatCompareValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ConditionResultItem({
  result,
  index: _index,
  className = '',
}: ConditionResultItemProps): JSX.Element {
  const hasError = Boolean(result.error);
  // In json-rules-engine: TRUE = condition matched (contributes to rule firing)
  // FALSE = condition not matched (prevents rule from firing)
  const matched = result.result && !hasError;
  
  // Determine status icon and color
  // Matched (TRUE) = yellow/warning (contributes to detecting an issue)
  // Not matched (FALSE) = neutral/gray (no issue detected by this condition)
  let StatusIcon = matched ? ExclamationTriangleIcon : CheckCircledIcon;
  let statusColor = matched ? 'text-yellow-500' : 'text-green-500';
  let bgColor = matched ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-green-50 dark:bg-green-900/10';
  let borderColor = matched ? 'border-yellow-200 dark:border-yellow-800' : 'border-green-200 dark:border-green-800';
  
  if (hasError) {
    StatusIcon = CrossCircledIcon;
    statusColor = 'text-red-500';
    bgColor = 'bg-red-50 dark:bg-red-900/10';
    borderColor = 'border-red-200 dark:border-red-800';
  }
  
  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3 ${className}`}>
      {/* Header row */}
      <div className="flex items-start gap-2">
        <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusColor}`} />
        
        <div className="flex-1 min-w-0">
          {/* Condition expression */}
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <code className="font-mono text-blue-600 dark:text-blue-400">
              {result.factName}
            </code>
            {result.jsonPath && (
              <span className="text-foreground-muted text-xs">
                [{result.jsonPath}]
              </span>
            )}
            <span className="text-foreground-muted px-1">
              {formatOperator(result.operator)}
            </span>
            <code className="font-mono text-purple-600 dark:text-purple-400">
              {formatCompareValue(result.compareValue)}
            </code>
          </div>
          
          {/* Result indicator */}
          <div className="mt-1 text-xs text-foreground-muted flex items-center gap-2">
            <span className={matched ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}>
              {matched ? 'MATCHED' : 'NOT MATCHED'}
            </span>
            
            {result.duration !== undefined && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {result.duration.toFixed(1)}ms
              </span>
            )}
            
            {result.path.length > 0 && (
              <span className="text-foreground-muted/60">
                @ {result.path.join('.')}
              </span>
            )}
          </div>
          
          {/* Error message */}
          {hasError && (
            <div className="mt-2 p-2 rounded bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Error:</strong> {result.error}
              </p>
            </div>
          )}
          
          {/* Fact value viewer */}
          {result.factValue !== undefined && (
            <div className="mt-2">
              <FactValueViewer
                value={result.factValue}
                label="Fact returned"
                defaultExpanded={false}
              />
            </div>
          )}
          
          {/* Params if present */}
          {result.params && Object.keys(result.params).length > 0 && (
            <div className="mt-2">
              <FactValueViewer
                value={result.params}
                label="Parameters"
                defaultExpanded={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConditionResultItem;
