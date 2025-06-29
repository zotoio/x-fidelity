import { 
    xfiPluginAst,
    facts,
    operators
} from './index';
import { xfiPluginAst as pluginFromFile } from './xfiPluginAst';
import { astFact } from './facts/astFact';
import { codeRhythmFact } from './facts/codeRhythmFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';

describe('xfiPluginAst index exports', () => {
    describe('default export', () => {
        it('should export xfiPluginAst as default', () => {
            expect(xfiPluginAst).toBeDefined();
            expect(xfiPluginAst).toBe(pluginFromFile);
        });

        it('should have the correct plugin structure', () => {
            expect(xfiPluginAst.name).toBe('xfi-plugin-ast');
            expect(xfiPluginAst.version).toBe('1.0.0');
            expect(xfiPluginAst.description).toBe('AST analysis plugin for x-fidelity');
            expect(Array.isArray(xfiPluginAst.facts)).toBe(true);
            expect(Array.isArray(xfiPluginAst.operators)).toBe(true);
            expect(typeof xfiPluginAst.onError).toBe('function');
        });
    });

    describe('named exports', () => {
        it('should export xfiPluginAst as named export', () => {
            expect(xfiPluginAst).toBeDefined();
            expect(xfiPluginAst).toBe(pluginFromFile);
        });

        it('should export facts array', () => {
            expect(facts).toBeDefined();
            expect(Array.isArray(facts)).toBe(true);
            expect(facts).toHaveLength(4);
        });

        it('should export operators array', () => {
            expect(operators).toBeDefined();
            expect(Array.isArray(operators)).toBe(true);
            expect(operators).toHaveLength(2);
        });
    });

    describe('facts export validation', () => {
        it('should contain all expected facts', () => {
            expect(facts).toContain(astFact);
            expect(facts).toContain(codeRhythmFact);
            expect(facts).toContain(functionComplexityFact);
            expect(facts).toContain(functionCountFact);
        });

        it('should have facts with correct names', () => {
            const factNames = facts.map(fact => fact.name);
            expect(factNames).toContain('ast');
            expect(factNames).toContain('codeRhythm');
            expect(factNames).toContain('functionComplexity');
            expect(factNames).toContain('functionCount');
        });

        it('should have all facts with function implementations', () => {
            facts.forEach(fact => {
                expect(fact.name).toBeDefined();
                expect(typeof fact.name).toBe('string');
                expect(fact.description).toBeDefined();
                expect(typeof fact.description).toBe('string');
                expect(fact.fn).toBeDefined();
                expect(typeof fact.fn).toBe('function');
            });
        });
    });

    describe('operators export validation', () => {
        it('should contain all expected operators', () => {
            expect(operators).toContain(astComplexity);
            expect(operators).toContain(functionCountOperator);
        });

        it('should have operators with correct names', () => {
            const operatorNames = operators.map(op => op.name);
            expect(operatorNames).toContain('astComplexity');
            expect(operatorNames).toContain('functionCount');
        });

        it('should have all operators with function implementations', () => {
            operators.forEach(operator => {
                expect(operator.name).toBeDefined();
                expect(typeof operator.name).toBe('string');
                expect(operator.description).toBeDefined();
                expect(typeof operator.description).toBe('string');
                expect(operator.fn).toBeDefined();
                expect(typeof operator.fn).toBe('function');
            });
        });
    });

    describe('consistency checks', () => {
        it('should have same facts in plugin and facts export', () => {
            expect(facts).toEqual(xfiPluginAst.facts);
        });

        it('should have same operators in plugin and operators export', () => {
            expect(operators).toEqual(xfiPluginAst.operators);
        });

        it('should not have duplicate fact names', () => {
            const factNames = facts.map(fact => fact.name);
            const uniqueFactNames = [...new Set(factNames)];
            expect(factNames).toHaveLength(uniqueFactNames.length);
        });

        it('should not have duplicate operator names', () => {
            const operatorNames = operators.map(op => op.name);
            const uniqueOperatorNames = [...new Set(operatorNames)];
            expect(operatorNames).toHaveLength(uniqueOperatorNames.length);
        });
    });

    describe('type compatibility', () => {
        it('should export facts with correct TypeScript types', () => {
            facts.forEach(fact => {
                // Check that fact has all required properties of FactDefn
                expect(fact).toHaveProperty('name');
                expect(fact).toHaveProperty('description');
                expect(fact).toHaveProperty('fn');
                
                // Check that name and description are strings
                expect(typeof fact.name).toBe('string');
                expect(typeof fact.description).toBe('string');
                expect(typeof fact.fn).toBe('function');
            });
        });

        it('should export operators with correct TypeScript types', () => {
            operators.forEach(operator => {
                // Check that operator has all required properties of OperatorDefn
                expect(operator).toHaveProperty('name');
                expect(operator).toHaveProperty('description');
                expect(operator).toHaveProperty('fn');
                
                // Check that name and description are strings
                expect(typeof operator.name).toBe('string');
                expect(typeof operator.description).toBe('string');
                expect(typeof operator.fn).toBe('function');
            });
        });
    });

    describe('module structure', () => {
        it('should provide both default and named exports for flexibility', () => {
            // Test that both import styles work
            const indexModule = require('./index');
            
            // Default export
            expect(indexModule.default).toBeDefined();
            expect(indexModule.default).toBe(xfiPluginAst);
            
            // Named exports
            expect(indexModule.xfiPluginAst).toBeDefined();
            expect(indexModule.facts).toBeDefined();
            expect(indexModule.operators).toBeDefined();
        });
    });
}); 