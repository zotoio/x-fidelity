import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { repoFilesFact, repoFileAnalysisFact } from './facts/repoFilesystemFacts';
import { fileContains } from './operators/fileContains';
import { fileContainsWithPosition } from './operators/fileContainsWithPosition';
import { nonStandardDirectoryStructure } from './operators/nonStandardDirectoryStructure';
import { hasFilesWithMultiplePatterns } from './operators/hasFilesWithMultiplePatterns';

export const xfiPluginFilesystem: XFiPlugin = {
    name: 'xfiPluginFilesystem',
    version: '1.0.0',
    description: 'Plugin for filesystem operations and file analysis',
    facts: [repoFilesFact, repoFileAnalysisFact],
    operators: [
        fileContains,
        fileContainsWithPosition,
        nonStandardDirectoryStructure,
        hasFilesWithMultiplePatterns
    ],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfiPluginFilesystem',
        details: error.stack
    })
};
