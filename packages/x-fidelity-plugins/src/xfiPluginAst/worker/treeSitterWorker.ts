import { parentPort, isMainThread, workerData } from 'worker_threads';
import { logger } from '@x-fidelity/core';

export interface TreeSitterRequest {
  id: string;
  type: 'initialize' | 'parse' | 'getStatus' | 'shutdown';
  data?: {
    code?: string;
    language?: 'javascript' | 'typescript';
    fileName?: string;
    useWasm?: boolean;
    wasmConfig?: WasmConfig;
  };
}

export interface WasmConfig {
  wasmPath?: string;
  languagesPath?: string;
  timeout?: number;
}

export interface TreeSitterResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface ParseResult {
  tree: any;
  rootNode?: any;
  reason?: string;
  mode?: 'native' | 'wasm' | 'native-direct';
  parseTime?: number;
}

// Worker state
let isInitialized = false;
let initializationFailed = false;
let failureReason: string | null = null;

// Native Tree-sitter state
let ParserClass: any = null;
let jsLanguage: any = null;
let tsLanguage: any = null;

// WASM Tree-sitter state
let wasmParser: any = null;
let wasmLanguages = new Map<string, any>();
let wasmInitialized = false;
let useWasmMode = false;

/**
 * Initialize Tree-sitter in the worker (supports both native and WASM)
 */
async function initialize(config?: { useWasm?: boolean; wasmConfig?: WasmConfig }): Promise<void> {
  if (isInitialized && !initializationFailed) {
    return;
  }

  try {
    useWasmMode = config?.useWasm || false;
    
    if (useWasmMode) {
      logger.info('[TreeSitter Worker] Initializing WASM Tree-sitter...');
      await initializeWasmTreeSitter(config?.wasmConfig);
    } else {
      logger.info('[TreeSitter Worker] Initializing native Tree-sitter...');
      await initializeNativeTreeSitter();
    }

    isInitialized = true;
    initializationFailed = false;
    failureReason = null;
  } catch (error) {
    initializationFailed = true;
    isInitialized = false;
    failureReason = error instanceof Error ? error.message : String(error);
    
    // Try fallback if WASM failed
    if (useWasmMode) {
      logger.warn('[TreeSitter Worker] WASM initialization failed, falling back to native...');
      try {
        useWasmMode = false;
        await initializeNativeTreeSitter();
        isInitialized = true;
        initializationFailed = false;
        failureReason = null;
        logger.info('[TreeSitter Worker] Fallback to native Tree-sitter successful');
      } catch (fallbackError) {
        logger.error('[TreeSitter Worker] Both WASM and native initialization failed');
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Initialize native Tree-sitter
 */
async function initializeNativeTreeSitter(): Promise<void> {
  try {
    const TreeSitter = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TreeSitterTypescript = require('tree-sitter-typescript');
    
    ParserClass = TreeSitter;
    jsLanguage = JavaScript;
    tsLanguage = TreeSitterTypescript.typescript;
    
    logger.info('[TreeSitter Worker] Native Tree-sitter initialized successfully');
  } catch (error) {
    logger.error('[TreeSitter Worker] Failed to initialize native Tree-sitter:', error);
    throw new Error(`Native Tree-sitter initialization failed: ${error}`);
  }
}

/**
 * Initialize WASM Tree-sitter
 */
async function initializeWasmTreeSitter(config?: WasmConfig): Promise<void> {
  try {
    const Parser = require('web-tree-sitter');
    
    // Initialize WASM module with proper file:// URL handling
    await Parser.init({
      locateFile(scriptName: string, scriptDirectory: string) {
        logger.debug(`[TreeSitter Worker] WASM requesting file: ${scriptName} from directory: ${scriptDirectory}`);
        
        if (scriptName === 'tree-sitter.wasm') {
          const wasmPath = config?.wasmPath || `${scriptDirectory}tree-sitter.wasm`;
          
          // Convert to proper file:// URL for Node.js environment
          const path = require('path');
          const filePath = path.resolve(wasmPath);
          
          // Use platform-specific file URL format
          let fileUrl: string;
          if (process.platform === 'win32') {
            // Windows file URLs need special handling
            fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          } else {
            // Unix-like systems (Linux, macOS)
            fileUrl = `file://${filePath}`;
          }
          
          logger.debug(`[TreeSitter Worker] Returning WASM file URL: ${fileUrl}`);
          return fileUrl;
        }
        
        return scriptDirectory + scriptName;
      }
    });

    wasmParser = new Parser();
    wasmInitialized = true;
    
    // Preload common languages
    const languagesPath = config?.languagesPath || './node_modules';
    try {
      // Convert language paths to file:// URLs as well
      const path = require('path');
      
      const jsWasmPath = path.resolve(`${languagesPath}/tree-sitter-javascript/tree-sitter-javascript.wasm`);
      const tsWasmPath = path.resolve(`${languagesPath}/tree-sitter-typescript/tree-sitter-typescript.wasm`);
      
      // Use platform-specific file URL format for language files
      let jsWasmUrl: string, tsWasmUrl: string;
      if (process.platform === 'win32') {
        jsWasmUrl = `file:///${jsWasmPath.replace(/\\/g, '/')}`;
        tsWasmUrl = `file:///${tsWasmPath.replace(/\\/g, '/')}`;
      } else {
        jsWasmUrl = `file://${jsWasmPath}`;
        tsWasmUrl = `file://${tsWasmPath}`;
      }
      
      logger.debug(`[TreeSitter Worker] Loading JavaScript from: ${jsWasmUrl}`);
      logger.debug(`[TreeSitter Worker] Loading TypeScript from: ${tsWasmUrl}`);
      
      const jsLang = await Parser.Language.load(jsWasmUrl);
      const tsLang = await Parser.Language.load(tsWasmUrl);
      
      wasmLanguages.set('javascript', jsLang);
      wasmLanguages.set('typescript', tsLang);
      
      logger.info('[TreeSitter Worker] WASM Tree-sitter initialized with JavaScript and TypeScript');
    } catch (langError) {
      logger.warn('[TreeSitter Worker] Failed to preload WASM languages:', langError);
      // Continue without preloaded languages - they can be loaded on demand
    }
    
  } catch (error) {
    logger.error('[TreeSitter Worker] Failed to initialize WASM Tree-sitter:', error);
    throw new Error(`WASM Tree-sitter initialization failed: ${error}`);
  }
}

/**
 * Convert a Tree-sitter node to a serializable format
 */
function nodeToSerializable(node: any): any {
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
    childCount: node.childCount,
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
 * Get parser status
 */
function getStatus(): any {
  return {
    initialized: isInitialized,
    failed: initializationFailed,
    reason: failureReason,
    mode: useWasmMode ? 'wasm' : 'native',
    wasmAvailable: wasmInitialized,
    nativeAvailable: ParserClass !== null,
    supportedLanguages: useWasmMode ? 
      Array.from(wasmLanguages.keys()) : 
      ['javascript', 'typescript']
  };
}

/**
 * Parse code using Tree-sitter (native or WASM)
 */
async function parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
  if (!isInitialized || initializationFailed) {
    return {
      tree: null,
      reason: `Tree-sitter not initialized: ${failureReason || 'Unknown error'}`,
      mode: useWasmMode ? 'wasm' : 'native'
    };
  }

  const startTime = Date.now();

  try {
    if (useWasmMode) {
      return await parseWithWasm(code, language, fileName, startTime);
    } else {
      return parseWithNative(code, language, fileName, startTime);
    }
  } catch (error) {
    const parseTime = Date.now() - startTime;
    return {
      tree: null,
      reason: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
      mode: useWasmMode ? 'wasm' : 'native',
      parseTime
    };
  }
}

/**
 * Parse with WASM Tree-sitter
 */
async function parseWithWasm(code: string, language: string, fileName: string, startTime: number): Promise<ParseResult> {
  if (!wasmParser) {
    throw new Error('WASM parser not initialized');
  }

  // Get or load language
  let lang = wasmLanguages.get(language);
  if (!lang) {
    try {
      const Parser = require('web-tree-sitter');
      const path = require('path');
      const languagesPath = './node_modules';
      
      // Convert to proper file:// URL for dynamic language loading
      const wasmPath = path.resolve(`${languagesPath}/tree-sitter-${language}/tree-sitter-${language}.wasm`);
      
      // Use platform-specific file URL format
      let wasmUrl: string;
      if (process.platform === 'win32') {
        wasmUrl = `file:///${wasmPath.replace(/\\/g, '/')}`;
      } else {
        wasmUrl = `file://${wasmPath}`;
      }
      
      logger.debug(`[TreeSitter Worker] Dynamically loading ${language} from: ${wasmUrl}`);
      lang = await Parser.Language.load(wasmUrl);
      wasmLanguages.set(language, lang);
    } catch (error) {
      throw new Error(`Failed to load WASM language ${language}: ${error}`);
    }
  }

  wasmParser.setLanguage(lang);
  const tree = wasmParser.parse(code);
  const parseTime = Date.now() - startTime;

  const serializableTree = nodeToSerializable(tree.rootNode);
  
  return {
    tree: serializableTree,
    rootNode: serializableTree,
    mode: 'wasm',
    parseTime
  };
}

/**
 * Parse with native Tree-sitter
 */
function parseWithNative(code: string, language: string, fileName: string, startTime: number): ParseResult {
  const parser = new ParserClass();
  const lang = language === 'typescript' ? tsLanguage : jsLanguage;

  if (!lang) {
    throw new Error(`Language not available: ${language}`);
  }

  parser.setLanguage(lang);
  const tree = parser.parse(code);
  const parseTime = Date.now() - startTime;

  const serializableTree = nodeToSerializable(tree.rootNode);

  return {
    tree: serializableTree,
    rootNode: serializableTree,
    mode: 'native',
    parseTime
  };
}

/**
 * Worker message handler
 */
if (!isMainThread && parentPort) {
  parentPort.on('message', async (request: TreeSitterRequest) => {
    const response: TreeSitterResponse = {
      id: request.id,
      success: false
    };

    try {
      switch (request.type) {
        case 'initialize':
          await initialize({
            useWasm: request.data?.useWasm,
            wasmConfig: request.data?.wasmConfig
          });
          response.success = true;
          response.data = getStatus();
          break;

        case 'parse':
          if (!request.data?.code || !request.data?.language || !request.data?.fileName) {
            throw new Error('Missing required parse parameters');
          }
          const result = await parseCode(
            request.data.code,
            request.data.language,
            request.data.fileName
          );
          response.success = true;
          response.data = result;
          break;

        case 'getStatus':
          response.success = true;
          response.data = getStatus();
          break;

        case 'shutdown':
          response.success = true;
          // Clean up resources
          isInitialized = false;
          ParserClass = null;
          jsLanguage = null;
          tsLanguage = null;
          wasmParser = null;
          wasmLanguages.clear();
          wasmInitialized = false;
          process.exit(0);
          break;

        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
    }

    parentPort!.postMessage(response);
  });

  // Notify that worker is ready
  parentPort.postMessage({ id: 'worker-ready', success: true });
} 