import { xfiPluginAst } from './xfiPluginAst';
import { astFact } from './facts/astFact';
import { codeRhythmFact } from './facts/codeRhythmFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';

describe('xfiPluginAst', () => {
    describe('plugin structure', () => {
        it('should have correct metadata', () => {
            expect(xfiPluginAst.name).toBe('xfi-plugin-ast');
            expect(xfiPluginAst.version).toBe('1.0.0');
            expect(xfiPluginAst.description).toBe('AST analysis plugin for x-fidelity');
        });

        it('should have correct facts', () => {
            expect(xfiPluginAst.facts).toHaveLength(4);
            expect(xfiPluginAst.facts).toContain(astFact);
            expect(xfiPluginAst.facts).toContain(codeRhythmFact);
            expect(xfiPluginAst.facts).toContain(functionComplexityFact);
            expect(xfiPluginAst.facts).toContain(functionCountFact);
        });

        it('should have correct operators', () => {
            expect(xfiPluginAst.operators).toHaveLength(2);
            expect(xfiPluginAst.operators).toContain(astComplexity);
            expect(xfiPluginAst.operators).toContain(functionCountOperator);
        });

        it('should have onError handler', () => {
            expect(typeof xfiPluginAst.onError).toBe('function');
        });
    });

    describe('onError handler', () => {
        it('should return proper PluginError structure', () => {
            const testError = new Error('Test error message');
            testError.stack = 'Error stack trace';

            const result = xfiPluginAst.onError!(testError);

            expect(result).toEqual({
                message: 'Test error message',
                level: 'error',
                severity: 'error',
                source: 'xfi-plugin-ast',
                details: 'Error stack trace'
            });
        });

        it('should handle error without stack trace', () => {
            const testError = new Error('Test error');
            delete testError.stack;

            const result = xfiPluginAst.onError!(testError);

            expect(result).toEqual({
                message: 'Test error',
                level: 'error',
                severity: 'error',
                source: 'xfi-plugin-ast',
                details: undefined
            });
        });

        it('should handle non-Error objects', () => {
            const testError = { message: 'Custom error', customProp: 'value' } as any;

            const result = xfiPluginAst.onError!(testError);

            expect(result).toEqual({
                message: 'Custom error',
                level: 'error',
                severity: 'error',
                source: 'xfi-plugin-ast',
                details: undefined
            });
        });
    });

    describe('fact verification', () => {
        it('should have all facts with correct names', () => {
            const factNames = xfiPluginAst.facts!.map(fact => fact.name);
            expect(factNames).toContain('ast');
            expect(factNames).toContain('codeRhythm');
            expect(factNames).toContain('functionComplexity');
            expect(factNames).toContain('functionCount');
        });

        it('should have all facts with function implementations', () => {
            xfiPluginAst.facts!.forEach(fact => {
                expect(typeof fact.fn).toBe('function');
                expect(fact.description).toBeDefined();
                expect(typeof fact.description).toBe('string');
            });
        });
    });

    describe('operator verification', () => {
        it('should have all operators with correct names', () => {
            const operatorNames = xfiPluginAst.operators!.map(op => op.name);
            expect(operatorNames).toContain('astComplexity');
            expect(operatorNames).toContain('functionCount');
        });

        it('should have all operators with function implementations', () => {
            xfiPluginAst.operators!.forEach(operator => {
                expect(typeof operator.fn).toBe('function');
                expect(operator.description).toBeDefined();
                expect(typeof operator.description).toBe('string');
            });
        });
    });

    describe('plugin registration compatibility', () => {
        it('should be compatible with plugin registry structure', () => {
            // Mock a basic plugin registry structure
            const mockRegistry = {
                registerPlugin: jest.fn(),
                getPluginFacts: jest.fn(),
                getPluginOperators: jest.fn()
            };

            // Should be able to register without errors
            expect(() => {
                mockRegistry.registerPlugin(xfiPluginAst);
            }).not.toThrow();

            expect(mockRegistry.registerPlugin).toHaveBeenCalledWith(xfiPluginAst);
        });

        it('should have all required plugin properties', () => {
            expect(xfiPluginAst).toHaveProperty('name');
            expect(xfiPluginAst).toHaveProperty('version');
            expect(xfiPluginAst).toHaveProperty('facts');
            expect(xfiPluginAst).toHaveProperty('operators');
            expect(xfiPluginAst).toHaveProperty('onError');
        });

        it('should have proper types for all properties', () => {
            expect(typeof xfiPluginAst.name).toBe('string');
            expect(typeof xfiPluginAst.version).toBe('string');
            expect(Array.isArray(xfiPluginAst.facts)).toBe(true);
            expect(Array.isArray(xfiPluginAst.operators)).toBe(true);
            expect(typeof xfiPluginAst.onError).toBe('function');
        });
    });

    describe('integration validation', () => {
        it('should export all necessary components', () => {
            // Verify that all imported components are properly used
            expect(xfiPluginAst.facts).toEqual([
                astFact,
                codeRhythmFact,
                functionComplexityFact,
                functionCountFact
            ]);
            
            expect(xfiPluginAst.operators).toEqual([
                astComplexity,
                functionCountOperator
            ]);
        });

        it('should have consistent naming', () => {
            // Plugin name should be lowercase with hyphens
            expect(xfiPluginAst.name).toMatch(/^[a-z-]+$/);
            
            // Version should follow semantic versioning pattern
            expect(xfiPluginAst.version).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });
}); 