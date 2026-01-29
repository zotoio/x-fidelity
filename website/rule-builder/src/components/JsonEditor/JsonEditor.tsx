/**
 * JsonEditor - Monaco-based JSON editor for rule editing
 *
 * Provides a full-featured code editing experience:
 * - Monaco Editor with JSON syntax highlighting
 * - JSON Schema validation with error markers
 * - Bidirectional sync with store (debounced)
 * - Dark/light theme matching Docusaurus
 * - Format, copy, reset toolbar actions
 *
 * Uses source tracking to prevent infinite update loops.
 */

import { useCallback, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import { EditorToolbar } from './EditorToolbar';
import { useMonacoSetup } from './hooks/useMonacoSetup';
import { useEditorSync } from './hooks/useEditorSync';
import { monacoOptions } from './config/monacoOptions';

/**
 * JsonEditor props
 */
export interface JsonEditorProps {
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * JsonEditor component
 *
 * Integrates Monaco Editor with bidirectional state synchronization.
 * Changes in the editor are debounced (300ms) before updating the store.
 * Changes from other sources (tree, form) update the editor immediately.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div className="h-full">
 *       <JsonEditor />
 *     </div>
 *   );
 * }
 * ```
 */
export function JsonEditor({ readOnly = false, className = '' }: JsonEditorProps): JSX.Element {
  // Monaco setup hook
  const { configureMonaco, currentTheme } = useMonacoSetup();

  // Editor sync hook
  const {
    localValue,
    parseError,
    hasUnsavedChanges,
    handleChange,
    formatJson,
    copyToClipboard,
    resetToValid,
    isValidJson,
  } = useEditorSync();

  // Editor instance ref for programmatic access
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Focus the editor
    editor.focus();

    // Add keyboard shortcut for format
    editor.addCommand(
      // Ctrl+Shift+F
      // eslint-disable-next-line no-bitwise
      2048 | 1024 | 36, // monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      () => {
        formatJson();
      }
    );
  }, [formatJson]);

  // Combine options with read-only setting
  const editorOptions = {
    ...monacoOptions,
    readOnly,
    domReadOnly: readOnly,
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Toolbar */}
      <EditorToolbar
        isValidJson={isValidJson}
        hasUnsavedChanges={hasUnsavedChanges}
        onFormat={formatJson}
        onCopy={copyToClipboard}
        onReset={resetToValid}
      />

      {/* Editor container */}
      <div className="flex-1 rounded-lg overflow-hidden border border-border min-h-0">
        <Editor
          height="100%"
          language="json"
          value={localValue}
          onChange={handleChange}
          onMount={handleEditorMount}
          beforeMount={configureMonaco}
          theme={currentTheme}
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full text-foreground-muted">
              <span className="text-sm">Loading editor...</span>
            </div>
          }
        />
      </div>

      {/* Parse error display */}
      {parseError && (
        <div className="mt-2 px-3 py-2 rounded bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
          <div className="text-xs text-red-700 dark:text-red-400 font-medium">
            JSON Parse Error
            {parseError.line && parseError.column && (
              <span className="font-normal ml-2">
                (Line {parseError.line}, Column {parseError.column})
              </span>
            )}
          </div>
          <div className="text-xs text-red-600 dark:text-red-300 mt-1">
            {parseError.message}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-foreground-muted">
        <span className="opacity-60">
          Ctrl+Shift+F to format • Schema validation enabled
        </span>
      </div>
    </div>
  );
}
