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
let failureReason: string | null = null;

export interface WasmStatus {
  isInitialized: boolean;
  hasFailed: boolean;
  hasLanguages: boolean;
  hasParser: boolean;
  failureReason?: string;
}

export async function initializeWasmTreeSitter(
  extensionContext: vscode.ExtensionContext
): Promise<void> {
  if (isInitialized && !wasmInitializationFailed) {
    logger.info('[X-Fidelity VSCode] WASM Tree-sitter already initialized');
    return;
  }

  if (wasmInitializationFailed) {
    logger.warn(
      '[X-Fidelity VSCode] WASM Tree-sitter previously failed, attempting re-initialization'
    );
    resetWasmTreeSitter();
  }

  try {
    logger.info('[X-Fidelity VSCode] Initializing WASM Tree-sitter...');
    logger.info(
      `[X-Fidelity VSCode] Extension URI: ${extensionContext.extensionUri.toString()}`
    );

    // Dynamic import with better error handling
    const Parser = await import('web-tree-sitter');
    ParserClass = Parser.default || Parser;

    if (!ParserClass) {
      throw new Error('Failed to import web-tree-sitter: ParserClass is null');
    }

    logger.info('[X-Fidelity VSCode] web-tree-sitter imported successfully');

    // Set up WASM paths - more robust path resolution
    const distDir = path.join(extensionContext.extensionPath, 'dist');
    const wasmPath = path.join(distDir, 'tree-sitter.wasm');
    const jsWasmPath = path.join(distDir, 'tree-sitter-javascript.wasm');
    const tsWasmPath = path.join(distDir, 'tree-sitter-typescript.wasm');

    logger.info(`[X-Fidelity VSCode] WASM paths:`, {
      distDir,
      wasmPath: wasmPath,
      jsWasmPath: jsWasmPath,
      tsWasmPath: tsWasmPath
    });

    // Enhanced WASM file validation
    const wasmFiles = [
      { name: 'tree-sitter.wasm', path: wasmPath, required: true },
      { name: 'tree-sitter-javascript.wasm', path: jsWasmPath, required: true },
      { name: 'tree-sitter-typescript.wasm', path: tsWasmPath, required: true }
    ];

    const missingFiles: string[] = [];
    for (const wasmFile of wasmFiles) {
      if (!fs.existsSync(wasmFile.path)) {
        missingFiles.push(wasmFile.name);
        logger.error(
          `[X-Fidelity VSCode] WASM file not found: ${wasmFile.name} at ${wasmFile.path}`
        );
      } else {
        const stats = fs.statSync(wasmFile.path);
        logger.info(
          `[X-Fidelity VSCode] WASM file exists: ${wasmFile.name} (${stats.size} bytes)`
        );
      }
    }

    if (missingFiles.length > 0) {
      const errorMsg = `Critical WASM files missing: ${missingFiles.join(', ')}. Extension build may be incomplete.`;
      throw new Error(errorMsg);
    }

    // Enhanced Parser initialization with timeout protection
    const initTimeout = 5000; // 5 second timeout
    const initPromise = initializeParser(wasmPath, distDir);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('WASM initialization timeout')),
        initTimeout
      );
    });

    await Promise.race([initPromise, timeoutPromise]);
    logger.info('[X-Fidelity VSCode] Parser initialized successfully');

    // Load languages with enhanced error handling
    await loadLanguages(jsWasmPath, tsWasmPath);

    isInitialized = true;
    wasmInitializationFailed = false;
    failureReason = null;

    logger.info(
      '[X-Fidelity VSCode] WASM Tree-sitter initialization completed successfully'
    );
  } catch (error: unknown) {
    wasmInitializationFailed = true;
    isInitialized = false;

    const errorObj = error as Error;
    failureReason = errorObj.message;

    logger.error(
      `[X-Fidelity VSCode] WASM Tree-sitter initialization failed: ${errorObj.message}`,
      {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
        extensionPath: extensionContext?.extensionPath
      }
    );
    throw error;
  }
}

async function initializeParser(
  wasmPath: string,
  distDir: string
): Promise<void> {
  try {
    if (typeof ParserClass.init === 'function') {
      await ParserClass.init({
        locateFile: (scriptName: string, scriptDirectory: string) => {
          logger.info(
            `[X-Fidelity VSCode] Locating file: ${scriptName} in ${scriptDirectory}`
          );
          if (scriptName === 'tree-sitter.wasm') {
            return wasmPath;
          }
          return path.join(distDir, scriptName);
        }
      });
      logger.info('[X-Fidelity VSCode] Parser initialized with Parser.init()');
    } else if (typeof ParserClass === 'function') {
      // Some versions don't require explicit init
      logger.info(
        '[X-Fidelity VSCode] Parser.init not available, using direct instantiation'
      );

      // Set WASM locate function if available
      if (ParserClass.setWasmLocateFile) {
        ParserClass.setWasmLocateFile((scriptName: string) => {
          if (scriptName === 'tree-sitter.wasm') {
            return wasmPath;
          }
          return path.join(distDir, scriptName);
        });
      }
    } else {
      throw new Error('Unknown Parser class structure - cannot initialize');
    }
  } catch (initError) {
    logger.warn(
      `[X-Fidelity VSCode] Standard initialization failed: ${initError} - attempting fallback`
    );
    // Continue - some versions work without explicit init
  }
}

async function loadLanguages(
  jsWasmPath: string,
  tsWasmPath: string
): Promise<void> {
  // Load JavaScript language
  try {
    if (ParserClass.Language && ParserClass.Language.load) {
      jsLanguage = await ParserClass.Language.load(jsWasmPath);
      logger.info(
        '[X-Fidelity VSCode] JavaScript language loaded successfully'
      );
    } else {
      throw new Error('Language.load not available');
    }
  } catch (error) {
    logger.error(
      `[X-Fidelity VSCode] Failed to load JavaScript language: ${error}`
    );
    throw new Error(`JavaScript language loading failed: ${error}`);
  }

  // Load TypeScript language
  try {
    if (ParserClass.Language && ParserClass.Language.load) {
      tsLanguage = await ParserClass.Language.load(tsWasmPath);
      logger.info(
        '[X-Fidelity VSCode] TypeScript language loaded successfully'
      );
    } else {
      throw new Error('Language.load not available');
    }
  } catch (error) {
    logger.error(
      `[X-Fidelity VSCode] Failed to load TypeScript language: ${error}`
    );
    throw new Error(`TypeScript language loading failed: ${error}`);
  }
}

export function isWasmTreeSitterReady(): boolean {
  return (
    isInitialized &&
    !wasmInitializationFailed &&
    jsLanguage !== null &&
    tsLanguage !== null &&
    ParserClass !== null
  );
}

export function getWasmStatus(): WasmStatus {
  return {
    isInitialized,
    hasFailed: wasmInitializationFailed,
    hasLanguages: jsLanguage !== null && tsLanguage !== null,
    hasParser: ParserClass !== null,
    failureReason: failureReason || undefined
  };
}

export function resetWasmTreeSitter(): void {
  logger.info('[X-Fidelity VSCode] Resetting WASM Tree-sitter state');
  isInitialized = false;
  jsLanguage = null;
  tsLanguage = null;
  wasmInitializationFailed = false;
  ParserClass = null;
  failureReason = null;
}

export function createParser(): any {
  if (!isWasmTreeSitterReady()) {
    throw new Error(
      'WASM Tree-sitter not ready. Call initializeWasmTreeSitter() first.'
    );
  }

  return new ParserClass();
}

export function getJavaScriptLanguage(): any {
  if (!jsLanguage) {
    throw new Error('JavaScript language not loaded');
  }
  return jsLanguage;
}

export function getTypeScriptLanguage(): any {
  if (!tsLanguage) {
    throw new Error('TypeScript language not loaded');
  }
  return tsLanguage;
}

export async function parseCode(
  code: string,
  language: 'javascript' | 'typescript'
): Promise<any> {
  if (!isWasmTreeSitterReady()) {
    throw new Error('WASM Tree-sitter not ready');
  }

  const parser = createParser();
  const lang =
    language === 'javascript'
      ? getJavaScriptLanguage()
      : getTypeScriptLanguage();

  parser.setLanguage(lang);
  return parser.parse(code);
}
