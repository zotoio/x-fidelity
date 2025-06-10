// Configuration types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/config.ts

import { JSONSchemaType } from 'ajv';

// Forward declare types to avoid circular imports
export interface RuleCondition {
    fact: string;
    operator: string;
    value: any;
    params?: any;
    path?: string;
    priority?: number;
}

export interface RuleConfig {
    name: string;
    description: string;
    conditions: {
        all?: RuleCondition[];
        any?: RuleCondition[];
    };
    event: {
        type: string;
        params: {
            message: string;
            [key: string]: any;
        };
    };
}

export interface NotificationConfig {
    enabled?: boolean;
    notifyOnSuccess?: boolean;
    notifyOnFailure?: boolean;
    codeOwners?: boolean;
    codeOwnersPath?: string;
    recipients?: {
        email?: string[];
        slack?: string[];
        teams?: string[];
    };
    providers?: {
        email?: EmailProviderConfig;
        slack?: SlackProviderConfig;
        teams?: TeamsProviderConfig;
    };
}

export interface EmailProviderConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        pass: string;
    };
    from: string;
}

export interface SlackProviderConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
}

export interface TeamsProviderConfig {
    webhookUrl: string;
}

export interface ArchetypeConfig {
    name: string;
    description: string;
    version?: string;
    rules: RuleConfig[];
    facts?: string[];     // DEPRECATED: Facts are now dynamically loaded from plugins
    operators?: string[]; // DEPRECATED: Operators are now dynamically loaded from plugins
    plugins?: string[];
    configServer: string;
    config: {
        minimumDependencyVersions: Record<string, string>;
        standardStructure: boolean;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
    minimumDependencyVersions?: Record<string, string>;  // For backward compatibility
    exemptions?: any[];  // For backward compatibility
}

// Repository configuration
export interface RepoXFIConfig {
    sensitiveFileFalsePositives?: string[];
    additionalRules?: RuleConfig[];
    additionalFacts?: string[];
    additionalOperators?: string[];
    additionalPlugins?: string[];
    recipients?: {
        email?: string[];
        slack?: string[];
        teams?: string[];
    };
    codeOwners?: boolean;
    notificationConfig?: NotificationConfig;
    archetype: string;
    configServer?: string;
    localConfigPath?: string;
    notifications?: NotificationConfig;
    [key: string]: any;  // For backward compatibility
}

export interface RuleReference {
    name: string;
    path?: string;  // Path relative to config dir or repo dir
    url?: string;   // Remote URL to fetch rule from
    description?: string;
    [key: string]: any;  // For backward compatibility
}

// Schema types
export type ArchetypeConfigSchema = JSONSchemaType<ArchetypeConfig>;
export type RuleConfigSchema = JSONSchemaType<RuleConfig>;
export type RepoXFIConfigSchema = JSONSchemaType<RepoXFIConfig>;

// CLI options
export interface CLIOptions {
    mode?: 'analyze' | 'server';
    examine?: boolean;
    archetype?: string;
    configServer?: string;
    localConfigPath?: string;
    port?: number;
    host?: string;
    jsonTTL?: string;
    executionLogPrefix?: string;
    dir?: string;
    extensions?: string[];
    openaiEnabled?: boolean;
    telemetryCollector?: string;
    [key: string]: any;  // For backward compatibility
}

// Initialize parameters
export interface InitializeParams {
    archetype: string;
    configServer?: string;
    localConfigPath?: string;
    executionLogPrefix?: string;
    [key: string]: any;  // For backward compatibility
}

export interface LoadLocalConfigParams {
    archetype: string;
    localConfigPath: string;
}

// Setup engine parameters
export interface SetupEngineParams {
    archetypeConfig: ArchetypeConfig;
    archetype: string;
    executionLogPrefix?: string;
    localConfigPath?: string;
    repoUrl: string;
    logPrefix?: string;
    rules?: RuleConfig[];
}

export interface LoadLocalRuleParams {
    name: string;
    path: string;
} 