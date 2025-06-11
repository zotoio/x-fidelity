import { effectCleanupFact } from './facts/effectCleanupFact';
import { hookDependencyFact } from './facts/hookDependencyFact';
import { FactDefn, OperatorDefn } from '@x-fidelity/types';

export { xfiPluginReactPatterns as default } from './xfiPluginReactPatterns';
export { xfiPluginReactPatterns } from './xfiPluginReactPatterns';

// Export individual facts and operators for direct use
export const facts: FactDefn[] = [
    effectCleanupFact,
    hookDependencyFact
];

export const operators: OperatorDefn[] = [
    // No operators in this plugin currently
];
