/**
 * Light theme for Monaco Editor matching Docusaurus light mode
 *
 * Colors are derived from Docusaurus/Infima default light theme variables
 * to ensure visual consistency across the rule builder interface.
 */

import type { editor } from 'monaco-editor';

/**
 * Docusaurus-compatible light theme for Monaco Editor
 */
export const docusaurusLight: editor.IStandaloneThemeData = {
  base: 'vs', // Inherit from VS Light theme
  inherit: true,
  rules: [
    // JSON-specific tokens
    { token: 'string.key.json', foreground: '0451a5' }, // Blue for keys
    { token: 'string.value.json', foreground: 'a31515' }, // Red for string values
    { token: 'number', foreground: '098658' }, // Green for numbers
    { token: 'keyword', foreground: '0000ff' }, // Blue for true/false/null

    // General tokens
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'string', foreground: 'a31515' },
    { token: 'delimiter', foreground: '000000' },
    { token: 'delimiter.bracket', foreground: '0431fa' },
  ],
  colors: {
    // Editor background and foreground
    'editor.background': '#ffffff', // --xfi-background
    'editor.foreground': '#1c1e21', // --xfi-foreground

    // Line numbers
    'editorLineNumber.foreground': '#606770', // --xfi-foreground-muted
    'editorLineNumber.activeForeground': '#1c1e21',

    // Cursor and selection
    'editorCursor.foreground': '#1c1e21',
    'editor.selectionBackground': '#add6ff',
    'editor.selectionHighlightBackground': '#add6ff80',

    // Current line
    'editor.lineHighlightBackground': '#f5f6f7', // --xfi-background-secondary
    'editor.lineHighlightBorder': '#00000000',

    // Bracket matching
    'editorBracketMatch.background': '#b8d7e580',
    'editorBracketMatch.border': '#2e8555', // --xfi-color-primary

    // Gutter
    'editorGutter.background': '#ffffff',
    'editorGutter.modifiedBackground': '#2e8555',
    'editorGutter.addedBackground': '#2e8555',
    'editorGutter.deletedBackground': '#ca6c60',

    // Error and warning markers
    'editorError.foreground': '#e51400',
    'editorWarning.foreground': '#bf8803',
    'editorInfo.foreground': '#75beff',

    // Scrollbar
    'scrollbar.shadow': '#dddddd',
    'scrollbarSlider.background': '#64646433',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#00000099',

    // Widget colors (autocomplete, hover)
    'editorWidget.background': '#f5f6f7',
    'editorWidget.border': '#dadde1', // --xfi-border

    // Focus border
    'focusBorder': '#2e8555', // --xfi-color-primary
  },
};

/**
 * Theme name for registration
 */
export const LIGHT_THEME_NAME = 'docusaurus-light';
