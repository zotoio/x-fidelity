// Configuration types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/config.ts

import { JSONSchemaType } from 'ajv';
import { ExecutionMode, LegacyMode } from './core';

// Forward declare types to avoid circular imports
export interface RuleCondition {
    fact: string;
    operator: string;
    value: any;
    params?: any;
    path?: string;
    priority?: number;
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

// Repository configuration
export interface RepoXFIConfig {
    sensitiveFileFalsePositives?: string[];
    additionalRules?: any[];  // Use any[] to avoid circular imports with RuleConfig
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
    archetype?: string;  // Make optional to match core.ts definition
    configServer?: string;
    localConfigPath?: string;
    notifications?: NotificationConfig & {
        recipients?: {
            email?: string[];
            slack?: string[];
            teams?: string[];
        };
        codeOwners?: boolean;
        notifyOnSuccess?: boolean;
        notifyOnFailure?: boolean;
    };
    [key: string]: any;  // For backward compatibility
}

export interface RuleReference {
    name: string;
    path?: string;  // Path relative to config dir or repo dir
    url?: string;   // Remote URL to fetch rule from
    description?: string;
    [key: string]: any;  // For backward compatibility
}

// CLI options
export interface CLIOptions {
    mode?: ExecutionMode | LegacyMode;
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

export interface LoadLocalRuleParams {
    name: string;
    path: string;
} 
