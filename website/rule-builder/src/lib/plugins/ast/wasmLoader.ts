/**
 * Web Tree-sitter WASM Loader
 * 
 * Handles initialization and loading of tree-sitter WASM files in the browser.
 */

import { browserLogger } from '../browserContext';

// We'll use dynamic import for web-tree-sitter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Parser: any = null;
let initialized = false;
let initializationPromise: Promise<void> | null = null;

// Language parser cache
const languageParsers = new Map<string, unknown>();

/**
 * WASM file location configuration
 * Defaults to the standard Docusaurus/Vite public path
 */
export const WASM_BASE_PATH = '/x-fidelity/rule-builder/wasm';

/**
 * Supported languages and their WASM file names
 */
export const SUPPORTED_LANGUAGES = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Get the language for a file based on extension
 */
export function getLanguageFromExtension(filePath: string): SupportedLanguage | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'javascript'; // JSX uses javascript parser
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    default:
      return null;
  }
}

/**
 * Initialize web-tree-sitter
 * 
 * This function is idempotent - calling it multiple times will only
 * initialize once.
 */
export async function initTreeSitter(): Promise<typeof Parser> {
  // If already initialized, return immediately
  if (initialized && Parser) {
    return Parser;
  }
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise;
    return Parser;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    try {
      browserLogger.info('Initializing web-tree-sitter...');
      
      // Dynamic import of web-tree-sitter
      // The module exports TreeSitter (which is the Parser class) via CommonJS
      // Vite/bundlers expose this differently depending on interop settings
      const TreeSitterModule = await import('web-tree-sitter');
      
      // Handle various module export formats
      // - ESM default export: TreeSitterModule.default
      // - CommonJS interop: TreeSitterModule.default or TreeSitterModule itself
      // - The module exports a Parser class with static init() method
      Parser = TreeSitterModule.default ?? TreeSitterModule;
      
      // If we got a module namespace object, try to extract the Parser
      if (Parser && typeof Parser !== 'function' && typeof Parser.init !== 'function') {
        // Try common export patterns
        if (typeof Parser.Parser === 'function') {
          Parser = Parser.Parser;
        } else if (typeof Parser.TreeSitter === 'function') {
          Parser = Parser.TreeSitter;
        }
      }
      
      // Validate that we have the init method
      if (typeof Parser?.init !== 'function') {
        browserLogger.error('web-tree-sitter module structure:', { 
          type: typeof Parser,
          keys: Parser ? Object.keys(Parser) : [],
          hasInit: typeof Parser?.init
        });
        throw new Error(`Parser.init is not a function. Got: ${typeof Parser?.init}`);
      }
      
      // Initialize with WASM file location
      await Parser.init({
        locateFile: (file: string) => {
          const wasmPath = `${WASM_BASE_PATH}/${file}`;
          browserLogger.debug(`Locating WASM file: ${file} -> ${wasmPath}`);
          return wasmPath;
        },
      });
      
      initialized = true;
      browserLogger.info('web-tree-sitter initialized successfully');
    } catch (error) {
      browserLogger.error(`Failed to initialize web-tree-sitter: ${error}`);
      initializationPromise = null;
      throw error;
    }
  })();
  
  await initializationPromise;
  return Parser;
}

/**
 * Load a language parser
 */
export async function loadLanguage(language: SupportedLanguage): Promise<unknown> {
  // Check cache first
  if (languageParsers.has(language)) {
    return languageParsers.get(language);
  }
  
  // Ensure tree-sitter is initialized
  await initTreeSitter();
  
  const wasmFile = SUPPORTED_LANGUAGES[language];
  const wasmPath = `${WASM_BASE_PATH}/${wasmFile}`;
  
  try {
    browserLogger.debug(`Loading language parser: ${language} from ${wasmPath}`);
    const languageParser = await Parser.Language.load(wasmPath);
    languageParsers.set(language, languageParser);
    browserLogger.debug(`Language parser loaded: ${language}`);
    return languageParser;
  } catch (error) {
    browserLogger.error(`Failed to load language parser ${language}: ${error}`);
    throw error;
  }
}

/**
 * Create a parser instance for a specific language
 */
export async function createParser(language: SupportedLanguage): Promise<unknown> {
  await initTreeSitter();
  
  const languageParser = await loadLanguage(language);
  const parser = new Parser();
  parser.setLanguage(languageParser);
  
  return parser;
}

/**
 * Parse source code and return the AST tree
 */
export async function parseCode(
  code: string,
  language: SupportedLanguage
): Promise<{ tree: unknown; hasErrors: boolean } | null> {
  try {
    const parser = await createParser(language);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree = (parser as any).parse(code);
    
    return {
      tree,
      hasErrors: tree.rootNode?.hasError() || false,
    };
  } catch (error) {
    browserLogger.error(`Failed to parse code as ${language}: ${error}`);
    return null;
  }
}

/**
 * Check if tree-sitter is initialized
 */
export function isTreeSitterInitialized(): boolean {
  return initialized && Parser !== null;
}

/**
 * Reset tree-sitter state (useful for testing)
 */
export function resetTreeSitter(): void {
  initialized = false;
  initializationPromise = null;
  Parser = null;
  languageParsers.clear();
}
