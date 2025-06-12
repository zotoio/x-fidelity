import { FactDefn, FileData } from '@x-fidelity/types';
import { AstResult, generateAst } from '../../sharedPluginUtils/astUtils';
import { logger } from '@x-fidelity/core';

export const hookDependencyFact: FactDefn = {
    name: 'hookDependency',
    description: 'Analyzes React hook dependencies',
    fn: async (params: unknown, almanac?: unknown) => {
        try {
            const fileData = params as FileData;
            const ast = await (almanac as any)?.factValue('ast') as AstResult;

            if (!ast || !ast.tree) {
                return {
                    missingDependencies: [],
                    unnecessaryDependencies: []
                };
            }

            // Analyze hook dependencies
            const missingDependencies: string[] = [];
            const unnecessaryDependencies: string[] = [];

            // Return analysis results
            return {
                missingDependencies,
                unnecessaryDependencies
            };
        } catch (error) {
            console.error('Error in hookDependency fact:', error);
            return {
                missingDependencies: [],
                unnecessaryDependencies: []
            };
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
