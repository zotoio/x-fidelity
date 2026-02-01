/**
 * Test suite for JSON Schema validation functions
 * Tests rule and archetype validation for early error catching
 */

import { validateRule, validateArchetype, validateXFIConfig } from './jsonSchemas';

describe('validateRule', () => {
    describe('valid rules', () => {
        it('should validate a minimal valid rule', () => {
            const rule = {
                name: 'test-rule',
                conditions: {
                    all: [{ fact: 'fileData', operator: 'exists', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test warning' }
                }
            };
            
            expect(validateRule(rule)).toBe(true);
        });

        it('should validate a rule with "any" conditions', () => {
            const rule = {
                name: 'any-condition-rule',
                conditions: {
                    any: [
                        { fact: 'fileData', operator: 'contains', value: 'pattern1' },
                        { fact: 'fileData', operator: 'contains', value: 'pattern2' }
                    ]
                },
                event: {
                    type: 'error',
                    params: { message: 'Pattern found' }
                }
            };
            
            expect(validateRule(rule)).toBe(true);
        });

        it('should validate a rule with nested conditions', () => {
            const rule = {
                name: 'nested-rule',
                conditions: {
                    all: [
                        { fact: 'fileData', operator: 'exists', value: true },
                        {
                            any: [
                                { fact: 'pattern', operator: 'matches', value: 'foo' },
                                { fact: 'pattern', operator: 'matches', value: 'bar' }
                            ]
                        }
                    ]
                },
                event: {
                    type: 'fatality',
                    params: { message: 'Critical issue' }
                }
            };
            
            expect(validateRule(rule)).toBe(true);
        });

        it('should validate a rule with recommendations', () => {
            const rule = {
                name: 'rule-with-recommendations',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Issue found' }
                },
                recommendations: ['Fix by doing X', 'Alternative: do Y']
            };
            
            expect(validateRule(rule)).toBe(true);
        });

        it('should validate a rule with description', () => {
            const rule = {
                name: 'described-rule',
                description: 'This rule checks for something important',
                conditions: {
                    all: [{ fact: 'check', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Check failed' }
                }
            };
            
            expect(validateRule(rule)).toBe(true);
        });

        it('should validate a rule with errorBehavior', () => {
            const rule = {
                name: 'error-behavior-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                },
                errorBehavior: 'swallow'
            };
            
            expect(validateRule(rule)).toBe(true);
        });
    });

    describe('invalid rules', () => {
        it('should reject null input', () => {
            expect(validateRule(null)).toBe(false);
        });

        it('should reject undefined input', () => {
            expect(validateRule(undefined)).toBe(false);
        });

        it('should reject non-object input', () => {
            expect(validateRule('string')).toBe(false);
            expect(validateRule(123)).toBe(false);
            expect(validateRule([])).toBe(false);
        });

        it('should reject rule without name', () => {
            const rule = {
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with non-string name', () => {
            const rule = {
                name: 123,
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule without conditions', () => {
            const rule = {
                name: 'no-conditions-rule',
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with non-object conditions', () => {
            const rule = {
                name: 'bad-conditions-rule',
                conditions: 'invalid',
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with non-array "all" conditions', () => {
            const rule = {
                name: 'bad-all-rule',
                conditions: {
                    all: 'not-an-array'
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with non-array "any" conditions', () => {
            const rule = {
                name: 'bad-any-rule',
                conditions: {
                    any: { invalid: 'object' }
                },
                event: {
                    type: 'warning',
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule without event', () => {
            const rule = {
                name: 'no-event-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with non-object event', () => {
            const rule = {
                name: 'bad-event-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: 'invalid'
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with event missing type', () => {
            const rule = {
                name: 'no-event-type-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with event having non-string type', () => {
            const rule = {
                name: 'bad-event-type-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 123,
                    params: { message: 'Test' }
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with event missing params', () => {
            const rule = {
                name: 'no-event-params-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning'
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject rule with event having non-object params', () => {
            const rule = {
                name: 'bad-event-params-rule',
                conditions: {
                    all: [{ fact: 'test', operator: 'equal', value: true }]
                },
                event: {
                    type: 'warning',
                    params: 'invalid'
                }
            };
            
            expect(validateRule(rule)).toBe(false);
        });

        it('should reject empty object', () => {
            expect(validateRule({})).toBe(false);
        });
    });
});

describe('validateArchetype', () => {
    describe('valid archetypes', () => {
        it('should validate a minimal valid archetype', () => {
            const archetype = {
                name: 'test-archetype',
                rules: ['rule1', 'rule2'],
                config: {
                    minimumDependencyVersions: { 'lodash': '4.0.0' },
                    standardStructure: { 'src': {} },
                    blacklistPatterns: ['*.log'],
                    whitelistPatterns: ['*.ts']
                }
            };
            
            expect(validateArchetype(archetype)).toBe(true);
        });

        it('should validate an archetype with plugins', () => {
            const archetype = {
                name: 'plugin-archetype',
                rules: ['rule1'],
                plugins: ['xfiPluginAst', 'xfiPluginDependency'],
                config: {
                    minimumDependencyVersions: { 'react': '17.0.0' },
                    standardStructure: { 'components': {} },
                    blacklistPatterns: ['*.bak'],
                    whitelistPatterns: ['*.tsx']
                }
            };
            
            expect(validateArchetype(archetype)).toBe(true);
        });

        it('should validate an archetype with description', () => {
            const archetype = {
                name: 'described-archetype',
                description: 'This is a test archetype for validation',
                rules: ['rule1'],
                config: {
                    minimumDependencyVersions: { 'express': '4.0.0' },
                    standardStructure: { 'routes': {} },
                    blacklistPatterns: ['*.tmp'],
                    whitelistPatterns: ['*.js']
                }
            };
            
            expect(validateArchetype(archetype)).toBe(true);
        });
    });
});

describe('validateXFIConfig', () => {
    it('should validate an empty config', () => {
        expect(validateXFIConfig({})).toBe(true);
    });

    it('should validate config with sensitiveFileFalsePositives', () => {
        const config = {
            sensitiveFileFalsePositives: ['config.example.json', 'mock-secrets.json']
        };
        
        expect(validateXFIConfig(config)).toBe(true);
    });

    it('should validate config with additionalPlugins', () => {
        const config = {
            additionalPlugins: ['custom-plugin-1', 'custom-plugin-2']
        };
        
        expect(validateXFIConfig(config)).toBe(true);
    });

    it('should validate config with notifications', () => {
        const config = {
            notifications: {
                recipients: {
                    email: ['team@example.com'],
                    slack: ['#alerts']
                },
                notifyOnSuccess: true,
                notifyOnFailure: true
            }
        };
        
        expect(validateXFIConfig(config)).toBe(true);
    });

    it('should validate a full config', () => {
        const config = {
            sensitiveFileFalsePositives: ['test-secrets.json'],
            additionalRules: [{ name: 'custom-rule' }],
            additionalFacts: ['customFact'],
            additionalOperators: ['customOperator'],
            additionalPlugins: ['customPlugin'],
            notifications: {
                recipients: {
                    email: ['admin@example.com']
                },
                codeOwners: true,
                notifyOnFailure: true
            }
        };
        
        expect(validateXFIConfig(config)).toBe(true);
    });
});
