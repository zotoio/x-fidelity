import { Parser, Language } from 'web-tree-sitter';
import { FileData } from '@x-fidelity/types';
import * as vscode from 'vscode';

let isInitialized = false;
let jsLanguage: Language | null = null;
let tsLanguage: Language | null = null;

export async function initializeWasmTreeSitter(extensionContext: vscode.ExtensionContext): Promise<void> {
  if (isInitialized) return;
  
  try {
    console.log('[X-Fidelity VSCode] Initializing WASM Tree-sitter...');
    console.log('[X-Fidelity VSCode] Extension URI:', extensionContext.extensionUri.toString());
    
    // Check if WASM files exist before trying to load them
    const wasmFiles = [
      'tree-sitter.wasm',
      'tree-sitter-javascript.wasm', 
      'tree-sitter-typescript.wasm'
    ];
    
    for (const wasmFile of wasmFiles) {
      const wasmPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', wasmFile);
      try {
        const stat = await vscode.workspace.fs.stat(wasmPath);
        console.log(`[X-Fidelity VSCode] Found ${wasmFile} (${stat.size} bytes) at:`, wasmPath.fsPath);
      } catch (error) {
        console.error(`[X-Fidelity VSCode] Missing ${wasmFile} at:`, wasmPath.fsPath);
        throw new Error(`Required WASM file ${wasmFile} not found at ${wasmPath.fsPath}`);
      }
    }
    
    // Initialize web-tree-sitter with enhanced error handling
    console.log('[X-Fidelity VSCode] Initializing Parser...');
    await Parser.init({
      locateFile(scriptName: string, scriptDirectory: string) {
        const path = vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', scriptName).fsPath;
        console.log(`[X-Fidelity VSCode] Locating file: ${scriptName} -> ${path}`);
        return path;
      }
    });
    
    console.log('[X-Fidelity VSCode] Parser initialized, loading language grammars...');
    
    // Load JavaScript grammar with better error handling
    try {
      const jsWasmPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', 'tree-sitter-javascript.wasm').fsPath;
      console.log('[X-Fidelity VSCode] Loading JavaScript grammar from:', jsWasmPath);
      jsLanguage = await Language.load(jsWasmPath);
      console.log('[X-Fidelity VSCode] JavaScript grammar loaded successfully');
    } catch (error) {
      console.error('[X-Fidelity VSCode] Failed to load JavaScript grammar:', error);
      throw new Error(`Failed to load JavaScript grammar: ${error}`);
    }
    
    // Load TypeScript grammar with better error handling
    try {
      const tsWasmPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', 'tree-sitter-typescript.wasm').fsPath;
      console.log('[X-Fidelity VSCode] Loading TypeScript grammar from:', tsWasmPath);
      tsLanguage = await Language.load(tsWasmPath);
      console.log('[X-Fidelity VSCode] TypeScript grammar loaded successfully');
    } catch (error) {
      console.error('[X-Fidelity VSCode] Failed to load TypeScript grammar:', error);
      throw new Error(`Failed to load TypeScript grammar: ${error}`);
    }
    
    isInitialized = true;
    console.log('[X-Fidelity VSCode] WASM Tree-sitter initialized successfully');
  } catch (error) {
    console.error('[X-Fidelity VSCode] Failed to initialize WASM Tree-sitter:', error);
    const errorObj = error as Error;
    console.error('[X-Fidelity VSCode] Error details:', {
      message: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name
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
    
    console.log(`[X-Fidelity VSCode] Generating WASM AST for: ${fileData?.fileName}`);
    
    if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
      console.log('[X-Fidelity VSCode] Skipping AST generation - no content or REPO_GLOBAL_CHECK');
      return { tree: null };
    }

    const parser = new Parser();
    
    // Select appropriate language based on file extension
    if (fileData.fileName.endsWith('.ts') || fileData.fileName.endsWith('.tsx')) {
      if (!tsLanguage) {
        throw new Error('TypeScript language not loaded');
      }
      parser.setLanguage(tsLanguage);
      console.log(`[X-Fidelity VSCode] Using TypeScript parser for: ${fileData.fileName}`);
    } else if (fileData.fileName.endsWith('.js') || fileData.fileName.endsWith('.jsx')) {
      if (!jsLanguage) {
        throw new Error('JavaScript language not loaded');
      }
      parser.setLanguage(jsLanguage);
      console.log(`[X-Fidelity VSCode] Using JavaScript parser for: ${fileData.fileName}`);
    } else {
      console.log(`[X-Fidelity VSCode] Unsupported file type for AST: ${fileData.fileName}`);
      return { tree: null };
    }

    const tree = parser.parse(fileData.fileContent);
    const rootNode = tree?.rootNode;
    
    console.log(`[X-Fidelity VSCode] Generated WASM AST for ${fileData.fileName}:`, {
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
    console.error(`[X-Fidelity VSCode] Error generating WASM AST for ${fileData?.fileName}:`, error);
    return { tree: null };
  }
}

export function isWasmTreeSitterReady(): boolean {
  return isInitialized && jsLanguage !== null && tsLanguage !== null;
} 