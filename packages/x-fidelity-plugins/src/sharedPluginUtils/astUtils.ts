import { FileData, AstResult } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { treeSitterManager } from './astUtils/treeSitterManager';

// Environment detection - simplified since we use native everywhere
const isVSCodeEnvironment = () => {
  // Check for Electron environment (VSCode runs in Electron)
  return typeof process !== 'undefined' && process.versions && process.versions.electron;
};

/**
 * Get language type from file name
 */
function getLanguageFromFileName(fileName: string): 'javascript' | 'typescript' | null {
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
    return 'typescript';
  }
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
    return 'javascript';
  }
  return null;
}

export async function generateAst(fileData: FileData): Promise<AstResult> {
    try {
        logger.debug({ fileName: fileData?.fileName }, 'Processing file for AST generation with centralized Tree-sitter worker');
        
        if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
            logger.debug('Skipping AST generation - no content or REPO_GLOBAL_CHECK');
            return { tree: null, reason: 'No content or repo-level check' };
        }

        // Get language from file extension
        const language = getLanguageFromFileName(fileData.fileName);
        if (!language) {
            logger.debug('Unsupported file type for AST generation');
            return { tree: null, reason: 'Unsupported file type' };
        }

        // TreeSitterManager now handles auto-initialization internally
        const result = await treeSitterManager.parseCode(
            fileData.fileContent,
            language,
            fileData.fileName
        );

        if (result.tree) {
            logger.debug({ 
                fileName: fileData.fileName,
                language: language,
                hasTree: !!result.tree
            }, 'Generated AST using centralized worker');
        }

        return result;
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error generating Tree-sitter AST: ${errorMessage}`);
        return { 
            tree: null, 
            reason: `AST generation failed: ${errorMessage}`
        };
    }
}

export async function generateAstFromCode(code: string, fileData: FileData): Promise<{ tree: any; reason?: string }> {
    try {
        logger.debug(`Generating AST from code for ${fileData.fileName} using centralized worker`);
        
        // Get language from file extension
        const language = getLanguageFromFileName(fileData.fileName);
        if (!language) {
            logger.debug('Unsupported file type for AST generation');
            return { tree: null, reason: 'Unsupported file type' };
        }

        // TreeSitterManager now handles auto-initialization internally
        const result = await treeSitterManager.parseCode(code, language, fileData.fileName);
        
        return {
            tree: result.tree,
            reason: result.reason
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