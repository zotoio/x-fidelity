import { FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

// Runtime detection of environment for tree-sitter compatibility
const isVSCodeEnvironment = () => {
  return typeof process !== 'undefined' && 
         process.env && 
         (process.env.VSCODE_PID || process.env.VSCODE_CWD);
};

// Global reference to VSCode WASM utils when available
let vscodeWasmUtils: any = null;

// Function to set VSCode WASM utils from extension context
export function setVSCodeWasmUtils(wasmUtils: any) {
  vscodeWasmUtils = wasmUtils;
  logger.debug('VSCode WASM utils set for AST generation');
}

// Dynamic imports for different environments
let nativeTreeSitter: any = null;

// Initialize native tree-sitter for CLI/server environments
if (!isVSCodeEnvironment()) {
  try {
    // Native tree-sitter for CLI/server environments
    const Parser = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TreeSitterTypescript = require('tree-sitter-typescript');
    
    nativeTreeSitter = {
      Parser,
      JavaScript,
      TypeScript: TreeSitterTypescript.typescript
    };
    logger.debug('Native tree-sitter initialized for CLI/server environment');
  } catch (error) {
    logger.debug('Native tree-sitter not available, will use graceful degradation');
  }
}

export interface AstResult {
    tree: any;
    rootNode?: any;
    reason?: string;
}

function getNativeParserForFile(fileName: string): any {
    if (!nativeTreeSitter) return null;
    
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
        return nativeTreeSitter.TypeScript;
    }
    return nativeTreeSitter.JavaScript;
}

export async function generateAst(fileData: FileData): Promise<AstResult> {
    try {
        logger.debug({ fileName: fileData?.fileName }, 'Processing file for AST generation with Tree-sitter');
        
        if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
            logger.debug('Skipping AST generation - no content or REPO_GLOBAL_CHECK');
            return { tree: null, reason: 'No content or repo-level check' };
        }

        // In VSCode environment, AST functionality is handled by the extension
        if (isVSCodeEnvironment()) {
            logger.debug('VSCode environment - AST handled by extension context');
            return { 
                tree: null, 
                reason: 'VSCode environment - AST handled by extension'
            };
        }

        // Fallback to native tree-sitter (for CLI/server environments)
        if (nativeTreeSitter) {
            const language = getNativeParserForFile(fileData.fileName);
            if (!language) {
                logger.debug('No native parser available for file type');
                return { tree: null, reason: 'Unsupported file type for native parser' };
            }

            logger.debug({ 
                fileName: fileData.fileName, 
                parserType: language === nativeTreeSitter.TypeScript ? 'TypeScript' : 'JavaScript' 
            }, 'Using native Tree-sitter parser');

            // Create parser instance and set language
            const parser = new nativeTreeSitter.Parser();
            parser.setLanguage(language);
            const parseTree = parser.parse(fileData.fileContent);
            const rootNode = parseTree.rootNode;
            
            logger.debug({ 
                fileName: fileData.fileName,
                rootType: rootNode.type,
                childCount: rootNode.childCount,
                startPosition: rootNode.startPosition,
                endPosition: rootNode.endPosition
            }, 'Generated native Tree-sitter AST');

            return { 
                tree: rootNode,
                rootNode: rootNode
            };
        }

        // No parser available
        logger.debug('No Tree-sitter parser available');
        return { 
            tree: null, 
            reason: 'No tree-sitter parser available'
        };
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error generating Tree-sitter AST: ${errorMessage}`);
        return { 
            tree: null, 
            reason: `AST generation failed: ${errorMessage}`
        };
    }
}

export function generateAstFromCode(code: string, fileData: FileData): { tree: any; reason?: string } {
    try {
        // In VSCode environment, try to use WASM if available
        if (isVSCodeEnvironment()) {
            try {
                // Check if VSCode WASM utils are available and ready
                if (vscodeWasmUtils && typeof vscodeWasmUtils.generateAstFromCode === 'function') {
                    logger.debug(`Using VSCode WASM utils for AST generation: ${fileData.fileName}`);
                    const result = vscodeWasmUtils.generateAstFromCode(code, fileData);
                    if (result && result.tree) {
                        return result;
                    }
                }
                
                // Fallback: Try to use global WASM if available (for development/debugging)
                if (typeof globalThis !== 'undefined' && (globalThis as any).wasmTreeSitter) {
                    logger.debug(`Using global WASM tree-sitter for ${fileData.fileName}`);
                    const wasmTreeSitter = (globalThis as any).wasmTreeSitter;
                    if (wasmTreeSitter.generateAstFromCode) {
                        const result = wasmTreeSitter.generateAstFromCode(code, fileData);
                        if (result && result.tree) {
                            return result;
                        }
                    }
                }
                
                logger.debug('VSCode WASM not available, using graceful degradation');
                return { 
                    tree: null, 
                    reason: 'VSCode WASM not available - AST features disabled'
                };
            } catch (wasmError: unknown) {
                const errorMessage = wasmError instanceof Error ? wasmError.message : String(wasmError);
                logger.debug(`VSCode WASM error: ${errorMessage}`);
                return { 
                    tree: null, 
                    reason: `VSCode WASM error: ${errorMessage}`
                };
            }
        }

        // CLI/Server environment - use native tree-sitter
        if (nativeTreeSitter) {
            logger.debug(`Using native tree-sitter for ${fileData.fileName}`);
            const parser = new nativeTreeSitter.Parser();
            
            // Determine language based on file extension
            const isTypeScript = fileData.fileName.endsWith('.ts') || fileData.fileName.endsWith('.tsx');
            const language = isTypeScript ? nativeTreeSitter.TypeScript : nativeTreeSitter.JavaScript;
            
            parser.setLanguage(language);
            const tree = parser.parse(code);
            
            return { tree };
        }

        // Fallback for environments without tree-sitter support
        logger.debug(`No tree-sitter available for ${fileData.fileName}, using graceful degradation`);
        return { 
            tree: null, 
            reason: 'Tree-sitter not available in this environment'
        };
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.debug(`AST generation failed for ${fileData.fileName}: ${errorMessage}`);
        return { 
            tree: null, 
            reason: `AST generation failed: ${errorMessage}`
        };
    }
} 