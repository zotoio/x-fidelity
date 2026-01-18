/**
 * useMonacoSetup hook - Monaco Editor configuration
 *
 * Handles one-time Monaco configuration:
 * - Register custom themes matching Docusaurus
 * - Configure JSON schema validation
 * - Set up JSON language features
 *
 * This hook is called in beforeMount callback of Monaco Editor
 */

import { useCallback, useState, useEffect } from 'react';
import type { Monaco } from '@monaco-editor/react';
import {
  docusaurusLight,
  docusaurusDark,
  LIGHT_THEME_NAME,
  DARK_THEME_NAME,
} from '../themes';
import { getRuleJsonSchema, RULE_SCHEMA_URI } from '../config';

/**
 * Hook return type
 */
export interface UseMonacoSetupReturn {
  /** Callback to configure Monaco before mounting */
  configureMonaco: (monaco: Monaco) => void;
  /** Current theme name based on dark mode */
  currentTheme: string;
  /** Whether Monaco is configured */
  isConfigured: boolean;
}

/**
 * Detect dark mode from document
 */
function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Hook to configure Monaco Editor
 *
 * @example
 * ```tsx
 * function JsonEditor() {
 *   const { configureMonaco, currentTheme } = useMonacoSetup();
 *
 *   return (
 *     <Editor
 *       beforeMount={configureMonaco}
 *       theme={currentTheme}
 *     />
 *   );
 * }
 * ```
 */
export function useMonacoSetup(): UseMonacoSetupReturn {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDark, setIsDark] = useState(isDarkMode);

  // Watch for theme changes
  useEffect(() => {
    // Create a mutation observer to watch for class changes on html element
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDark(isDarkMode());
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const configureMonaco = useCallback((monaco: Monaco) => {
    // Register custom themes
    monaco.editor.defineTheme(LIGHT_THEME_NAME, docusaurusLight);
    monaco.editor.defineTheme(DARK_THEME_NAME, docusaurusDark);

    // Configure JSON language defaults with schema validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [
        {
          uri: RULE_SCHEMA_URI,
          fileMatch: ['*'], // Match all files in this editor
          schema: getRuleJsonSchema(),
        },
      ],
      enableSchemaRequest: false,
      schemaValidation: 'error',
    });

    // Set format options for JSON
    monaco.languages.json.jsonDefaults.setModeConfiguration({
      documentFormattingEdits: true,
      documentRangeFormattingEdits: true,
      completionItems: true,
      hovers: true,
      documentSymbols: true,
      tokens: true,
      colors: true,
      foldingRanges: true,
      diagnostics: true,
      selectionRanges: true,
    });

    setIsConfigured(true);
  }, []);

  const currentTheme = isDark ? DARK_THEME_NAME : LIGHT_THEME_NAME;

  return {
    configureMonaco,
    currentTheme,
    isConfigured,
  };
}
