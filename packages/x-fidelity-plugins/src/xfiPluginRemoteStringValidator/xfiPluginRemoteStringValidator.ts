import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { remoteSubstringValidationFact } from './facts/remoteSubstringValidation';
import { invalidRemoteValidationOperator } from './operators/invalidRemoteValidation';

export const xfiPluginRemoteStringValidator: XFiPlugin = {
    name: 'xfi-plugin-remote-string-validator',
    version: '1.0.0',
    description: 'Remote string validation plugin for x-fidelity',
    facts: [
        remoteSubstringValidationFact
    ],
    operators: [invalidRemoteValidationOperator],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-remote-string-validator',
        details: error.stack
    })
};
