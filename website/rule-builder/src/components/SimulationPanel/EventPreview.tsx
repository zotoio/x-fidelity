/**
 * EventPreview Component
 * 
 * Shows what event would be triggered by the rule.
 */

import { BellIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import type { EventResult } from '../../lib/simulation/types';
import { FactValueViewer } from './FactValueViewer';

export interface EventPreviewProps {
  /** The event to display */
  event: EventResult;
  /** Whether the event was triggered */
  triggered?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get icon for event type
 */
function getEventIcon(type: EventResult['type']): React.ComponentType<{ className?: string }> {
  switch (type) {
    case 'fatality':
      return ExclamationTriangleIcon;
    case 'warning':
      return BellIcon;
    case 'info':
    default:
      return InfoCircledIcon;
  }
}

/**
 * Get styling for event type
 */
function getEventStyle(type: EventResult['type']): { bg: string; border: string; icon: string; label: string } {
  switch (type) {
    case 'fatality':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-500',
        label: 'FATALITY',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-500',
        label: 'WARNING',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500',
        label: 'INFO',
      };
  }
}

export function EventPreview({
  event,
  triggered = true,
  className = '',
}: EventPreviewProps): JSX.Element {
  const Icon = getEventIcon(event.type);
  const style = getEventStyle(event.type);
  
  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-foreground mb-2">
        {triggered ? 'Event that would trigger:' : 'Event (not triggered):'}
      </h4>
      
      <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
        {/* Event type badge */}
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${style.icon}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${style.icon}`}>
            {style.label}
          </span>
        </div>
        
        {/* Message */}
        <p className="text-sm text-foreground font-medium mb-2">
          {event.message}
        </p>
        
        {/* Details */}
        {event.details && Object.keys(event.details).length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <FactValueViewer
              value={event.details}
              label="Event details"
              defaultExpanded={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default EventPreview;
