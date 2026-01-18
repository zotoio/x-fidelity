/**
 * OperatorTooltip - Tooltip for operator information
 *
 * Displays detailed information about an operator including
 * its category, value type, and examples.
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { InfoCircledIcon, ExternalLinkIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import type { OperatorMetadata } from '../data/operatorCatalog';
import { getValueTypeDescription } from '../data/operatorCatalog';
import type { ReactNode } from 'react';

export interface OperatorTooltipProps {
  /** Operator metadata to display */
  operator: OperatorMetadata;
  /** Trigger element (defaults to info icon) */
  children?: ReactNode;
  /** Side of trigger to show tooltip */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip in ms */
  delayDuration?: number;
}

/**
 * Get category badge color
 */
function getCategoryColor(category: OperatorMetadata['category']): string {
  switch (category) {
    case 'comparison':
      return 'bg-blue-500/20 text-blue-400';
    case 'membership':
      return 'bg-green-500/20 text-green-400';
    case 'pattern':
      return 'bg-purple-500/20 text-purple-400';
    case 'filesystem':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'ast':
      return 'bg-red-500/20 text-red-400';
    case 'version':
      return 'bg-cyan-500/20 text-cyan-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

/**
 * Operator tooltip component with detailed operator information
 */
export function OperatorTooltip({
  operator,
  children,
  side = 'right',
  delayDuration = 300,
}: OperatorTooltipProps): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-foreground-muted hover:text-foreground hover:bg-background-lighter transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={`Show information about ${operator.name}`}
            >
              <InfoCircledIcon className="w-4 h-4" />
            </button>
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            align="start"
            sideOffset={5}
            className="z-50 max-w-sm bg-background-elevated border border-border rounded-lg shadow-lg p-4 animate-in fade-in-0 zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              <MixerHorizontalIcon className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-foreground text-sm font-mono">
                  {operator.name}
                </h4>
                <span className="text-xs text-foreground-muted">
                  From {operator.plugin}
                </span>
              </div>
            </div>

            {/* Category badge */}
            <div className="mb-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                  operator.category
                )}`}
              >
                {operator.category}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground-muted leading-relaxed mb-3">
              {operator.description}
            </p>

            {/* Value type */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-foreground mb-1">Expected value:</h5>
              <p className="text-xs text-foreground-muted">
                <span className="font-mono text-accent">{operator.valueType}</span>
                {' - '}
                {getValueTypeDescription(operator.valueType)}
              </p>
            </div>

            {/* Example */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-foreground mb-1">Example:</h5>
              <div className="p-2 bg-background rounded border border-border text-xs font-mono space-y-1">
                <div>
                  <span className="text-foreground-muted">Fact value: </span>
                  <span className="text-accent">
                    {JSON.stringify(operator.example.factValue)}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted">Compare to: </span>
                  <span className="text-accent">
                    {JSON.stringify(operator.example.compareValue)}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted">Result: </span>
                  <span
                    className={
                      operator.example.result ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {operator.example.result ? 'true' : 'false'}
                  </span>
                </div>
              </div>
            </div>

            {/* Documentation link */}
            {operator.documentationUrl && (
              <a
                href={operator.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                View documentation
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            )}

            <Tooltip.Arrow className="fill-background-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
