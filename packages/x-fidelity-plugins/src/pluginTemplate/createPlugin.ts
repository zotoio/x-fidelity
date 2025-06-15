/**
 * Plugin template generator for X-Fidelity
 * Reduces boilerplate code across plugins
 */

import { XFiPlugin, FactDefn, OperatorDefn, PluginError } from '@x-fidelity/types';

export interface PluginConfig {
    name: string;
    version?: string;
    description: string;
    facts: FactDefn[];
    operators: OperatorDefn[];
    onError?: (error: Error) => PluginError;
}

export function createXFiPlugin(config: PluginConfig): XFiPlugin {
    return {
        name: config.name,
        version: config.version || '1.0.0',
        description: config.description,
        facts: config.facts,
        operators: config.operators,
        onError: config.onError || ((error: Error): PluginError => ({
            message: error.message,
            level: 'error',
            source: config.name
        }))
    };
}

export function createPluginExports(plugin: XFiPlugin) {
    return {
        // Default export
        default: plugin,
        // Named export
        [plugin.name]: plugin,
        // Individual exports for direct use
        facts: plugin.facts,
        operators: plugin.operators
    };
}

// Template for index.ts files
export function generateIndexTemplate(pluginName: string, facts: string[], operators: string[]) {
    const factImports = facts.map(fact => `import { ${fact} } from './facts/${fact}';`).join('\n');
    const operatorImports = operators.map(op => `import { ${op} } from './operators/${op}';`).join('\n');
    
    return `${factImports}
${operatorImports}
import { FactDefn, OperatorDefn } from '@x-fidelity/types';

export { ${pluginName} as default } from './${pluginName}';
export { ${pluginName} } from './${pluginName}';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    ${facts.join(',\n    ')}
];

export const operators: OperatorDefn[] = [
    ${operators.join(',\n    ')}
];
`;
} 