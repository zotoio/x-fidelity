import { XFiPlugin, PluginError, FactDefn, OperatorDefn } from '@x-fidelity/types';
import { repoFilesFact, repoFileAnalysisFact } from './facts/repoFilesystemFacts';
import { fileContains } from './operators/fileContains';
import { nonStandardDirectoryStructure } from './operators/nonStandardDirectoryStructure';

export const xfiPluginFilesystem: XFiPlugin = {
    name: 'xfi-plugin-filesystem',
    version: '1.0.0',
    description: 'Plugin for filesystem operations and file analysis',
    facts: [repoFilesFact, repoFileAnalysisFact],
    operators: [fileContains, nonStandardDirectoryStructure],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-filesystem',
        details: error.stack
    })
};

export default xfiPluginFilesystem;

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    repoFilesFact, 
    repoFileAnalysisFact
];

export const operators: OperatorDefn[] = [
    fileContains,
    nonStandardDirectoryStructure
]; 