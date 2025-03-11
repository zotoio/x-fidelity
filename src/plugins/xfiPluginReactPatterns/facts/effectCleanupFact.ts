import { FactDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

export const effectCleanupFact: FactDefn = {
    name: 'effectCleanup',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) return { issues: [] };

            const issues: any[] = [];
            
            function visit(node: any) {
                if (node.type === 'call_expression' && 
                    node.children?.[0]?.type === 'identifier' && 
                    node.children[0].text === 'useEffect') {
                    
                    const effectBody = node.children?.[1]?.children?.[0];
                    if (!effectBody) return;

                    // Check if effect returns a cleanup function
                    const hasCleanup = hasReturnFunction(effectBody);
                    
                    // Look for patterns that typically need cleanup
                    const needsCleanup = checkNeedsCleanup(effectBody);
                    
                    if (needsCleanup && !hasCleanup) {
                        issues.push({
                            type: 'missingCleanup',
                            line: node.startPosition.row + 1,
                            message: 'useEffect may need cleanup for subscriptions/listeners/timers'
                        });
                    }
                }

                for (const child of node.children || []) {
                    visit(child);
                }
            }

            visit(tree.rootNode);

            const result = {
                issues,
                fileInfo: {
                    path: fileData.filePath,
                    issueCount: issues.length
                }
            };

            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;

        } catch (error) {
            logger.error(`Error in effectCleanup fact: ${error}`);
            return { issues: [] };
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
