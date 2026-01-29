/**
 * FieldTooltip - General purpose tooltip for form fields
 *
 * Uses Radix UI Tooltip for accessible, styled tooltips with
 * customizable content and positioning.
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { InfoCircledIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

export interface FieldTooltipProps {
  /** Title of the tooltip */
  title?: string;
  /** Main description */
  description: string;
  /** Additional hint text */
  hint?: string;
  /** Example value or code */
  example?: ReactNode;
  /** Link to documentation */
  documentationUrl?: string;
  /** Trigger element (defaults to info icon) */
  children?: ReactNode;
  /** Side of trigger to show tooltip */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment of tooltip */
  align?: 'start' | 'center' | 'end';
  /** Delay before showing tooltip in ms */
  delayDuration?: number;
}

/**
 * General field tooltip component
 */
export function FieldTooltip({
  title,
  description,
  hint,
  example,
  documentationUrl,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
}: FieldTooltipProps): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-foreground-muted hover:text-foreground hover:bg-background-lighter transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Show help"
            >
              <InfoCircledIcon className="w-4 h-4" />
            </button>
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            align={align}
            sideOffset={5}
            className="z-50 max-w-xs bg-background-elevated border border-border rounded-lg shadow-lg p-3 animate-in fade-in-0 zoom-in-95"
          >
            {title && (
              <h4 className="font-medium text-foreground text-sm mb-1">{title}</h4>
            )}
            <p className="text-sm text-foreground-muted leading-relaxed">{description}</p>
            {hint && (
              <p className="text-xs text-foreground-muted mt-2 italic">{hint}</p>
            )}
            {example && (
              <div className="mt-2 p-2 bg-background rounded border border-border text-xs font-mono overflow-auto">
                {example}
              </div>
            )}
            {documentationUrl && (
              <a
                href={documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2"
              >
                Learn more
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
