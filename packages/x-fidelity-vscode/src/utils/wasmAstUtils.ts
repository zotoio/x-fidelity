// import { FileData } from '@x-fidelity/types';
import * as vscode from 'vscode';
import { logger } from './logger';
import * as path from 'path';
import * as fs from 'fs';

let isInitialized = false;
let jsLanguage: any = null;
let tsLanguage: any = null;
let wasmInitializationFailed = false;
let ParserClass: any = null;

export async function initializeWasmTreeSitter(extensionContext: vscode.ExtensionContext): Promise<void> {
  if (isInitialized || wasmInitializationFailed) {return;}
  
  try {
    logger.info('[X-Fidelity VSCode] Initializing WASM Tree-sitter...');
    logger.info(`[X-Fidelity VSCode] Extension URI: ${extensionContext.extensionUri.toString()}`);
    logger.info(`[X-Fidelity VSCode] Extension path: ${extensionContext.extensionPath}`);
    
    // Dynamic import to avoid TypeScript issues
    const Parser = await import('web-tree-sitter');
    ParserClass = Parser.default || Parser;
    logger.info('[X-Fidelity VSCode] web-tree-sitter imported successfully');
    
    // Set up WASM paths - use extension path for bundled WASM files
    const wasmPath = path.join(extensionContext.extensionPath, 'dist', 'tree-sitter.wasm');
    const jsWasmPath = path.join(extensionContext.extensionPath, 'dist', 'tree-sitter-javascript.wasm');
    const tsWasmPath = path.join(extensionContext.extensionPath, 'dist', 'tree-sitter-typescript.wasm');
    
    logger.info(`[X-Fidelity VSCode] WASM paths:`);
    logger.info(`[X-Fidelity VSCode] - tree-sitter.wasm: ${wasmPath}`);
    logger.info(`[X-Fidelity VSCode] - javascript.wasm: ${jsWasmPath}`);
    logger.info(`[X-Fidelity VSCode] - typescript.wasm: ${tsWasmPath}`);
    
    // Check if WASM files exist
    const wasmFiles = [
      { name: 'tree-sitter.wasm', path: wasmPath },
      { name: 'tree-sitter-javascript.wasm', path: jsWasmPath },
      { name: 'tree-sitter-typescript.wasm', path: tsWasmPath }
    ];
    
    for (const wasmFile of wasmFiles) {
      if (!fs.existsSync(wasmFile.path)) {
        logger.error(`[X-Fidelity VSCode] WASM file not found: ${wasmFile.name} at ${wasmFile.path}`);
        throw new Error(`WASM file not found: ${wasmFile.name}`);
      } else {
        logger.info(`[X-Fidelity VSCode] WASM file exists: ${wasmFile.name}`);
      }
    }
    
    // Initialize Parser with correct WASM path - handle different web-tree-sitter versions
    try {
      if (typeof ParserClass.init === 'function') {
        await ParserClass.init({
          locateFile: (scriptName: string, scriptDirectory: string) => {
            logger.info(`[X-Fidelity VSCode] Locating file: ${scriptName} in ${scriptDirectory}`);
            if (scriptName === 'tree-sitter.wasm') {
              return wasmPath;
            }
            return path.join(scriptDirectory, scriptName);
          }
        });
        logger.info('[X-Fidelity VSCode] Parser initialized successfully with Parser.init()');
      } else if (typeof ParserClass === 'function') {
        // Some versions don't require explicit init - try direct instantiation
        logger.info('[X-Fidelity VSCode] Parser.init not available, trying direct instantiation');
        // Set the module path for WASM loading
        if (ParserClass.setWasmLocateFile) {
          ParserClass.setWasmLocateFile((scriptName: string) => {
            if (scriptName === 'tree-sitter.wasm') {
              return wasmPath;
            }
            return path.join(extensionContext.extensionPath, 'dist', scriptName);
          });
        }
      } else {
        logger.warn('[X-Fidelity VSCode] Unknown Parser class structure - attempting graceful degradation');
      }
    } catch (initError) {
      logger.warn(`[X-Fidelity VSCode] Parser initialization method failed: ${initError} - attempting fallback`);
      // Continue with language loading - some versions work without explicit init
    }
    
    // Load JavaScript language
    try {
      if (ParserClass.Language && ParserClass.Language.load) {
        jsLanguage = await ParserClass.Language.load(jsWasmPath);
        logger.info('[X-Fidelity VSCode] JavaScript language loaded successfully');
      } else {
        throw new Error('Language.load not available');
      }
    } catch (error) {
      logger.error(`[X-Fidelity VSCode] Failed to load JavaScript language: ${error}`);
      throw error;
    }
    
    // Load TypeScript language
    try {
      if (ParserClass.Language && ParserClass.Language.load) {
        tsLanguage = await ParserClass.Language.load(tsWasmPath);
        logger.info('[X-Fidelity VSCode] TypeScript language loaded successfully');
      } else {
        throw new Error('Language.load not available');
      }
    } catch (error) {
      logger.error(`[X-Fidelity VSCode] Failed to load TypeScript language: ${error}`);
      throw error;
    }
    
    isInitialized = true;
    logger.info('[X-Fidelity VSCode] WASM Tree-sitter initialization completed successfully');
  } catch (error: unknown) {
    wasmInitializationFailed = true;
    const errorObj = error as Error;
    logger.error(`[X-Fidelity VSCode] WASM Tree-sitter initialization failed: ${errorObj.message}`, {
      message: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name,
      extensionPath: extensionContext?.extensionPath
    });
    throw error;
  }
}

export function isWasmTreeSitterReady(): boolean {
  return isInitialized && !wasmInitializationFailed && jsLanguage !== null && tsLanguage !== null && ParserClass !== null;
} 