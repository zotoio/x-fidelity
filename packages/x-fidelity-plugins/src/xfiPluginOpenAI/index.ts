import { XFiPlugin, PluginError } from '@x-fidelity/types';

export const xfiPluginOpenAI: XFiPlugin = {
    name: 'xfi-plugin-openai',
    version: '1.0.0',
    description: 'Plugin for AI-powered code analysis using OpenAI',
    facts: [],
    operators: [],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-openai',
        details: error.stack
    })
};

export default xfiPluginOpenAI; 

// Export individual facts and operators for direct use
export const facts: any[] = [
    // No facts implemented yet
];

export const operators: any[] = [
    // No operators implemented yet
]; 