// Core types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/core.ts

// Basic types
export type OperatorParams = Record<string, unknown>;
export type OperatorResult = boolean;
export type ErrorLevel = 'warning' | 'error' | 'fatality' | 'exempt';

// File related types
export interface FileData {
    fileName: string;
    filePath: string;
    fileContent: string;
    content: string;
    extension?: string;
    lastModified?: Date;
    relativePath?: string;
}

// Core functionality types
/**
 * Represents a fact value that can be used in rule conditions.
 * TFactValue: The type of value returned by the fact function
 */
export interface Almanac {
    factValue(name: string): Promise<any>;
    addRuntimeFact(name: string, value: any): void;
    [key: string]: any;
}

export interface FactDefn {
    name: string;
    description: string;
    fn: (params: unknown, almanac?: Almanac) => Promise<any>;
    priority?: number;
}

/**
 * Represents an operator that can be used in rule conditions.
 * TFactValue: The type of value returned by the fact
 * TValue: The type of value to compare against
 */
export interface OperatorDefn<T = any, U = any> {
    name: string;
    description: string;
    fn: (factValue: T, params: U) => boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    error?: string;
}

export interface ScanResult {
    filePath?: string;
    errors: {
        level: string;
        message: string;
        data?: any;
        ruleFailure: string;
    }[];
}

export interface RuleFailure {
    ruleFailure: string;
    level: string;
    message: string;
    data?: any;
    details?: {
        message: string;
        ruleDescription?: string;
        recommendations?: string[];
        conditionDetails?: any;
        allConditions?: any[];
        conditionType?: string;
        details?: any;
    };
}

export interface IssueDetail {
    filePath: string;
    errors: RuleFailure[];
}

export interface RatioThreshold {
    ratio: number;
    level: string;
    value: number;
    comparison?: 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
}

// Engine types
export interface RunEngineOnFilesParams {
    engine: any;
    fileData: FileData[];
    installedDependencyVersions: Record<string, string>;
    minimumDependencyVersions: Record<string, string>;
    standardStructure: boolean;
}

export interface AnalyzeCodebaseParams {
    repoPath: string;
    archetype?: string;
    configServer?: string;
    localConfigPath?: string;
    executionLogPrefix?: string;
}

export interface VersionData {
    name: string;
    version: string;
    latestVersion: string;
    isOutdated: boolean;
    updateType: 'major' | 'minor' | 'patch';
    dep: string;
    min: string;
    ver: string;
}

export interface ResultMetadata {
    XFI_RESULT: {
        archetype: string;
        fileCount: number;
        totalIssues: number;
        warningCount: number;
        errorCount: number;
        fatalityCount: number;
        exemptCount?: number;
        issueDetails: IssueDetail[];
        durationSeconds?: number;
        telemetryData: TelemetryData;
        memoryUsage: {
            heapTotal: number;
            heapUsed: number;
            external: number;
            rss: number;
        };
        repoXFIConfig: any;
        factMetrics: Record<string, FactMetrics>;
        startTime: number;
        finishTime: number;
        options: any;
        repoPath?: string;
        repoUrl?: string;
        xfiVersion: string;
    };
}

// Fact metrics
export interface FactMetrics {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    lastExecutionTime: number;
}

// Telemetry types
export interface TelemetryEvent {
    eventType: string;
    eventData: any;
    metadata?: Record<string, any>;
    timestamp?: string;
}

export interface TelemetryData {
    eventType: string;
    metadata: Record<string, any>;
    timestamp: string;
    repoUrl: string;
    startTime: number;
    configServer?: string;
    hostInfo?: any;
    userInfo?: any;
}

export interface CollectTelemetryDataParams {
    repoPath: string;
    configServer: string;
}

// Server types
export interface StartServerParams {
    port: number;
    host: string;
    configPath: string;
    jsonTTL: string;
    customPort?: number;
    executionLogPrefix?: string;
}

// Exemption types
export interface IsExemptParams {
    archetype: string;
    rule: string;
    filePath: string;
    repoUrl?: string;
    ruleName?: string;
    exemptions?: Exemption[];
    logPrefix?: string;
}

export interface LoadExemptionsParams {
    configServer?: string;
    localConfigPath?: string;
    logPrefix?: string;
    archetype: string;
}

export interface Exemption {
    rule: string;
    pattern: string;
    reason: string;
    expirationDate?: string;
    ruleName?: string;
    filePath?: string;
    createdAt?: string;
    createdBy?: string;
    repoUrl?: string;
}

// Dependency types
export interface LocalDependencies {
    name: string;
    version: string;
    dependencies?: LocalDependencies[];
    [key: string]: any;
}

export interface MinimumDepVersions {
    [key: string]: string;
}

// Rule and configuration types are defined in config.ts

export interface LoadRulesParams {
    configServer?: string;
    ruleNames: string[];
    logPrefix?: string;
    archetype: string;
    localConfigPath?: string;
}

export interface LoadLocalConfigRuleParams {
    ruleName: string;
    localConfigPath: string;
    archetype?: string;
    rule: string;
    logPrefix?: string;
}

export interface LoadRemoteRuleParams {
    configServer: string;
    archetype: string;
    ruleName: string;
    rule: string;
    logPrefix?: string;
}

// Configuration types
export interface GetConfigParams {
    archetype?: string;
    configServer?: string;
    logPrefix?: string;
}

export interface ComplexityThresholds {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
    lines: number;
}

export interface IsBlacklistedParams {
    filePath: string;
    repoPath: string;
    blacklistPatterns: string[];
}

export interface isWhitelistedParams {
    filePath: string;
    repoPath: string;
    whitelistPatterns: string[];
}

// Notification types (basic ones)
export interface Notification {
    type: 'success' | 'failure';
    title: string;
    message: string;
    recipients: string[];
    subject: string;
    content: string;
    metadata?: {
        results?: ResultMetadata;
        [key: string]: any;
    };
}

export interface NotificationProvider {
    send: (notification: Notification) => Promise<void>;
    getRecipients(): Promise<string[]>;
    initialize?(config: any): Promise<void>;
}

// Execution configuration (ArchetypeConfig is defined in config.ts)
export interface ExecutionConfig {
    archetype: any; // ArchetypeConfig - avoiding circular dependency
    rules: any[]; // RuleConfig[] - avoiding circular dependency
    cliOptions: any;
    exemptions: Exemption[];
}

// AI types
export interface AiSuggestionCodeSnippet {
    filePath: string;
    lineNumber: number;
    before: string;
    after: string;
}

export interface AiSuggestion {
    issue: string;
    description: string;
    filePaths: string[];
    suggestion: string;
}

export interface AiSuggestions {
    issues: AiSuggestion[];
}

export interface OpenAIAnalysisParams {
    content: string;
}

// Plugin-specific types
export interface RemoteValidationParams {
    substring: string;
    url: string;
    content?: string;
    pattern?: string;
    options?: any;
    headers?: Record<string, string>;
    timeout?: number;
    jsonPath?: string;
}

export interface RequiredFilesResult {
    missingFiles: string[];
    foundFiles: string[];
}

export interface CustomFactResult {
    value: string;
    metadata?: any;
}

// Additional missing types
export interface CodeOwner {
    pattern: string;
    path: string;
    owners: string[];
}

export interface ErrorActionParams {
    error: Error;
    context: any;
    rule?: any;
    level?: string;
    file?: any;
}

// Additional telemetry types
export interface BasicTelemetryMetadata {
    archetype: string;
    repoPath: string;
    options: Record<string, any>;
    os: {
        platform: string;
        release: string;
        type: string;
        arch: string;
        version: string;
        homedir: string;
        shell: string | null;
    };
    startTime: number;
}

export interface ExemptionTelemetryMetadata {
    repoUrl: string;
    ruleName: string;
    exemptionCount: number;
} 