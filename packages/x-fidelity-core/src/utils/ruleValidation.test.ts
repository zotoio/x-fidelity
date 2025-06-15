import { validateRule } from './jsonSchemas';
import { RuleConfig } from '@x-fidelity/types';
import { logger } from './logger';

jest.mock('./logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
    }
}));

describe('Rule Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Rule Structure', () => {
        it('should validate a basic rule structure', () => {
            const basicRule: RuleConfig = {
                name: 'basicRule',
                conditions: {
                    all: [
                        { fact: 'testFact', operator: 'equal', value: true }
                    ]
                },
                event: { type: 'error', params: { message: 'Test message' } }
            };

            expect(validateRule(basicRule)).toBe(true);
        });

        it('should reject a rule missing required fields', () => {
            const invalidRule = {
                name: 'invalidRule',
                conditions: { all: [] }
                // Missing event
            };

            expect(validateRule(invalidRule)).toBe(false);
        });
    });

    describe('Complex Conditions', () => {
        it('should validate nested condition structures', () => {
            const nestedRule: RuleConfig = {
                name: 'nestedRule',
                conditions: {
                    all: [
                        {
                            any: [
                                { fact: 'fact1', operator: 'equal', value: true },
                                { fact: 'fact2', operator: 'equal', value: false }
                            ]
                        },
                        {
                            all: [
                                { fact: 'fact3', operator: 'equal', value: 1 },
                                { fact: 'fact4', operator: 'equal', value: 2 }
                            ]
                        }
                    ]
                },
                event: { type: 'error', params: { message: 'Nested condition test' } }
            };

            expect(validateRule(nestedRule)).toBe(true);
        });

        it('should validate dynamic fact references', () => {
            const dynamicRule: RuleConfig = {
                name: 'dynamicRule',
                conditions: {
                    all: [
                        {
                            fact: 'fileData',
                            path: '$.content',
                            operator: 'contains',
                            value: {
                                fact: 'dynamicValue',
                                params: { key: 'searchTerm' }
                            }
                        }
                    ]
                },
                event: { type: 'warning', params: { message: 'Dynamic fact test' } }
            };

            expect(validateRule(dynamicRule)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should validate rule with custom error behavior', () => {
            const errorHandlingRule: RuleConfig = {
                name: 'errorHandlingRule',
                conditions: {
                    all: [
                        { fact: 'testFact', operator: 'equal', value: true }
                    ]
                },
                event: { type: 'error', params: { message: 'Error handling test' } },
                errorBehavior: 'fatal',
                onError: {
                    action: 'customAction',
                    params: { severity: 'high' }
                }
            };

            expect(validateRule(errorHandlingRule)).toBe(true);
        });

        it('should validate rule with recommendations', () => {
            const recommendationRule: RuleConfig = {
                name: 'recommendationRule',
                conditions: {
                    all: [
                        { fact: 'testFact', operator: 'equal', value: true }
                    ]
                },
                event: { type: 'warning', params: { message: 'Recommendation test' } },
                recommendations: [
                    'Consider using a more secure approach',
                    'Review the implementation for potential issues'
                ]
            };

            expect(validateRule(recommendationRule)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty condition arrays', () => {
            const emptyConditionsRule: RuleConfig = {
                name: 'emptyConditionsRule',
                conditions: {
                    all: []
                },
                event: { type: 'warning', params: { message: 'Empty conditions test' } }
            };

            expect(validateRule(emptyConditionsRule)).toBe(true);
        });

        it('should handle complex path expressions', () => {
            const complexPathRule: RuleConfig = {
                name: 'complexPathRule',
                conditions: {
                    all: [
                        {
                            fact: 'fileData',
                            path: '$.metadata.tags[?(@.type=="security")].value',
                            operator: 'contains',
                            value: 'critical'
                        }
                    ]
                },
                event: { type: 'error', params: { message: 'Complex path test' } }
            };

            expect(validateRule(complexPathRule)).toBe(true);
        });

        it('should handle null or undefined values in conditions', () => {
            const nullValueRule: RuleConfig = {
                name: 'nullValueRule',
                conditions: {
                    all: [
                        { fact: 'testFact', operator: 'equal', value: null }
                    ]
                },
                event: { type: 'warning', params: { message: 'Null value test' } }
            };

            expect(validateRule(nullValueRule)).toBe(true);
        });

        it('should handle empty event params', () => {
            const emptyParamsRule: RuleConfig = {
                name: 'emptyParamsRule',
                conditions: {
                    all: [
                        { fact: 'testFact', operator: 'equal', value: true }
                    ]
                },
                event: { type: 'warning', params: {} }
            };

            expect(validateRule(emptyParamsRule)).toBe(true);
        });
    });
}); 