import Ajv, { JSONSchemaType } from 'ajv';
import { logger } from './logger';
import { ArchetypeConfig, RuleConfig } from '../types/typeDefs';

const ajv = new Ajv();

const archetypeSchema: JSONSchemaType<ArchetypeConfig> = {
    type: 'object',
    properties: {
        rules: { type: 'array', items: { type: 'string' }, minItems: 1 },
        operators: { type: 'array', items: { type: 'string' }, minItems: 1 },
        facts: { type: 'array', items: { type: 'string' }, minItems: 1 },
        config: {
            type: 'object',
            properties: {
                minimumDependencyVersions: {
                    type: 'object',
                    minProperties: 1,
                    required: []
                },
                standardStructure: {
                    type: 'object',
                    minProperties: 1,
                    required: []
                },
                blacklistPatterns: {
                    type: 'array',
                    items: { type: 'string'},
                    minItems: 1
                },
                whitelistPatterns: {
                    type: 'array',
                    items: { type: 'string'},
                    minItems: 1
                }
            },
            required: ['minimumDependencyVersions', 'standardStructure', 'blacklistPatterns', 'whitelistPatterns'],
            additionalProperties: true
        }
    },
    required: ['rules', 'operators', 'facts', 'config'],
    additionalProperties: false
};

const ruleSchema: JSONSchemaType<RuleConfig> = {
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
