import { XFiPlugin, FactDefn, OperatorDefn } from '@x-fidelity/types';
import { astFact } from './facts/astFact';
import { codeRhythmFact } from './facts/codeRhythmFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';

export { xfiPluginAst as default } from './xfiPluginAst';
export { xfiPluginAst } from './xfiPluginAst';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    astFact,
    codeRhythmFact,
    functionComplexityFact,
    functionCountFact
];

export const operators: OperatorDefn[] = [
    astComplexity,
    functionCountOperator
];
