import * as vscode from 'vscode';
import { logger } from './logger';
import * as path from 'path';

// Simplified tree-sitter interface optimized for VSCode

interface TreeSitterTree {
  rootNode: TreeSitterNode;
  getText(): string;
}

interface TreeSitterNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: TreeSitterNode[];
  namedChildren: TreeSitterNode[];
}

interface TreeSitterLanguage {}

let isInitialized = false;
let jsLanguage: TreeSitterLanguage | null = null;
let tsLanguage: TreeSitterLanguage | null = null;
let wasmInitializationFailed = false;
let ParserClass: any = null;

// Cache for parsed trees to avoid re-parsing
const parsedTreeCache = new Map<
  string,
  { tree: TreeSitterTree; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function initializeTreeSitter(
  extensionContext: vscode.ExtensionContext
): Promise<void> {
  if (isInitialized || wasmInitializationFailed) {
    return;
  }

  try {
    logger.info('Initializing Tree-sitter for VSCode...');

    // Use native tree-sitter instead of web-tree-sitter for better performance
    try {
      const TreeSitter = await import('tree-sitter');
      ParserClass = TreeSitter.default || TreeSitter;
      logger.info('Native tree-sitter loaded successfully');

      // Load languages using native bindings for better performance
      const JavaScriptLanguage = await import('tree-sitter-javascript');
      const TypeScriptLanguage = await import('tree-sitter-typescript');

      jsLanguage = JavaScriptLanguage.default || JavaScriptLanguage;
      tsLanguage = TypeScriptLanguage.default || TypeScriptLanguage;

      isInitialized = true;
      logger.info('Native tree-sitter initialization completed');
      return;
    } catch (nativeError) {
      logger.warn(
        'Native tree-sitter failed, falling back to web-tree-sitter:',
        nativeError
      );
    }

    // Fallback to web-tree-sitter with optimized loading
    const Parser = await import('web-tree-sitter');
    ParserClass = Parser.default || Parser;

    // Use node_modules WASM files directly for reliability
    const wasmBasePath = path.join(
      extensionContext.extensionPath,
      'node_modules'
    );
    const wasmPath = path.join(
      wasmBasePath,
      'web-tree-sitter',
      'tree-sitter.wasm'
    );
    const jsWasmPath = path.join(
      wasmBasePath,
      'tree-sitter-javascript',
      'tree-sitter-javascript.wasm'
    );
    const tsWasmPath = path.join(
      wasmBasePath,
      'tree-sitter-typescript',
      'tree-sitter-typescript.wasm'
    );

    // Simplified initialization with error recovery
    if (typeof ParserClass.init === 'function') {
      await ParserClass.init({
        locateFile: (scriptName: string) => {
          if (scriptName === 'tree-sitter.wasm') {
            return wasmPath;
          }
          return path.join(wasmBasePath, 'web-tree-sitter', scriptName);
        }
      });
    }

    // Load languages with error handling
    if (ParserClass.Language?.load) {
      try {
        jsLanguage = await ParserClass.Language.load(jsWasmPath);
        logger.info('JavaScript language loaded');
      } catch (error) {
        logger.warn('Failed to load JavaScript language:', error);
      }

      try {
        tsLanguage = await ParserClass.Language.load(tsWasmPath);
        logger.info('TypeScript language loaded');
      } catch (error) {
        logger.warn('Failed to load TypeScript language:', error);
      }
    }

    isInitialized = true;
    logger.info('Web-tree-sitter initialization completed');
  } catch (error: unknown) {
    wasmInitializationFailed = true;
    const errorObj = error as Error;
    logger.error('Tree-sitter initialization failed:', errorObj.message);

    // Don't throw error - allow extension to work without tree-sitter
    logger.warn('Extension will continue without AST support');
  }
}

export function isTreeSitterReady(): boolean {
  return (
    isInitialized &&
    !wasmInitializationFailed &&
    ParserClass !== null &&
    (jsLanguage !== null || tsLanguage !== null) // At least one language should work
  );
}

// Fast AST parsing with caching
export function parseCodeWithCache(
  code: string,
  filePath: string,
  languageType: 'javascript' | 'typescript'
): TreeSitterTree | null {
  if (!isTreeSitterReady()) {
    return null;
  }

  const cacheKey = `${filePath}:${languageType}:${code.length}:${Date.now() % 10000}`;
  const cached = parsedTreeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tree;
  }

  try {
    const parser = new ParserClass();
    const language = languageType === 'typescript' ? tsLanguage : jsLanguage;

    if (!language) {
      logger.warn(`Language not available: ${languageType}`);
      return null;
    }

    parser.setLanguage(language);
    const tree = parser.parse(code);

    if (tree) {
      // Clean old cache entries
      const now = Date.now();
      for (const [key, entry] of parsedTreeCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
          parsedTreeCache.delete(key);
        }
      }

      // Cache new result
      parsedTreeCache.set(cacheKey, { tree, timestamp: now });
    }

    return tree;
  } catch (error) {
    logger.error('Failed to parse code:', error);
    return null;
  }
}

// Extract basic AST information quickly
export function extractAstInfo(tree: TreeSitterTree) {
  if (!tree) {
    return null;
  }

  const functions: Array<{ name: string; line: number; complexity: number }> =
    [];
  const classes: Array<{ name: string; line: number }> = [];
  const imports: Array<{ source: string; line: number }> = [];

  function walk(node: TreeSitterNode) {
    switch (node.type) {
      case 'function_declaration':
      case 'function_expression':
      case 'arrow_function':
        const nameNode = node.namedChildren.find(
          child => child.type === 'identifier'
        );
        if (nameNode) {
          functions.push({
            name: nameNode.text,
            line: node.startPosition.row + 1,
            complexity: calculateComplexity(node)
          });
        }
        break;

      case 'class_declaration':
        const classNameNode = node.namedChildren.find(
          child => child.type === 'identifier'
        );
        if (classNameNode) {
          classes.push({
            name: classNameNode.text,
            line: node.startPosition.row + 1
          });
        }
        break;

      case 'import_statement':
        const sourceNode = node.namedChildren.find(
          child => child.type === 'string'
        );
        if (sourceNode) {
          imports.push({
            source: sourceNode.text.slice(1, -1), // Remove quotes
            line: node.startPosition.row + 1
          });
        }
        break;
    }

    // Only traverse named children for performance
    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(tree.rootNode);

  return { functions, classes, imports };
}

// Simple complexity calculation
function calculateComplexity(node: TreeSitterNode): number {
  let complexity = 1; // Base complexity

  function countComplexityNodes(n: TreeSitterNode) {
    const complexityTypes = new Set([
      'if_statement',
      'while_statement',
      'for_statement',
      'switch_statement',
      'try_statement',
      'catch_clause',
      'conditional_expression'
    ]);

    if (complexityTypes.has(n.type)) {
      complexity++;
    }

    for (const child of n.namedChildren) {
      countComplexityNodes(child);
    }
  }

  countComplexityNodes(node);
  return complexity;
}

// Clear cache on demand
export function clearAstCache(): void {
  parsedTreeCache.clear();
  logger.info('AST cache cleared');
}
