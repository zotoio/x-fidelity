import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { openaiAnalysis } from './facts/openaiAnalysisFacts';    
import { openaiAnalysisHighSeverity } from './operators/openaiAnalysisHighSeverity';

export const xfiPluginOpenAI: XFiPlugin = {
    name: 'xfiPluginOpenAI',
    version: '1.0.0',
    description: 'Plugin for AI-powered code analysis using OpenAI',
    facts: [openaiAnalysis],
    operators: [openaiAnalysisHighSeverity],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-openai',
        details: error.stack
    })
};
