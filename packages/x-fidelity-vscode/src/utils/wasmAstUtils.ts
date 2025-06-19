import { FileData } from '@x-fidelity/types';
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
  if (isInitialized || wasmInitializationFailed) return;
  
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
    
    // Initialize Parser with correct WASM path
    if (ParserClass.init) {
      await ParserClass.init({
        locateFile: (scriptName: string, scriptDirectory: string) => {
          logger.info(`[X-Fidelity VSCode] Locating file: ${scriptName} in ${scriptDirectory}`);
          if (scriptName === 'tree-sitter.wasm') {
            return wasmPath;
          }
          return path.join(scriptDirectory, scriptName);
        }
      });
      logger.info('[X-Fidelity VSCode] Parser initialized successfully');
    } else {
      logger.error('[X-Fidelity VSCode] Parser.init not available');
      throw new Error('Parser.init not available');
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

export interface WasmAstResult {
  tree: any;
  rootNode?: any;
}

export async function generateWasmAst(fileData: FileData): Promise<WasmAstResult> {
  try {
    if (!isInitialized) {
      throw new Error('WASM Tree-sitter not initialized. Call initializeWasmTreeSitter first.');
    }
    
    logger.info(`[X-Fidelity VSCode] Generating WASM AST for: ${fileData?.fileName}`);
    
    if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
      logger.info('[X-Fidelity VSCode] Skipping AST generation - no content or REPO_GLOBAL_CHECK');
      return { tree: null };
    }

    const parser = new ParserClass();
    
    // Select appropriate language based on file extension
    if (fileData.fileName.endsWith('.ts') || fileData.fileName.endsWith('.tsx')) {
      if (!tsLanguage) {
        throw new Error('TypeScript language not loaded');
      }
      parser.setLanguage(tsLanguage);
      logger.info(`[X-Fidelity VSCode] Using TypeScript parser for: ${fileData.fileName}`);
    } else if (fileData.fileName.endsWith('.js') || fileData.fileName.endsWith('.jsx')) {
      if (!jsLanguage) {
        throw new Error('JavaScript language not loaded');
      }
      parser.setLanguage(jsLanguage);
      logger.info(`[X-Fidelity VSCode] Using JavaScript parser for: ${fileData.fileName}`);
    } else {
      logger.info(`[X-Fidelity VSCode] Unsupported file type for AST: ${fileData.fileName}`);
      return { tree: null };
    }

    const tree = parser.parse(fileData.fileContent);
    const rootNode = tree?.rootNode;
    
    logger.info(`[X-Fidelity VSCode] Generated WASM AST for ${fileData.fileName}:`, {
      rootType: rootNode?.type,
      childCount: rootNode?.childCount,
      startPosition: rootNode?.startPosition,
      endPosition: rootNode?.endPosition
    });
    
    return { 
      tree: rootNode,
      rootNode: rootNode
    };
  } catch (error) {
    logger.error(`[X-Fidelity VSCode] Error generating WASM AST for ${fileData?.fileName}:`, error);
    return { tree: null };
  }
}

export function isWasmTreeSitterReady(): boolean {
  return isInitialized && !wasmInitializationFailed && jsLanguage !== null && tsLanguage !== null && ParserClass !== null;
}

export function generateAstFromCode(code: string, fileData: FileData): { tree: any } | null {
  if (!isWasmTreeSitterReady()) {
    logger.debug('[X-Fidelity VSCode] WASM Tree-sitter not ready, cannot generate AST');
    return null;
  }
  
  try {
    const parser = new ParserClass();
    
    // Determine language based on file extension
    const isTypeScript = fileData.fileName.endsWith('.ts') || fileData.fileName.endsWith('.tsx');
    const language = isTypeScript ? tsLanguage : jsLanguage;
    
    if (!language) {
      logger.debug(`[X-Fidelity VSCode] Language not available for ${fileData.fileName}`);
      return null;
    }
    
    parser.setLanguage(language);
    const tree = parser.parse(code);
    
    logger.debug(`[X-Fidelity VSCode] AST generated successfully for ${fileData.fileName}`);
    return { tree };
  } catch (error) {
    logger.error(`[X-Fidelity VSCode] Error generating AST for ${fileData.fileName}: ${error}`);
    return null;
  }
} 