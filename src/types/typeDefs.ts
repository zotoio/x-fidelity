import { OperatorEvaluator } from 'json-rules-engine';

export type OperatorDefn = {
    name: string,
    fn: OperatorEvaluator<any, any>
}
export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}
/**
 * Represents a rule failure.
 */
export interface RuleFailure {
    ruleFailure: string;
    details: Record<string, any> | undefined;
}/**
 * Represents the version data of a dependency.
 */

export interface VersionData {
    dep: string;
    ver: string;
    min: string;
}
/**
 * Represents the minimum dependency versions.
 */

export interface MinimumDepVersions {
    [propertyName: string]: string;
}
/**
 * Represents the local dependencies.
 */

export interface LocalDependencies {
    [propertyName: string]: { version: string; };
}

export interface ExecutionConfig {
    archetype: ArchetypeConfig;
    rules: RuleConfig[];
    cliOptions: { [key: string]: any };
}

export interface ArchetypeConfig {
    name: string;
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

export interface RuleConfig {
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

export interface OpenAIAnalysisParams {
    prompt: string;
    resultFact: string;
}
export interface TelemetryEvent {
    eventType: string;
    metadata: {
        archetype: string;
        repoPath: string;
        [key: string]: any;
    };
    timestamp: string;
}

