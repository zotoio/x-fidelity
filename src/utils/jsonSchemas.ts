import Ajv, { JSONSchemaType } from 'ajv';

const ajv = new Ajv();

interface ArchetypeConfig {
    rules: string[];
    operators: string[];
    facts: string[];
    config: {
        minimumDependencyVersions: Record<string, string>;
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
}

export const archetypeSchema: JSONSchemaType<ArchetypeConfig> = {
    type: 'object',
    properties: {
        rules: { type: 'array', items: { type: 'string' } },
        operators: { type: 'array', items: { type: 'string' } },
        facts: { type: 'array', items: { type: 'string' } },
        config: {
            type: 'object',
            properties: {
                minimumDependencyVersions: {
                    type: 'object',
                    additionalProperties: true
                },
                standardStructure: {
                    type: 'object',
                    additionalProperties: true
                },
                blacklistPatterns: {
                    type: 'array',
                    items: { type: 'string' }
                },
                whitelistPatterns: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['minimumDependencyVersions', 'standardStructure', 'blacklistPatterns', 'whitelistPatterns'],
            additionalProperties: true
        }
    },
    required: ['rules', 'operators', 'facts', 'config'],
    additionalProperties: false
};

interface RuleConfig {
    name: string;
    conditions: {
        all?: any[];
        any?: any[];
    };
    event: {
        type: string;
        params: Record<string, any>;
    };
}

export const ruleSchema: JSONSchemaType<RuleConfig> = {
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

export const validateArchetype = ajv.compile(archetypeSchema);
export const validateRule = ajv.compile(ruleSchema);
