import { FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

// Runtime detection of environment for tree-sitter compatibility
const isVSCodeEnvironment = () => {
  return typeof process !== 'undefined' && 
         process.env && 
         (process.env.VSCODE_PID || process.env.VSCODE_CWD);
};

// Dynamic imports for different environments
let nativeTreeSitter: any = null;

// Initialize native tree-sitter for CLI/server environments
if (!isVSCodeEnvironment()) {
  try {
    // Native tree-sitter for CLI/server environments
    const Parser = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TreeSitterTypescript = require('tree-sitter-typescript');
    
    // Initialize native parsers
    const jsParser = new Parser();
    jsParser.setLanguage(JavaScript);
    
    const tsParser = new Parser();
    tsParser.setLanguage(TreeSitterTypescript.typescript);
    
    nativeTreeSitter = { jsParser, tsParser, Parser };
    logger.debug('Using native Tree-sitter for non-VSCode environment');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug('Native Tree-sitter not available', { error: errorMessage });
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
        return nativeTreeSitter.tsParser;
    }
    return nativeTreeSitter.jsParser;
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
            const parser = getNativeParserForFile(fileData.fileName);
            if (!parser) {
                logger.debug('No native parser available for file type');
                return { tree: null, reason: 'Unsupported file type for native parser' };
            }

            logger.debug({ 
                fileName: fileData.fileName, 
                parserType: parser === nativeTreeSitter.jsParser ? 'JavaScript' : 'TypeScript' 
            }, 'Using native Tree-sitter parser');

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