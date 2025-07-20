import { parentPort, isMainThread, workerData } from 'worker_threads';
import { logger } from '@x-fidelity/core';
import { 
  ParseResult, 
  WasmConfig, 
  parseCode as sharedParseCode,
  checkTreeSitterAvailability 
} from './treeSitterUtils';

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
      path.join(dir, 'tree-sitter-javascript.wasm'),
      path.join(dir, 'tree-sitter-typescript.wasm'),
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

export interface TreeSitterResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
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
          // 🎯 PRIORITY: Use VSCode extension path if provided via environment
          const vscodeExtensionPath = process.env.XFI_VSCODE_EXTENSION_PATH;
          let wasmPath: string;
          
          if (vscodeExtensionPath) {
            // In VSCode extension mode, use the bundled tree-sitter.wasm from CLI node_modules
            wasmPath = config?.wasmPath || `${vscodeExtensionPath}/dist/cli/node_modules/web-tree-sitter/tree-sitter.wasm`;
          } else {
            // Fallback to CLI installation directory detection
            const cliInstallDir = getCLIInstallationDirectory();
            wasmPath = config?.wasmPath || `${cliInstallDir}/tree-sitter.wasm`;
          }
          
          // 🎯 FIXED: In Node.js environment, return direct file path, not file:// URL
          const path = require('path');
          const filePath = path.resolve(wasmPath);
          
          logger.debug(`[TreeSitter Worker] Returning WASM file path: ${filePath}`);
          return filePath;
        }
        
        return scriptDirectory + scriptName;
      }
    });

    wasmParser = new Parser();
    wasmInitialized = true;
    
    // Preload common languages
    // 🎯 FIXED: Use CLI installation directory and detect correct language files location
    const cliInstallDir = getCLIInstallationDirectory();
    const languagesPath = config?.languagesPath || getWasmLanguagesDirectory(cliInstallDir);
    try {
      // 🎯 FIXED: Use direct file paths instead of file:// URLs for Node.js
      const path = require('path');
      
      const jsWasmPath = path.resolve(`${languagesPath}/tree-sitter-javascript.wasm`);
      const tsWasmPath = path.resolve(`${languagesPath}/tree-sitter-typescript.wasm`);
      
      // 🎯 NO MORE file:// URLs - use direct paths for Node.js environment
      logger.debug(`[TreeSitter Worker] Loading JavaScript WASM: ${jsWasmPath}`);
      logger.debug(`[TreeSitter Worker] Loading TypeScript WASM: ${tsWasmPath}`);
      
      // Verify files exist before attempting to load
      const fs = require('fs');
      if (fs.existsSync(jsWasmPath)) {
        const jsLang = await Parser.Language.load(jsWasmPath);
        wasmLanguages.set('javascript', jsLang);
        logger.debug('[TreeSitter Worker] JavaScript language loaded successfully');
      } else {
        logger.warn(`[TreeSitter Worker] JavaScript WASM not found: ${jsWasmPath}`);
      }
      
      if (fs.existsSync(tsWasmPath)) {
        const tsLang = await Parser.Language.load(tsWasmPath);
        wasmLanguages.set('typescript', tsLang);
        logger.debug('[TreeSitter Worker] TypeScript language loaded successfully');
      } else {
        logger.warn(`[TreeSitter Worker] TypeScript WASM not found: ${tsWasmPath}`);
      }
      
      logger.info(`[TreeSitter Worker] WASM Tree-sitter initialized with ${wasmLanguages.size} languages`);
    } catch (languageError) {
      logger.warn(`[TreeSitter Worker] Failed to preload languages: ${languageError}`);
      // Continue without preloaded languages - they can be loaded on demand
    }
    
  } catch (error) {
    logger.error('[TreeSitter Worker] Failed to initialize WASM Tree-sitter:', error);
    throw new Error(`WASM Tree-sitter initialization failed: ${error}`);
  }
}

/**
 * Get parser status using shared availability checker
 */
function getStatus(): any {
  const availability = checkTreeSitterAvailability();
  
  return {
    initialized: isInitialized,
    failed: initializationFailed,
    reason: failureReason,
    mode: useWasmMode ? 'wasm' : 'native',
    wasmAvailable: availability.wasmAvailable,
    nativeAvailable: availability.nativeAvailable,
    supportedLanguages: availability.supportedLanguages
  };
}

/**
 * Parse code using Tree-sitter (native or WASM) via shared utilities
 */
async function parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
  if (!isInitialized || initializationFailed) {
    return {
      tree: null,
      reason: `Tree-sitter not initialized: ${failureReason || 'Unknown error'}`,
      mode: useWasmMode ? 'wasm' : 'native'
    };
  }

  // Use shared parsing utilities for consistency
  return sharedParseCode(code, language, fileName, {
    useWasm: useWasmMode,
    wasmConfig: {
      wasmPath: undefined, // Let shared utils use defaults
      languagesPath: undefined,
      timeout: undefined
    },
    mode: 'worker'
  });
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