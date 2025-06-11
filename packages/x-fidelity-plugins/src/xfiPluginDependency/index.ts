import { XFiPlugin, PluginError, FactDefn, OperatorDefn } from '@x-fidelity/types';
import { getDependencyVersionFacts, repoDependencyAnalysis } from './facts/repoDependencyFacts';
import { outdatedFramework } from './operators/outdatedFramework';

// Create the fact definitions that match the demo config expectations
const repoDependencyVersionsFact: FactDefn = {
    name: 'repoDependencyVersions',
    description: 'Collects dependency version information',
    fn: async (params: unknown, almanac?: unknown) => {
        const { archetypeConfig } = params as { archetypeConfig: any };
        return await getDependencyVersionFacts(archetypeConfig);
    }
};

const repoDependencyFactsFact: FactDefn = {
    name: 'repoDependencyFacts',
    description: 'Collects repository dependency facts',
    fn: async (params: unknown, almanac?: unknown) => {
        const { archetypeConfig } = params as { archetypeConfig: any };
        return await getDependencyVersionFacts(archetypeConfig);
    }
};

const dependencyDataFact: FactDefn = {
    name: 'dependencyData',
    description: 'Provides dependency data including installed dependency versions',
    fn: async (params: unknown, almanac?: unknown) => {
        const { archetypeConfig } = params as { archetypeConfig: any };
        const installedDependencyVersions = await getDependencyVersionFacts(archetypeConfig);
        return {
            installedDependencyVersions
        };
    }
};

const repoDependencyAnalysisFact: FactDefn = {
    name: 'repoDependencyAnalysis',
    description: 'Analyzes repository dependencies for outdated versions',
    fn: async (params: unknown, almanac?: unknown) => {
        return await repoDependencyAnalysis(params, almanac as any);
    }
};

export const xfiPluginDependency: XFiPlugin = {
    name: 'xfi-plugin-dependency',
    version: '1.0.0',
    description: 'Plugin for dependency analysis and version checking',
    facts: [repoDependencyVersionsFact, repoDependencyFactsFact, dependencyDataFact, repoDependencyAnalysisFact],
    operators: [outdatedFramework],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-dependency',
        details: error.stack
    })
};

export default xfiPluginDependency;

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    repoDependencyVersionsFact, 
    repoDependencyFactsFact, 
    dependencyDataFact, 
    repoDependencyAnalysisFact
];

export const operators: OperatorDefn[] = [
    outdatedFramework
]; 