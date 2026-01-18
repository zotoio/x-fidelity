/**
 * FactTooltip - Tooltip for fact information
 *
 * Displays detailed information about a fact including its plugin,
 * parameters, return type, and examples.
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { InfoCircledIcon, ExternalLinkIcon, CodeIcon } from '@radix-ui/react-icons';
import type { FactMetadata } from '../data/factCatalog';
import type { ReactNode } from 'react';

export interface FactTooltipProps {
  /** Fact metadata to display */
  fact: FactMetadata;
  /** Trigger element (defaults to info icon) */
  children?: ReactNode;
  /** Side of trigger to show tooltip */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip in ms */
  delayDuration?: number;
}

/**
 * Fact tooltip component with detailed fact information
 */
export function FactTooltip({
  fact,
  children,
  side = 'right',
  delayDuration = 300,
}: FactTooltipProps): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-foreground-muted hover:text-foreground hover:bg-background-lighter transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={`Show information about ${fact.name}`}
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
              <CodeIcon className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-foreground text-sm">{fact.name}</h4>
                <span className="text-xs text-foreground-muted">
                  From {fact.plugin} plugin
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground-muted leading-relaxed mb-3">
              {fact.description}
            </p>

            {/* Parameters */}
            {fact.parameters.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-foreground mb-1">Parameters:</h5>
                <ul className="space-y-1">
                  {fact.parameters.map((param) => (
                    <li key={param.name} className="text-xs text-foreground-muted">
                      <span className="font-mono text-accent">{param.name}</span>
                      <span className="text-foreground-muted">
                        {' '}
                        ({param.type}
                        {param.required ? ', required' : ', optional'})
                      </span>
                      {param.description && (
                        <span className="block ml-4 text-foreground-muted">
                          {param.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Returns */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-foreground mb-1">Returns:</h5>
              <p className="text-xs text-foreground-muted">{fact.returns}</p>
            </div>

            {/* Example output */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-foreground mb-1">Example output:</h5>
              <pre className="p-2 bg-background rounded border border-border text-xs font-mono overflow-auto max-h-24">
                {JSON.stringify(fact.example.output, null, 2)}
              </pre>
            </div>

            {/* Tags */}
            {fact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {fact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-xs bg-background rounded text-foreground-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Documentation link */}
            {fact.documentationUrl && (
              <a
                href={fact.documentationUrl}
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
