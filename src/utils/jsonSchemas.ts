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
        rules: { type: 'array', items: { type: 'string' }, minItems: 1 },
        operators: { type: 'array', items: { type: 'string' }, minItems: 1 },
        facts: { type: 'array', items: { type: 'string' }, minItems: 1 },
        configUrl: { type: 'string', format: 'uri', nullable: true },
        config: {
            type: 'object',
            properties: {
                minimumDependencyVersions: {
                    type: 'object',
                    patternProperties: {
                        "^[a-zA-Z0-9-_]+$": { type: 'string', pattern: '^[\\^~><=]?\\d+\\.\\d+\\.\\d+' }
                    },
                    additionalProperties: false
                },
                standardStructure: {
                    type: 'object',
                    additionalProperties: { 
                        oneOf: [
                            { type: 'object' },
                            { type: 'null' }
                        ]
                    }
                },
                blacklistPatterns: {
                    type: 'array',
                    items: { type: 'string', format: 'regex' },
                    minItems: 1
                },
                whitelistPatterns: {
                    type: 'array',
                    items: { type: 'string', format: 'regex' },
                    minItems: 1
                }
            },
            required: ['minimumDependencyVersions', 'standardStructure', 'blacklistPatterns', 'whitelistPatterns'],
            additionalProperties: false
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
