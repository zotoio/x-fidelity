import { XFiPlugin } from '@x-fidelity/types';
import { missingRequiredFilesFact } from './facts/missingRequiredFiles';
import { missingRequiredFilesOperator } from './operators/missingRequiredFiles';

export const xfiPluginRequiredFiles: XFiPlugin = {
    name: 'xfiPluginRequiredFiles',
    version: '1.0.0',
    description: 'Plugin for checking required files in a repository',
    facts: [missingRequiredFilesFact],
    operators: [missingRequiredFilesOperator],
    onError: (error: Error) => ({
        message: error.message,
        level: 'error',
        source: 'xfiPluginRequiredFiles'
    })
};
