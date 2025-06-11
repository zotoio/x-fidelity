import { missingRequiredFilesFact } from './facts/missingRequiredFiles';
import { missingRequiredFilesOperator } from './operators/missingRequiredFiles';
import { FactDefn, OperatorDefn } from '@x-fidelity/types';

export { xfiPluginRequiredFiles as default } from './xfiPluginRequiredFiles';
export { xfiPluginRequiredFiles } from './xfiPluginRequiredFiles';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    missingRequiredFilesFact
];

export const operators: OperatorDefn[] = [
    missingRequiredFilesOperator
];
