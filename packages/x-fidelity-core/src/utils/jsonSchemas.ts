import {
    ArchetypeConfig,
    RuleConfig,
    RepoXFIConfig,
    AiSuggestions,
    AiSuggestion
} from '@x-fidelity/types';

import { JSONSchemaType } from 'ajv';
import Ajv from "ajv";
import { logger } from "./logger";
import {
    ArchetypeConfigSchema,
    RuleConfigSchema,
    RepoXFIConfigSchema,
} from '@x-fidelity/types';
import semver from "semver";

const ajv = new Ajv();

ajv.addFormat("semverPattern", {
    type: "string",
    validate: (x) => semver.valid(x) !== null && semver.validRange(x) !== null,
});

// Using a simpler schema definition to avoid TypeScript errors with complex Ajv types
const repoXFIConfigSchema = {
    type: "object",
    properties: {
        sensitiveFileFalsePositives: {
            type: "array",
            items: { type: "string" },
            minItems: 0,
            nullable: true,
        },
        additionalRules: {
            type: "array",
            items: { type: "object" },
            minItems: 0,
            nullable: true,
        },
        additionalFacts: {
            type: "array",
            items: { type: "string" },
            minItems: 0,
            nullable: true,
        },
        additionalOperators: {
            type: "array",
            items: { type: "string" },
            minItems: 0,
            nullable: true,
        },
        additionalPlugins: {
            type: "array",
            items: { type: "string" },
            minItems: 0,
            nullable: true,
        },
        notifications: {
            type: "object",
            properties: {
                recipients: {
                    type: "object",
                    properties: {
                        email: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true
                        },
                        slack: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true
                        },
                        teams: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true
                        }
                    },
                    nullable: true
                },
                codeOwners: {
                    type: "boolean",
                    nullable: true
                },
                notifyOnSuccess: {
                    type: "boolean",
                    nullable: true
                },
                notifyOnFailure: {
                    type: "boolean",
                    nullable: true
                },
                customTemplates: {
                    type: "object",
                    properties: {
                        success: {
                            type: "string",
                            nullable: true
                        },
                        failure: {
                            type: "string",
                            nullable: true
                        }
                    },
                    nullable: true
                }
            },
            nullable: true
        }
    },
    required: [],
    additionalProperties: true,
} as unknown as RepoXFIConfigSchema;

const archetypeSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        description: { type: "string", nullable: true },
        configServer: { type: "string", nullable: true },
        rules: { type: "array", items: { type: "string" }, minItems: 1 },
        operators: { type: "array", items: { type: "string" }, minItems: 0, nullable: true },
        facts: { type: "array", items: { type: "string" }, minItems: 0, nullable: true },
        plugins: { type: "array", items: { type: "string" }, minItems: 0, nullable: true },  // New field for plugins
        config: {
            type: "object",
            properties: {
                minimumDependencyVersions: {
                    type: "object",
                    properties: {
                        "^.*$": {
                            type: "string",
                            format: "semverPattern",
                        },
                    },
                    minProperties: 1,
                    additionalProperties: true,
                    required: [],
                },
                standardStructure: {
                    type: "object",
                    minProperties: 1,
                },
                blacklistPatterns: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                },
                whitelistPatterns: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                },
            },
            required: [
                "minimumDependencyVersions",
                "standardStructure",
                "blacklistPatterns",
                "whitelistPatterns",
            ] as const,
            additionalProperties: true,
        },
    },
    required: ["name", "rules", "config"] as const,
    additionalProperties: true,
} as const;

const ruleSchema: RuleConfigSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        conditions: {
            type: "object",
            properties: {
                all: { type: "array", items: { type: "object" }, nullable: true },
                any: { type: "array", items: { type: "object" }, nullable: true },
            },
            oneOf: [{ required: ["all"] }, { required: ["any"] }],
        },
        event: {
            type: "object",
            properties: {
                type: { type: "string" },
                params: { type: "object" },
            },
            required: ["type", "params"],
        },
        errorBehavior: {
            type: "string",
            enum: ["swallow", "fatal"],
            nullable: true,
        },
        onError: {
            type: "object",
            properties: {
                action: { type: "string" },
                params: { type: "object", nullable: true },
            },
            required: ["action"],
            nullable: true,
        },
        description: { type: "string", nullable: true },
        recommendations: { 
            type: "array", 
            items: { type: "string" }, 
            nullable: true 
        }
    },
    required: ["name", "conditions", "event"],
} as unknown as RuleConfigSchema;

export const aiSuggestionsSchema = {
    type: "object",
    properties: {
        issues: {
            type: "array",          
            items: {
                type: "object",
                properties: {
                    issue: {
                        type: "string",
                        description: "The type of issue identified.",
                    },
                    severity: {
                        type: "integer",
                        minimum: 1,
                        maximum: 10,
                        description: "Value between 1 and 10 where 1 is low and 10 is high.",
                    },
                    description: {
                        type: "string",
                        description: "Detail of the issue.",
                    },
                    filePaths: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of file paths involved.",
                    },
                    suggestion: {
                        type: "string",
                        description: "The suggestion for the fix.",
                    },
                    codeSnippets: {
                        type: "array",
                        description:
                            "Array of code snippets that need to be fixed in each file.",
                        items: {
                            type: "object",
                            properties: {
                                filePath: {
                                    type: "string",
                                    description: "The file path affected.",
                                },
                                lineNumber: {
                                    type: "integer",
                                    description: "The line number of the issue.",
                                },
                                before: {
                                    type: "string",
                                    description: "The code snippet before the fix.",
                                },
                                after: {
                                    type: "string",
                                    description: "The code snippet after the fix.",
                                },
                            },
                            required: ["filePath", "lineNumber", "before", "after"],
                            additionalProperties: false,
                        },
                    },
                },
                required: [
                    "issue",
                    "severity",
                    "description",
                    "filePaths",
                    "suggestion",
                    "codeSnippets",
                ],
                additionalProperties: false,
            },
        }
    },
    required: ["issues"] as const,
    additionalProperties: false,
};

export const validateArchetypeSchema = ajv.compile(archetypeSchema);
export const validateRuleSchema = ajv.compile(ruleSchema);
export const validateXFIConfigSchema = ajv.compile(repoXFIConfigSchema);

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

export function validateRule(rule: unknown): rule is RuleConfig {
    if (!rule || typeof rule !== 'object') {
        return false;
    }

    const r = rule as RuleConfig;
    if (!r.name || typeof r.name !== 'string') {
        return false;
    }

    if (!r.conditions || typeof r.conditions !== 'object') {
        return false;
    }

    if (r.conditions.all && !Array.isArray(r.conditions.all)) {
        return false;
    }

    if (r.conditions.any && !Array.isArray(r.conditions.any)) {
        return false;
    }

    if (!r.event || typeof r.event !== 'object') {
        return false;
    }

    if (!r.event.type || typeof r.event.type !== 'string') {
        return false;
    }

    if (!r.event.params || typeof r.event.params !== 'object') {
        return false;
    }

    return true;
}

const validateXFIConfig = (data: any) => {
    const isValid = validateXFIConfigSchema(data);
    if (!isValid) {
        logValidationErrors(validateXFIConfigSchema?.errors);
    }
    return isValid;
};

export { validateArchetype, validateXFIConfig };
