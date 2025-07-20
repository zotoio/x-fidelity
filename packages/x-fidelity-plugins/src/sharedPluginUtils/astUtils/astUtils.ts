import { FileData, AstResult, AstGenerationContext, AstGenerationOptions } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { treeSitterManager } from './treeSitterManager';
import { getLanguageFromPath } from './languageUtils';

// Environment detection - simplified since we use native everywhere
const isVSCodeEnvironment = () => {
  // Check for Electron environment (VSCode runs in Electron)
  return typeof process !== 'undefined' && process.versions && process.versions.electron;
};

/**
 * Create a failed AST result with standardized error information
 */
function createFailedAstResult(
  context: AstGenerationContext, 
  errorMessage: string, 
  generationTime: number = 0
): AstResult {
  return {
    tree: null,
    language: context.language || 'javascript', // Fallback to javascript
    filePath: context.filePath,
    fileName: context.fileName,
    hasErrors: true,
    generationTime,
    mode: 'native-direct' as const,
    reason: errorMessage,
    fromCache: false
  };
}

/**
 * ✅ UNIFIED AST GENERATION FUNCTION
 * This replaces multiple scattered generateAst functions throughout the codebase
 */
export async function generateAst(context: AstGenerationContext): Promise<AstResult> {
  const { filePath, fileName, content, options = {} } = context;
  
  // Auto-detect language if not provided
  const language = context.language || getLanguageFromPath(filePath);
  if (!language) {
    return createFailedAstResult(context, 'Unsupported file type for AST generation');
  }

  // Validate content
  if (!content || typeof content !== 'string') {
    return createFailedAstResult({ ...context, language }, 'No valid content provided for AST generation');
  }

  // Skip special cases
  if (fileName === 'REPO_GLOBAL_CHECK') {
    return createFailedAstResult({ ...context, language }, 'Skipping AST generation for repo-level check');
  }

  const startTime = Date.now();
  
  try {
    logger.debug({ fileName, language, contentLength: content.length }, 'Generating AST with unified function');
    
    const parseResult = await treeSitterManager.parseCode(content, language as 'javascript' | 'typescript', fileName);
    const generationTime = Date.now() - startTime;
    
    if (parseResult.tree) {
      logger.debug({ 
        fileName,
        language,
        hasTree: !!parseResult.tree,
        generationTime,
        mode: parseResult.mode
      }, 'AST generation successful');
      
      return {
        tree: parseResult.tree,
        rootNode: parseResult.tree.rootNode || parseResult.tree,
        language,
        filePath,
        fileName,
        hasErrors: parseResult.tree.rootNode?.hasError() || false,
        errorCount: 0, // Tree-sitter doesn't provide direct error count
        generationTime,
        mode: parseResult.mode || 'native-direct',
        fromCache: false
      };
    } else {
      logger.debug({ fileName, reason: parseResult.reason }, 'AST generation failed');
      
      return {
        tree: null,
        language,
        filePath,
        fileName,
        hasErrors: true,
        generationTime,
        mode: parseResult.mode || 'native-direct',
        reason: parseResult.reason || 'Unknown AST generation failure',
        fromCache: false
      };
    }
  } catch (error) {
    const generationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({ fileName, error: errorMessage, generationTime }, 'AST generation exception');
    
    return createFailedAstResult({ ...context, language }, `AST generation exception: ${errorMessage}`, generationTime);
  }
}

/**
 * ✅ BACKWARD COMPATIBILITY: Generate AST from FileData object
 * Maintains compatibility with existing code that uses FileData interface
 */
export async function generateAstFromFileData(fileData: FileData): Promise<AstResult> {
  const content = fileData.fileContent || fileData.content;
  
  if (!content) {
    return createFailedAstResult({
      filePath: fileData.filePath,
      fileName: fileData.fileName,
      content: ''
    }, 'No file content available for AST generation');
  }

  return generateAst({
    filePath: fileData.filePath,
    fileName: fileData.fileName,
    content: content
  });
}

/**
 * ✅ BACKWARD COMPATIBILITY: Generate AST from code string
 * Maintains compatibility with existing code that passes raw code
 */
export async function generateAstFromCode(code: string, fileName: string, filePath?: string): Promise<AstResult> {
  return generateAst({
    filePath: filePath || fileName,
    fileName,
    content: code
  });
}

/**
 * ✅ LEGACY COMPATIBILITY: Original generateAst function signature
 * This maintains backward compatibility for existing consumers
 * @deprecated Use the new generateAst(context) function instead
 */
export async function generateAstLegacy(fileData: FileData): Promise<{ tree: any; reason?: string }> {
  const result = await generateAstFromFileData(fileData);
  
  // Return in legacy format for backward compatibility
  return {
    tree: result.tree,
    reason: result.reason
  };
}