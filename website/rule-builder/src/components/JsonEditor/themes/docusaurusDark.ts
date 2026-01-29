/**
 * Dark theme for Monaco Editor matching Docusaurus dark mode
 *
 * Colors are derived from Docusaurus/Infima dark theme variables
 * to ensure visual consistency across the rule builder interface.
 */

import type { editor } from 'monaco-editor';

/**
 * Docusaurus-compatible dark theme for Monaco Editor
 */
export const docusaurusDark: editor.IStandaloneThemeData = {
  base: 'vs-dark', // Inherit from VS Dark theme
  inherit: true,
  rules: [
    // JSON-specific tokens
    { token: 'string.key.json', foreground: '9cdcfe' }, // Light blue for keys
    { token: 'string.value.json', foreground: 'ce9178' }, // Orange for string values
    { token: 'number', foreground: 'b5cea8' }, // Light green for numbers
    { token: 'keyword', foreground: '569cd6' }, // Blue for true/false/null

    // General tokens
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'delimiter', foreground: 'd4d4d4' },
    { token: 'delimiter.bracket', foreground: 'ffd700' },
  ],
  colors: {
    // Editor background and foreground (from subtask spec)
    'editor.background': '#1b1b1d', // --xfi-background (dark mode)
    'editor.foreground': '#e3e3e3', // --xfi-foreground (dark mode)

    // Line numbers
    'editorLineNumber.foreground': '#858585', // As specified in subtask
    'editorLineNumber.activeForeground': '#e3e3e3',

    // Cursor and selection
    'editorCursor.foreground': '#e3e3e3',
    'editor.selectionBackground': '#264f78',
    'editor.selectionHighlightBackground': '#264f7850',

    // Current line
    'editor.lineHighlightBackground': '#242526', // --xfi-background-secondary (dark)
    'editor.lineHighlightBorder': '#00000000',

    // Bracket matching
    'editorBracketMatch.background': '#0d6e4c50',
    'editorBracketMatch.border': '#3ba164', // --xfi-color-primary-light

    // Gutter
    'editorGutter.background': '#1b1b1d',
    'editorGutter.modifiedBackground': '#3ba164',
    'editorGutter.addedBackground': '#3ba164',
    'editorGutter.deletedBackground': '#ca6c60',

    // Error and warning markers
    'editorError.foreground': '#f14c4c',
    'editorWarning.foreground': '#cca700',
    'editorInfo.foreground': '#3794ff',

    // Scrollbar
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#79797966',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#bfbfbf66',

    // Widget colors (autocomplete, hover)
    'editorWidget.background': '#242526', // --xfi-background-secondary
    'editorWidget.border': '#3e4042', // --xfi-border (dark)

    // Focus border
    'focusBorder': '#3ba164', // --xfi-color-primary-light
  },
};

/**
 * Theme name for registration
 */
export const DARK_THEME_NAME = 'docusaurus-dark';
