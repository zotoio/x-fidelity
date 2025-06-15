import { FactDefn, FileData } from '@x-fidelity/types';
import { AstResult, generateAst } from '../../sharedPluginUtils/astUtils';
import { logger } from '@x-fidelity/core';

export const effectCleanupFact: FactDefn = {
    name: 'effectCleanup',
    description: 'Checks if useEffect hooks have cleanup functions',
    fn: async (params: unknown, almanac?: any) => {
        try {
            const fileData = params as FileData;
            const ast = await almanac?.factValue('ast') as AstResult;
            const effects: any[] = [];

            if (!ast || !ast.tree) {
                return { effects: [] };
            }

            const visit = (node: any) => {
                if (node.type === 'call_expression' && 
                    node.children?.[0]?.type === 'identifier' && 
                    node.children[0].text === 'useEffect') {
                    const effectNode = node.children[1]?.children?.[0];
                    if (effectNode) {
                        effects.push({
                            hasCleanup: effectNode.text.includes('return'),
                            location: {
                                start: node.startPosition,
                                end: node.endPosition
                            }
                        });
                    }
                }

                for (const child of node.children || []) {
                    visit(child);
                }
            };

            visit(ast.tree);
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
