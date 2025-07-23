import { FactDefn, FileData, AstResult } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

// Simple regex-based parsing for testing reliability
const parseUseEffectWithRegex = (content: string, fileName: string, filePath: string) => {
    const effects: any[] = [];
    // More flexible regex to match different useEffect patterns
    const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[[^\]]*\]\s*\)/g;
    let match;
    
    while ((match = useEffectRegex.exec(content)) !== null) {
        const effectBody = match[1];
        // Check if there's a return statement with function/arrow function
        const hasCleanup = /return\s*\(\s*\)\s*=>\s*\{/.test(effectBody) || 
                          /return\s*function/.test(effectBody) || 
                          /return\s*\(\s*\)\s*=>\s*[^{]/.test(effectBody);
        
        effects.push({
            fileName,
            filePath,
            hasCleanup,
            location: {
                start: { row: 0, column: match.index },
                end: { row: 0, column: match.index + match[0].length }
            }
        });
    }
    
    return effects;
};

// Export the function for testing
export const effectCleanupFactFn = async (files: FileData[]) => {
    const effectsWithoutCleanup: any[] = [];
    const effectsWithCleanup: any[] = [];

    for (const file of files) {
        try {
            if (!file.fileContent || file.fileContent.trim() === '') {
                continue;
            }

            // Use regex parsing by default for reliability
            logger.debug(`Processing file ${file.fileName} for useEffect cleanup analysis`);
            const effects = parseUseEffectWithRegex(file.fileContent, file.fileName, file.filePath);

            // Categorize effects
            effects.forEach(effect => {
                if (effect.hasCleanup) {
                    effectsWithCleanup.push(effect);
                } else {
                    effectsWithoutCleanup.push(effect);
                }
            });
        } catch (error) {
            logger.error(`Error processing file ${file.fileName}:`, error);
        }
    }

    return { effectsWithoutCleanup, effectsWithCleanup };
};

// Helper function to parse with AST (if AST is available)
const parseWithAst = (tree: any, fileName: string, filePath: string) => {
    const effects: any[] = [];
    
    const visit = (node: any) => {
        if (node.type === 'call_expression' && 
            node.children?.[0]?.type === 'identifier' && 
            node.children[0].text === 'useEffect') {
            
            const effectNode = node.children[1]?.children?.[0];
            if (effectNode) {
                const hasCleanup = effectNode.text.includes('return');
                const effectInfo = {
                    fileName,
                    filePath,
                    hasCleanup,
                    location: {
                        start: node.startPosition,
                        end: node.endPosition
                    }
                };
                effects.push(effectInfo);
            }
        }

        for (const child of node.children || []) {
            visit(child);
        }
    };

    visit(tree);
    return effects;
};

export const effectCleanupFact: FactDefn = {
    name: 'effectCleanup',
    description: 'Checks if useEffect hooks have cleanup functions using precomputed AST',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 2,                 // ✅ Lower priority than AST fact (depends on AST)
    fn: async (params: unknown, almanac?: any) => {
        try {
            const fileData = params as FileData;
            const effects: any[] = [];

            // Try to get AST from almanac
            try {
                const ast = await almanac?.factValue('ast') as AstResult;
                
                if (ast && ast.tree) {
                    const astEffects = parseWithAst(ast.tree, fileData.fileName, fileData.filePath);
                    effects.push(...astEffects);
                } else {
                    // Fallback to regex parsing if no AST available
                    const regexEffects = parseUseEffectWithRegex(fileData.fileContent, fileData.fileName, fileData.filePath);
                    effects.push(...regexEffects);
                }
            } catch (astError) {
                logger.debug(`AST unavailable for ${fileData.fileName}, using regex parsing`);
                const regexEffects = parseUseEffectWithRegex(fileData.fileContent, fileData.fileName, fileData.filePath);
                effects.push(...regexEffects);
            }

            return { effects };
        } catch (error) {
            logger.error('Error in effectCleanup fact:', error);
            return { effects: [] };
        }
    }
};

function hasReturnFunction(node: any): boolean {
    if (node.type === 'return_statement') {
        const returnValue = node.children[0];
        return returnValue?.type === 'function' || 
               returnValue?.type === 'arrow_function';
    }

    for (const child of node.children || []) {
        if (hasReturnFunction(child)) return true;
    }
    
    return false;
}

function checkNeedsCleanup(node: any): boolean {
    const cleanupPatterns = [
        'addEventListener',
        'setTimeout',
        'setInterval',
        'subscribe',
        'observe'
    ];

    if (node.type === 'call_expression') {
        const callee = node.children[0];
        if (callee?.type === 'identifier' && 
            cleanupPatterns.some(p => callee.text.includes(p))) {
            return true;
        }
    }

    for (const child of node.children || []) {
        if (checkNeedsCleanup(child)) return true;
    }
    
    return false;
}
