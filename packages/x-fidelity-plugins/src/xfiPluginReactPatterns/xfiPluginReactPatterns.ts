import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { effectCleanupFact } from './facts/effectCleanupFact';
import { hookDependencyFact } from './facts/hookDependencyFact';

export const xfiPluginReactPatterns: XFiPlugin = {
    name: 'xfiPluginReactPatterns',
    version: '1.0.0',
    description: 'Plugin for analyzing React patterns',
    facts: [
        effectCleanupFact,
        hookDependencyFact
    ],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        source: 'xfiPluginReactPatterns'
    })
};
