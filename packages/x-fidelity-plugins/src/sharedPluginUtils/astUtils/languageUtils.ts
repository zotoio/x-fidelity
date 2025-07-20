import path from 'path';

/**
 * Centralized language detection and support utilities for Tree-sitter AST generation
 * This replaces multiple scattered getLanguageFromX functions throughout the codebase
 */

export interface LanguageInfo {
  language: 'javascript' | 'typescript';
  extensions: string[];
  treeSitterLanguage: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
  javascript: {
    language: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    treeSitterLanguage: 'javascript'
  },
  typescript: {
    language: 'typescript', 
    extensions: ['.ts', '.tsx'],
    treeSitterLanguage: 'typescript'
  }
};

/**
 * Get language from file path extension
 * Replaces getLanguageFromPath and getLanguageFromFileName functions
 */
export function getLanguageFromPath(filePath: string): 'javascript' | 'typescript' | null {
  const ext = path.extname(filePath).toLowerCase();
  
  for (const langInfo of Object.values(SUPPORTED_LANGUAGES)) {
    if (langInfo.extensions.includes(ext)) {
      return langInfo.language;
    }
  }
  
  return null;
}

/**
 * Check if a file is supported for AST generation
 */
export function isSupportedFile(filePath: string): boolean {
  return getLanguageFromPath(filePath) !== null;
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_LANGUAGES)
    .flatMap(lang => lang.extensions);
}

/**
 * Get language info by language name
 */
export function getLanguageInfo(language: 'javascript' | 'typescript'): LanguageInfo | null {
  return SUPPORTED_LANGUAGES[language] || null;
}

/**
 * Check if an extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  const normalizedExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return getSupportedExtensions().includes(normalizedExt);
} 