import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { remoteSubstringValidationFact } from './facts/remoteSubstringValidation';
import { invalidRemoteValidationOperator } from './operators/invalidRemoteValidation';

export const xfiPluginRemoteStringValidator: XFiPlugin = {
    name: 'xfiPluginRemoteStringValidator',
    version: '1.0.0',
    description: 'Plugin for remote string validation',
    facts: [remoteSubstringValidationFact],
    operators: [invalidRemoteValidationOperator],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-remote-string-validator',
        details: error.stack
    })
};
