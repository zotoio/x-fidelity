/**
 * Monaco Editor configuration options
 *
 * Configures the JSON editor with optimal settings for rule editing:
 * - Line numbers for navigation
 * - Folding for collapsing nested structures
 * - Auto-formatting on paste/type
 * - Word wrap for readability
 * - Disabled minimap (not useful for JSON)
 * - Automatic layout for responsive sizing
 */

import type { editor } from 'monaco-editor';

/**
 * Default Monaco editor options for JSON editing
 */
export const monacoOptions: editor.IStandaloneEditorConstructionOptions = {
  // Display settings
  minimap: { enabled: false },
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  glyphMargin: true, // Show error markers in gutter

  // Code folding
  folding: true,
  foldingStrategy: 'auto',
  showFoldingControls: 'always',

  // Formatting
  formatOnPaste: true,
  formatOnType: true,
  tabSize: 2,
  insertSpaces: true,

  // Layout
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,

  // Scrollbar
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },

  // Editing features
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  bracketPairColorization: {
    enabled: true,
  },

  // Suggestions and validation
  quickSuggestions: {
    strings: true,
    other: true,
    comments: false,
  },

  // Read-only options
  readOnly: false,
  domReadOnly: false,

  // Accessibility
  accessibilitySupport: 'auto',

  // Performance for large documents
  largeFileOptimizations: true,
  maxTokenizationLineLength: 20000,
};

/**
 * Read-only version of Monaco options (for preview mode)
 */
export const readOnlyMonacoOptions: editor.IStandaloneEditorConstructionOptions = {
  ...monacoOptions,
  readOnly: true,
  domReadOnly: true,
};
