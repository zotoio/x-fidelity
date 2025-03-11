import { XFiPlugin } from '../../types/typeDefs';
import { hookDependencyFact } from './facts/hookDependencyFact';
import { effectCleanupFact } from './facts/effectCleanupFact';

const plugin: XFiPlugin = {
    name: 'xfiPluginReactPatterns',
    version: '1.0.0',
    facts: [hookDependencyFact, effectCleanupFact],
    onError: (error: Error) => ({
        message: `React patterns analysis error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
