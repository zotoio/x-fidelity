import { remoteSubstringValidationFact } from './facts/remoteSubstringValidation';
import { invalidRemoteValidationOperator } from './operators/invalidRemoteValidation';
import { FactDefn, OperatorDefn } from '@x-fidelity/types';

export { xfiPluginRemoteStringValidator as default } from './xfiPluginRemoteStringValidator';
export { xfiPluginRemoteStringValidator } from './xfiPluginRemoteStringValidator';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    remoteSubstringValidationFact
];

export const operators: OperatorDefn[] = [
    invalidRemoteValidationOperator
];
