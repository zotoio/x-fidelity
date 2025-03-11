import { FactDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

export const hookDependencyFact: FactDefn = {
    name: 'hookDependency',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) return { issues: [] };

            const issues: any[] = [];
            
            // Find all useEffect calls
            function visit(node: any) {
                if (node.type === 'call_expression' && 
                    node.children?.[0]?.type === 'identifier' && 
                    node.children[0].text === 'useEffect') {
                    
                    // Get the dependency array argument
                    const args = node.children.filter((n: any) => n.type === 'arguments')[0];
                    const depArray = args?.children?.[1]; // Second argument should be dep array
                    
                    // Check for missing dependency array
                    if (!depArray) {
                        issues.push({
                            type: 'missingDeps',
                            line: node.startPosition.row + 1,
                            message: 'useEffect missing dependency array'
                        });
                        return;
                    }

                    // Check for empty dependency array when effect uses external values
                    const effectBody = args.children[0];
                    const externalRefs = findExternalReferences(effectBody);
                    const deps = depArray.children?.map((n: any) => n.text) || [];
                    
                    const missingDeps = externalRefs.filter(ref => !deps.includes(ref));
                    if (missingDeps.length > 0) {
                        issues.push({
                            type: 'incompleteDeps',
                            line: node.startPosition.row + 1,
                            message: `useEffect has missing dependencies: ${missingDeps.join(', ')}`
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
            logger.error(`Error in hookDependency fact: ${error}`);
            return { issues: [] };
        }
    }
};

function findExternalReferences(node: any): string[] {
    const refs = new Set<string>();
    
    function visit(node: any, scope: Set<string>) {
        if (node.type === 'identifier') {
            if (!scope.has(node.text)) {
                refs.add(node.text);
            }
        } else if (node.type === 'variable_declaration') {
            // Add declared variables to scope
            const declarators = node.children.filter((n: any) => n.type === 'variable_declarator');
            declarators.forEach((d: any) => {
                const name = d.children[0]?.text;
                if (name) scope.add(name);
            });
        }

        for (const child of node.children || []) {
            visit(child, scope);
        }
    }

    visit(node, new Set());
    return Array.from(refs);
}
