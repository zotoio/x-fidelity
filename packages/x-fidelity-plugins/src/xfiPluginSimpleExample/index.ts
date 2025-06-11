import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';
import { FactDefn, OperatorDefn } from '@x-fidelity/types';

export { xfiPluginSimpleExample as default } from './xfiPluginSimpleExample';
export { xfiPluginSimpleExample } from './xfiPluginSimpleExample';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    customFact
];

export const operators: OperatorDefn[] = [
    customOperator
];
