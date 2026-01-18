/**
 * EditorToolbar - Toolbar for JSON Editor actions
 *
 * Provides quick actions:
 * - Format: Prettify the JSON
 * - Copy: Copy to clipboard
 * - Reset: Reset to last valid state
 *
 * Shows status indicators for parse errors and copy success.
 */

import { useState, useCallback } from 'react';
import {
  CodeIcon,
  CopyIcon,
  ResetIcon,
  CheckIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';

/**
 * Toolbar props
 */
export interface EditorToolbarProps {
  /** Whether the current JSON is valid */
  isValidJson: boolean;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Handler for format action */
  onFormat: () => boolean;
  /** Handler for copy action */
  onCopy: () => Promise<boolean>;
  /** Handler for reset action */
  onReset: () => void;
}

/**
 * Button component for toolbar actions
 */
function ToolbarButton({
  onClick,
  disabled,
  children,
  title,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  variant?: 'default' | 'success' | 'error';
}) {
  const baseClasses =
    'text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: 'bg-accent hover:bg-border text-foreground',
    success: 'bg-primary text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}

/**
 * EditorToolbar component
 *
 * @example
 * ```tsx
 * <EditorToolbar
 *   isValidJson={true}
 *   hasUnsavedChanges={false}
 *   onFormat={handleFormat}
 *   onCopy={handleCopy}
 *   onReset={handleReset}
 * />
 * ```
 */
export function EditorToolbar({
  isValidJson,
  hasUnsavedChanges,
  onFormat,
  onCopy,
  onReset,
}: EditorToolbarProps): JSX.Element {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = useCallback(async () => {
    const success = await onCopy();
    setCopyStatus(success ? 'success' : 'error');

    // Reset status after 2 seconds
    setTimeout(() => {
      setCopyStatus('idle');
    }, 2000);
  }, [onCopy]);

  const handleFormat = useCallback(() => {
    onFormat();
  }, [onFormat]);

  const handleReset = useCallback(() => {
    onReset();
  }, [onReset]);

  return (
    <div className="flex items-center justify-between mb-3">
      {/* Title and status */}
      <div className="flex items-center gap-2">
        <CodeIcon className="w-4 h-4 text-foreground-muted" />
        <span className="text-xs text-foreground-muted">JSON Editor</span>
        {!isValidJson && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <Cross2Icon className="w-3 h-3" />
            Invalid JSON
          </span>
        )}
        {isValidJson && hasUnsavedChanges && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Format button */}
        <ToolbarButton
          onClick={handleFormat}
          disabled={!isValidJson}
          title="Format JSON (Ctrl+Shift+F)"
        >
          <CodeIcon className="w-3 h-3" />
          Format
        </ToolbarButton>

        {/* Copy button */}
        <ToolbarButton
          onClick={handleCopy}
          title="Copy to clipboard"
          variant={copyStatus === 'success' ? 'success' : copyStatus === 'error' ? 'error' : 'default'}
        >
          {copyStatus === 'success' ? (
            <>
              <CheckIcon className="w-3 h-3" />
              Copied!
            </>
          ) : copyStatus === 'error' ? (
            <>
              <Cross2Icon className="w-3 h-3" />
              Failed
            </>
          ) : (
            <>
              <CopyIcon className="w-3 h-3" />
              Copy
            </>
          )}
        </ToolbarButton>

        {/* Reset button */}
        <ToolbarButton
          onClick={handleReset}
          disabled={!hasUnsavedChanges && isValidJson}
          title="Reset to last valid state"
        >
          <ResetIcon className="w-3 h-3" />
          Reset
        </ToolbarButton>
      </div>
    </div>
  );
}
