import { getOptions } from '@x-fidelity/core';

export interface ParseResult {
  tree: any;
  rootNode?: any;
  reason?: string;
  mode?: 'native' | 'wasm' | 'native-direct' | 'wasm-direct';
  parseTime?: number;
}

export interface WasmConfig {
  wasmPath?: string;
  languagesPath?: string;
  timeout?: number;
}

/**
 * Convert Tree-sitter node to serializable format
 * Shared between manager and worker to ensure consistency
 */
export function nodeToSerializable(node: any): any {
  if (!node) return null;

  const result: any = {
    type: node.type,
    text: node.text,
    startPosition: {
      row: node.startPosition.row,
      column: node.startPosition.column
    },
    endPosition: {
      row: node.endPosition.row,
      column: node.endPosition.column
    },
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    childCount: node.childCount || 0,
    children: []
  };

  // Recursively convert children (limit depth to prevent stack overflow)
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result.children.push(nodeToSerializable(child));
    }
  }

  return result;
}

/**
 * Parse code using WASM TreeSitter
 * Shared implementation for consistent behavior
 */
export async function parseWithWasm(
  code: string,
  language: 'javascript' | 'typescript',
  fileName: string,
  wasmConfig?: WasmConfig
): Promise<ParseResult> {
  const startTime = Date.now();
  
  try {
    const TreeSitter = require('web-tree-sitter');
    await TreeSitter.init();
    
    const parser = new TreeSitter();
    const langName = language === 'typescript' ? 'typescript' : 'javascript';
    
    // Use provided config or fall back to options
    const options = getOptions();
    const languagesPath = wasmConfig?.languagesPath || options.wasmLanguagesPath || './node_modules/web-tree-sitter';
    
    let wasmUrl: string;
    const wasmPath = `${languagesPath}/tree-sitter-${langName}.wasm`;
    
    // Handle different URL formats for dynamic loading
    if (wasmPath.startsWith('http')) {
      wasmUrl = wasmPath;
    } else {
      // Convert to proper file:// URL for local files
      const path = require('path');
      const resolvedPath = path.resolve(wasmPath);
      
      if (process.platform === 'win32') {
        wasmUrl = `file:///${resolvedPath.replace(/\\/g, '/')}`;
      } else {
        wasmUrl = `file://${resolvedPath}`;
      }
    }
    
    const lang = await TreeSitter.Language.load(wasmUrl);
    parser.setLanguage(lang);
    
    const tree = parser.parse(code);
    const parseTime = Date.now() - startTime;
    
    return {
      tree: nodeToSerializable(tree.rootNode),
      mode: 'wasm',
      parseTime
    };
  } catch (error) {
    const parseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      tree: null,
      reason: `WASM parsing failed: ${errorMessage}`,
      mode: 'wasm',
      parseTime
    };
  }
}

/**
 * Parse code using native TreeSitter
 * Shared implementation for consistent behavior
 */
export function parseWithNative(
  code: string,
  language: 'javascript' | 'typescript',
  fileName: string
): ParseResult {
  const startTime = Date.now();
  
  try {
    const TreeSitter = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TreeSitterTypescript = require('tree-sitter-typescript');
    
    const parser = new TreeSitter();
    const lang = language === 'typescript' ? TreeSitterTypescript.typescript : JavaScript;
    
    if (!lang) {
      throw new Error(`Language not available: ${language}`);
    }
    
    parser.setLanguage(lang);
    const tree = parser.parse(code);
    const parseTime = Date.now() - startTime;
    
    return {
      tree: nodeToSerializable(tree.rootNode),
      mode: 'native',
      parseTime
    };
  } catch (error) {
    const parseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      tree: null,
      reason: `Native parsing failed: ${errorMessage}`,
      mode: 'native',
      parseTime
    };
  }
}

/**
 * Universal TreeSitter parser that handles both WASM and native modes
 * Can be used by both manager and worker for consistent parsing behavior
 */
export async function parseCode(
  code: string,
  language: 'javascript' | 'typescript',
  fileName: string,
  options?: {
    useWasm?: boolean;
    wasmConfig?: WasmConfig;
    mode?: 'direct' | 'worker';
  }
): Promise<ParseResult> {
  const useWasm = options?.useWasm || false;
  const mode = options?.mode || 'direct';
  
  try {
    let result: ParseResult;
    
    if (useWasm) {
      result = await parseWithWasm(code, language, fileName, options?.wasmConfig);
    } else {
      result = parseWithNative(code, language, fileName);
    }
    
    // Adjust mode based on context (direct vs worker)
    if (result.mode && mode === 'direct') {
      result.mode = (result.mode + '-direct') as any;
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const modeStr = useWasm ? 'wasm' : 'native';
    const fullMode = mode === 'direct' ? `${modeStr}-direct` : modeStr;
    
    return {
      tree: null,
      reason: `TreeSitter parsing failed: ${errorMessage}`,
      mode: fullMode as any,
      parseTime: 0
    };
  }
}

/**
 * Check if TreeSitter dependencies are available
 */
export function checkTreeSitterAvailability(): {
  nativeAvailable: boolean;
  wasmAvailable: boolean;
  supportedLanguages: string[];
} {
  let nativeAvailable = false;
  let wasmAvailable = false;
  
  // Check native TreeSitter
  try {
    require.resolve('tree-sitter');
    require.resolve('tree-sitter-javascript');
    require.resolve('tree-sitter-typescript');
    nativeAvailable = true;
  } catch {
    // Native not available
  }
  
  // Check WASM TreeSitter
  try {
    require.resolve('web-tree-sitter');
    wasmAvailable = true;
  } catch {
    // WASM not available
  }
  
  return {
    nativeAvailable,
    wasmAvailable,
    supportedLanguages: ['javascript', 'typescript']
  };
} 