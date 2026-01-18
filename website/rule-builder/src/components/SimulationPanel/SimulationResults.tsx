/**
 * SimulationResults Component
 * 
 * Displays the results of a rule simulation.
 */

import { 
  CheckCircledIcon, 
  CrossCircledIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import { useState } from 'react';
import type { SimulationResult } from '../../lib/simulation/types';
import { ConditionResultItem } from './ConditionResultItem';
import { EventPreview } from './EventPreview';

export interface SimulationResultsProps {
  /** The simulation result to display */
  result: SimulationResult;
  /** Optional className */
  className?: string;
}

/**
 * Get overall status styling
 */
function getStatusStyle(finalResult: SimulationResult['finalResult']): {
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  description: string;
} {
  switch (finalResult) {
    case 'triggered':
      // Rule triggered = problem detected (warning/issue found)
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-500',
        label: 'Rule Triggered',
        description: 'All conditions matched - the event would fire (issue detected)',
      };
    case 'not-triggered':
      // Rule not triggered = no problem (code passes this check)
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: CheckCircledIcon,
        iconColor: 'text-green-500',
        label: 'Rule Not Triggered',
        description: 'One or more conditions did not match - no event would fire (no issue)',
      };
    case 'error':
    default:
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: CrossCircledIcon,
        iconColor: 'text-red-500',
        label: 'Simulation Error',
        description: 'An error occurred during simulation',
      };
  }
}

export function SimulationResults({
  result,
  className = '',
}: SimulationResultsProps): JSX.Element {
  const [showConditions, setShowConditions] = useState(true);
  
  const status = getStatusStyle(result.finalResult);
  const StatusIcon = status.icon;
  
  // Count matched/not-matched conditions
  // In json-rules-engine: condition TRUE = matched (contributes to rule firing)
  // condition FALSE = not matched (prevents rule from firing)
  const matchedCount = result.conditionResults.filter(c => c.result && !c.error).length;
  const notMatchedCount = result.conditionResults.filter(c => !c.result || c.error).length;
  const totalCount = result.conditionResults.length;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status header */}
      <div className={`rounded-lg border ${status.border} ${status.bg} p-4`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-6 h-6 flex-shrink-0 ${status.iconColor}`} />
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              {status.label}
            </h3>
            <p className="text-sm text-foreground-muted">
              {status.description}
            </p>
            
            {/* Stats row */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-foreground-muted">
                <ClockIcon className="w-4 h-4" />
                {result.duration.toFixed(1)}ms
              </span>
              
              <span className="text-foreground-muted">
                File: <code className="text-foreground">{result.fileName}</code>
              </span>
              
              <span className="text-foreground-muted">
                {matchedCount}/{totalCount} conditions matched
              </span>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {result.error && (
          <div className="mt-3 p-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {result.error}
            </p>
          </div>
        )}
      </div>
      
      {/* Conditions section */}
      {result.conditionResults.length > 0 && (
        <div className="rounded-lg border border-border bg-background">
          {/* Section header */}
          <button
            type="button"
            onClick={() => setShowConditions(!showConditions)}
            className="flex items-center gap-2 w-full p-3 text-left hover:bg-accent/50 transition-colors"
          >
            {showConditions ? (
              <ChevronDownIcon className="w-4 h-4 text-foreground-muted" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-foreground-muted" />
            )}
            <span className="font-medium text-foreground">
              Condition Results
            </span>
            <span className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">
                {matchedCount} matched
              </span>
              <span className="text-foreground-muted">|</span>
              <span className="text-foreground-muted">
                {notMatchedCount} not matched
              </span>
            </span>
          </button>
          
          {/* Conditions list */}
          {showConditions && (
            <div className="p-3 pt-0 space-y-2">
              {result.conditionResults.map((condition, idx) => (
                <ConditionResultItem
                  key={`${condition.path.join('.')}-${idx}`}
                  result={condition}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Event preview */}
      {result.event && (
        <EventPreview
          event={result.event}
          triggered={result.finalResult === 'triggered'}
        />
      )}
    </div>
  );
}

export default SimulationResults;
