import Ajv from 'ajv';
import { logger } from './logger';
import { ArchetypeConfigSchema, RuleConfigSchema } from '../types/typeDefs';

const ajv = new Ajv();

const semverPattern = 
    "^(?:" +
        "(?:\\d+\\.\\d+\\.\\d+" + 
            "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
            "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
        "|[~^]?\\d+\\.\\d+(?:\\.\\d+)?" + 
            "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
            "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
            "(?:\\s*-\\s*[~^]?\\d+\\.\\d+(?:\\.\\d+)?" + 
                "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
            ")?" +
        ")" +
        "(\\s*\\|\\|\\s*" + 
            "(?:\\d+\\.\\d+\\.\\d+" + 
                "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
            "|[~^]?\\d+\\.\\d+(?:\\.\\d+)?" + 
                "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                "(?:\\s*-\\s*[~^]?\\d+\\.\\d+(?:\\.\\d+)?" + 
                    "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                    "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?" + 
                ")?" +
            ")" + 
        ")*" +
    ")$";

const archetypeSchema: ArchetypeConfigSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        rules: { type: 'array', items: { type: 'string' }, minItems: 1 },
        operators: { type: 'array', items: { type: 'string' }, minItems: 1 },
        facts: { type: 'array', items: { type: 'string' }, minItems: 1 },
        config: {
            type: 'object',
            properties: {
                minimumDependencyVersions: {
                    type: 'object',
                    patternProperties: {
                        '^.*$': { 
                            type: 'string',
                            pattern: semverPattern
                        }
                    },
                    minProperties: 1,
                    additionalProperties: false,
                    required: []
                },
                standardStructure: {
                    type: 'object',
                    minProperties: 1,
                },
                blacklistPatterns: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1
                },
                whitelistPatterns: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1
                }
            },
            required: ['minimumDependencyVersions', 'standardStructure', 'blacklistPatterns', 'whitelistPatterns'] as const,
            additionalProperties: true
        }
    },
    required: ['name', 'rules', 'operators', 'facts', 'config'] as const,
    additionalProperties: false
} as const;

const ruleSchema: RuleConfigSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        conditions: {
            type: 'object',
            properties: {
                all: { type: 'array', items: { type: 'object' }, nullable: true },
                any: { type: 'array', items: { type: 'object' }, nullable: true }
            },
            oneOf: [
                { required: ['all'] },
                { required: ['any'] }
            ]
        },
        event: {
            type: 'object',
            properties: {
                type: { type: 'string' },
                params: { type: 'object' }
            },
            required: ['type', 'params']
        }
    },
    required: ['name', 'conditions', 'event']
};

const validateArchetypeSchema = ajv.compile(archetypeSchema);
const validateRuleSchema = ajv.compile(ruleSchema);

// Helper function to log validation errors
const logValidationErrors = (errors: any[] | null | undefined) => {
    if (errors) {
        errors.forEach((error) => {
            logger.error(`Validation error: ${error.instancePath} ${error.message}`);
        });
    }
};

// Wrap the validate functions to log errors
const validateArchetype = (data: any) => {
    const isValid = validateArchetypeSchema(data);
    if (!isValid) {
        logValidationErrors(validateArchetypeSchema.errors);
    }
    return isValid;
};

const validateRule = (data: any) => {
    const isValid = validateRuleSchema(data);
    if (!isValid) {
        logValidationErrors(validateRuleSchema.errors);
    }
    return isValid;
};

export { validateArchetype, validateRule };
