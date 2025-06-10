import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { repoFilesFact } from './facts/repoFilesystemFacts';
import { fileContains } from './operators/fileContains';
import { hasFilesWithMultiplePatterns } from './operators/hasFilesWithMultiplePatterns';
import { nonStandardDirectoryStructure } from './operators/nonStandardDirectoryStructure';

export const xfiPluginFilesystem: XFiPlugin = {
    name: 'xfi-plugin-filesystem',
    version: '1.0.0',
    description: 'Plugin for filesystem operations and file analysis',
    facts: [repoFilesFact],
    operators: [fileContains, hasFilesWithMultiplePatterns, nonStandardDirectoryStructure],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-filesystem',
        details: error.stack
    })
}; 