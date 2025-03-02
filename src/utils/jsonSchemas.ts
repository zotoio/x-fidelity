import Ajv from "ajv";
import { logger } from "./logger";
import {
    ArchetypeConfigSchema,
    RuleConfigSchema,
    RepoXFIConfigSchema,
    AiSuggestionsSchema,
} from "../types/typeDefs";
import semver from "semver";

const ajv = new Ajv();

ajv.addFormat("semverPattern", {
    type: "string",
    validate: (x) => semver.valid(x) !== null && semver.validRange(x) !== null,
});

const repoXFIConfigSchema: RepoXFIConfigSchema = {
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
    },
    required: [],
    additionalProperties: true,
};

const archetypeSchema: ArchetypeConfigSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        rules: { type: "array", items: { type: "string" }, minItems: 1 },
        operators: { type: "array", items: { type: "string" }, minItems: 1 },
        facts: { type: "array", items: { type: "string" }, minItems: 1 },
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
    required: ["name", "rules", "operators", "facts", "config"] as const,
    additionalProperties: false,
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
    },
    required: ["name", "conditions", "event"],
};

export const aiSuggestionsSchema: AiSuggestionsSchema = {
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

const validateRule = (data: any) => {
    const isValid = validateRuleSchema(data);
    if (!isValid) {
        logValidationErrors(validateRuleSchema.errors);
    }
    return isValid;
};

const validateXFIConfig = (data: any) => {
    const isValid = validateXFIConfigSchema(data);
    if (!isValid) {
        logValidationErrors(validateXFIConfigSchema?.errors);
    }
    return isValid;
};

export { validateArchetype, validateRule, validateXFIConfig };
