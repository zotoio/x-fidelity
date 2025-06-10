import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { globalFileAnalysis } from './facts/globalFileAnalysisFacts';
import { regexMatch } from './operators/regexMatch';
import { globalPatternCount } from './operators/globalPatternCount';
import { globalPatternRatio } from './operators/globalPatternRatio';

export const xfiPluginPatterns: XFiPlugin = {
    name: 'xfi-plugin-patterns',
    version: '1.0.0',
    description: 'Plugin for pattern matching and regex analysis',
    facts: [globalFileAnalysis],
    operators: [regexMatch, globalPatternCount, globalPatternRatio],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-patterns',
        details: error.stack
    })
};

export default xfiPluginPatterns; 