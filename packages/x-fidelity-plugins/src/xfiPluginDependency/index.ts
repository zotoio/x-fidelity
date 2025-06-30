import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { dependencyVersionFact, localDependenciesFact, repoDependencyAnalysisFact } from './facts/repoDependencyFacts';
import { outdatedFramework } from './operators/outdatedFramework';

export const xfiPluginDependency: XFiPlugin = {
    name: 'xfi-plugin-dependency',
    version: '1.0.0',
    description: 'Plugin for dependency analysis and version checking',
    facts: [dependencyVersionFact, localDependenciesFact, repoDependencyAnalysisFact],
    operators: [outdatedFramework],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-dependency',
        details: error.stack
    })
};
