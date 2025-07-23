import { getOptions } from '@x-fidelity/core';

/**
 * Get the CLI installation directory for bundled assets
 * This works for both VSCode extension and standalone CLI scenarios
 */
function getCLIInstallationDirectory(): string {
  const path = require('path');
  
  // Try multiple detection methods in order of reliability
  const possiblePaths = [
    // 1. Main module filename (most reliable for bundled CLI)
    require.main?.filename,
    // 2. Current script location
    process.argv[1],
    // 3. Current working directory (fallback)
    process.cwd()
  ].filter(Boolean);
  
  for (const candidatePath of possiblePaths) {
    if (!candidatePath) continue;
    
    const dir = path.dirname(candidatePath);
    
    // Check if this looks like a CLI installation directory
    const fs = require('fs');
    
    // Look for WASM files in the expected bundled location
    const wasmIndicators = [
      path.join(dir, 'tree-sitter.wasm'),
      path.join(dir, 'wasm', 'tree-sitter.wasm'),  // VSCode extension structure
      path.join(dir, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm'),  // CLI node_modules
      path.join(dir, '..', 'wasm'),  // VSCode: cli/.. -> wasm
      path.join(dir, 'web-tree-sitter')  // Directory containing WASM files
    ];
    
    const hasWasmFiles = wasmIndicators.some(indicator => {
      try {
        return fs.existsSync(indicator);
      } catch {
        return false;
      }
    });
    
    if (hasWasmFiles) {
      return dir;
    }
  }
  
  // Fallback: use the directory where this module is located
  // This works when the CLI is bundled and WASM files are co-located
  return path.dirname(require.main?.filename || process.argv[1] || __dirname);
}

/**
 * Get the correct WASM language files directory
 * This handles the different bundling structures between VSCode and standalone CLI
 */
function getWasmLanguagesDirectory(cliInstallDir: string): string {
  const path = require('path');
  const fs = require('fs');
  
  // 🎯 PRIORITY: Use VSCode extension path if provided via environment
  const vscodeExtensionPath = process.env.XFI_VSCODE_EXTENSION_PATH;
  if (vscodeExtensionPath) {
    const vscodeWasmPath = path.join(vscodeExtensionPath, 'dist', 'wasm');
    try {
      // Verify the VSCode WASM directory exists and has TypeScript WASM file
      const tsWasmPath = path.join(vscodeWasmPath, 'tree-sitter-typescript.wasm');
      if (fs.existsSync(tsWasmPath)) {
        return vscodeWasmPath;
      }
    } catch {
      // Continue with fallback logic if VSCode path fails
    }
  }
  
  // Try different possible locations for language WASM files
  const possibleLanguagePaths = [
    // VSCode extension: language files in wasm directory
    path.join(cliInstallDir, '..', 'wasm'),
    path.join(cliInstallDir, 'wasm'),
    // CLI bundled: language files co-located with CLI
    cliInstallDir,
    // CLI node_modules: language files in web-tree-sitter directory  
    path.join(cliInstallDir, 'node_modules', 'web-tree-sitter'),
    // Fallback: standard node_modules structure
    path.join(cliInstallDir, 'node_modules')
  ];
  
  for (const langPath of possibleLanguagePaths) {
    try {
      // Check if TypeScript WASM file exists (good indicator)
      const tsWasmPath = path.join(langPath, 'tree-sitter-typescript.wasm');
      if (fs.existsSync(tsWasmPath)) {
        return langPath;
      }
    } catch {
      continue;
    }
  }
  
  // Fallback to CLI installation directory
  return cliInstallDir;
}

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
    // 🎯 FIXED: Use correct web-tree-sitter v0.25.0+ API
    let Parser: any;
    let TreeSitterModule: any;
    
    try {
      // Try v0.25.0+ API first (destructured import)
      TreeSitterModule = require('web-tree-sitter');
      Parser = TreeSitterModule.Parser || TreeSitterModule.default?.Parser;
      
      if (!Parser) {
        // Fallback: whole module might be the Parser class
        Parser = TreeSitterModule.default || TreeSitterModule;
      }
      
      if (typeof Parser.init === 'function') {
        await Parser.init();
      } else {
        throw new Error('Parser.init is not available - checking for alternative APIs');
      }
    } catch (initError) {
      // Fallback for older versions or different module structures
      const errorMsg = initError instanceof Error ? initError.message : String(initError);
      throw new Error(`WASM parsing failed: ${errorMsg}`);
    }
    
    const parser = new Parser();
    const langName = language === 'typescript' ? 'typescript' : 'javascript';
    
    // Use provided config or fall back to options
    const options = getOptions();
    // 🎯 FIXED: Use CLI installation directory and detect correct language files location
    const cliInstallDir = getCLIInstallationDirectory();
    const languagesPath = wasmConfig?.languagesPath || options.wasmLanguagesPath || getWasmLanguagesDirectory(cliInstallDir);
    
    let wasmPath: string;
    wasmPath = `${languagesPath}/tree-sitter-${langName}.wasm`;
    
    // 🎯 FIXED: In Node.js environment, use direct file paths, not file:// URLs
    // Handle different URL formats for dynamic loading
    if (wasmPath.startsWith('http')) {
      // HTTP URLs can be used directly
      // wasmUrl = wasmPath; (kept as wasmPath for consistency)
    } else {
      // For local files in Node.js, use resolved file path directly
      const path = require('path');
      wasmPath = path.resolve(wasmPath);
      
      // 🎯 NO MORE file:// URLs - use direct path for Node.js
      // const fs = require('fs');
      // if (!fs.existsSync(wasmPath)) {
      //   throw new Error(`WASM file not found: ${wasmPath}`);
      // }
    }

    // 🎯 FIXED: Use Parser.Language instead of TreeSitter.Language
    const Language = TreeSitterModule.Language || Parser.Language;
    if (!Language) {
      throw new Error('Language loader not found in web-tree-sitter module');
    }
    
    const lang = await Language.load(wasmPath);
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