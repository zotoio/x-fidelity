import { Engine, OperatorEvaluator } from 'json-rules-engine';
import { JSONSchemaType } from 'ajv';
import { RepoXFIConfig } from './config';
import { ILogger } from './logger';

export type OperatorDefn = {
    name: string,
    fn: OperatorEvaluator<any, any>
    description?: string
}

export type FactDefn = {
    name: string,
    fn: (params: any, almanac: any) => Promise<any>
    priority?: number
    description?: string
    type?: 'global' | 'global-function' | 'iterative-function'  // Enhanced type system for generic engine
    // 'global': precomputed once and cached as static data
    // 'global-function': function that runs once per repo (e.g., OpenAI with different prompts per rule)  
    // 'iterative-function': function that runs once per file (default behavior)
}

export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}

export interface RuleFailure {
    ruleFailure: string;
    level: ErrorLevel | undefined;
    message?: string;  // V3.24.0 compatibility - used in reportGenerator
    details: {
        message: string;
        source?: 'operator' | 'fact' | 'plugin' | 'rule' | 'unknown';
        originalError?: Error;
        stack?: string;
        operatorThreshold?: {
            operator: string;
            value: any;
        };
        operatorValue?: any;
        conditionDetails?: {
            fact: string;
            operator: string;
            value: any;
            params?: any;
        };
        allConditions?: Array<{
            fact: string;
            operator: string;
            value: any;
            params?: any;
            path?: string;
            priority?: number;
        }>;
        conditionType?: 'all' | 'any' | 'unknown';
        ruleDescription?: string;
        recommendations?: string[];
        [key: string]: any;
    } | undefined;
}

// Enhanced position tracking types (Phase 1 - additive only, maintains backward compatibility)
export interface Position {
    /** 1-based line number */
    line: number;
    /** 1-based column number */
    column: number;
}

export interface Range {
    /** Start position of the range */
    start: Position;
    /** End position of the range */
    end: Position;
}

export interface MatchDetails {
    /** The pattern that was matched */
    pattern: string;
    /** The actual matched text */
    match: string;
    /** Precise range of the match */
    range: Range;
    /** Context around the match for user clarity */
    context?: string;
    /** Regex capture groups if available */
    groups?: string[];
}

export interface EnhancedRuleFailureDetails {
    message: string;
    source?: 'operator' | 'fact' | 'plugin' | 'rule' | 'unknown';
    originalError?: Error;
    stack?: string;
    
    // Legacy position fields (maintained for backward compatibility)
    lineNumber?: number;
    columnNumber?: number;
    startLine?: number;
    endLine?: number;
    startColumn?: number;
    endColumn?: number;
    length?: number;
    
    // Enhanced position fields (new)
    position?: Position;
    range?: Range;
    matches?: MatchDetails[];
    
    // Enhanced metadata
    hasPositionData?: boolean;
    hasMultipleMatches?: boolean;
    
    // Existing fields
    operatorThreshold?: {
        operator: string;
        value: any;
    };
    operatorValue?: any;
    conditionDetails?: {
        fact: string;
        operator: string;
        value: any;
        params?: any;
    };
    allConditions?: Array<{
        fact: string;
        operator: string;
        value: any;
        params?: any;
        path?: string;
        priority?: number;
    }>;
    conditionType?: 'all' | 'any' | 'unknown';
    ruleDescription?: string;
    recommendations?: string[];
    [key: string]: any;
}

export interface FactResult {
    /** Array of matches found */
    matches: MatchDetails[];
    /** Summary information about the results */
    summary: {
        totalMatches: number;
        patterns: string[];
        hasPositionData: boolean;
        filesAnalyzed?: number;
        executionTime?: number;
    };
    /** Additional metadata for backward compatibility */
    [key: string]: any;
}

export type ErrorLevel = 'warning' | 'error' | 'fatality' | 'exempt';

export interface VersionData {
    dep: string;
    ver: string;
    min: string;
    name?: string;  // Add name property for compatibility
    version?: string;  // Add version property for compatibility
    latestVersion?: string;  // Add latestVersion property for compatibility
    isOutdated?: boolean;  // Add isOutdated property for compatibility
    updateType?: string;  // Add updateType property for compatibility
    [key: string]: any;  // Allow additional properties for flexibility
}

export interface MinimumDepVersions {
    [propertyName: string]: string;
}

// Break recursive type chain to prevent TypeScript stack overflow
export interface LocalDependencies {
    name: string;
    version: string;
    dependencies?: Array<Pick<LocalDependencies, 'name' | 'version'> & { dependencies?: any[] }>;
}

export interface ExecutionConfig {
    archetype: ArchetypeConfig;
    rules: RuleConfig[];
    cliOptions: { [key: string]: any };
    exemptions: Exemption[];
}

export interface SetupEngineParams {
    archetypeConfig: ArchetypeConfig;
    archetype: string;
    repoUrl: string;
    executionLogPrefix: string;
    localConfigPath: string;
    logPrefix?: string;      // V4 enhancement - used in engineSetup.ts
    rules?: RuleConfig[];    // V4 enhancement - used in engineSetup.ts for rule injection
    exemptions?: Exemption[]; // V4 enhancement - used in engineSetup.ts for exemption logic
}

export interface RunEngineOnFilesParams {
  engine: Engine;
  fileData: FileData[];
  installedDependencyVersions: any;
  minimumDependencyVersions: any;
  standardStructure: any;
  logger: ILogger;
}

export interface Exemption {
    repoUrl: string;
    rule: string;
    expirationDate: string;
    reason: string;
}

export interface IsExemptParams {
    exemptions: Exemption[];
    repoUrl: string;
    ruleName: string;
    logPrefix: string;
}

export interface AnalyzeCodebaseParams {
    repoPath: string;
    archetype?: string;
    configServer?: string;
    localConfigPath?: string;
    executionLogPrefix?: string;
    logger?: import('./logger').ILogger;
}

export interface CollectTelemetryDataParams {
    repoPath: string;
    configServer: string;
}

export interface ArchetypeConfig {
    name: string;
    rules: string[];  // Rule names as strings
    plugins: string[];  // Required - plugins provide facts and operators dynamically
    config: {
        minimumDependencyVersions: Record<string, string>; // This will be validated in the JSON schema
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
    minimumDependencyVersions?: Record<string, string>; // Add for compatibility with plugins
}

export type ArchetypeConfigSchema = JSONSchemaType<ArchetypeConfig>;

// First define RuleCondition interface for better type safety
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
    conditions: {
        all?: RuleCondition[];  // Replace any[] with proper type
        any?: RuleCondition[];  // Replace any[] with proper type
    };
    event: {
        type: string;
        params: Record<string, any>;
    };
    errorBehavior?: 'swallow' | 'fatal';
    onError?: {
        action: string;  // Name of function to execute
        params?: Record<string, any>;  // Parameters for the action
    };
    description?: string;  // Description of what the rule checks for
    recommendations?: string[];  // Recommendations on how to fix the issue
}

export type RuleConfigSchema = JSONSchemaType<RuleConfig>;

export interface OpenAIAnalysisParams {
    prompt: string;
    resultFact: string;
}

export interface TelemetryEvent {
    eventType: string;
    metadata: ResultMetadata | BasicTelemetryMetadata | ExemptionTelemetryMetadata | Record<string, any>;  // Flexible base type
    timestamp: string;
    eventData?: any;  // Flexible field for additional event data
}

export interface BasicTelemetryMetadata {
    archetype: string;
    repoPath: string;
    telemetryData?: TelemetryData;
    errorMessage?: string;
    options?: any;
    errorStack?: string;
    ruleName?: string;
    conditionDetails?: {
        fact: string;
        operator: string;
        value: any;
        params?: any;
    };
    allConditions?: Array<{
        fact: string;
        operator: string;
        value: any;
        params?: any;
        path?: string;
        priority?: number;
    }>;
    conditionType?: 'all' | 'any' | 'unknown';
}

export interface ExemptionTelemetryMetadata {
    repoUrl: string;
    rule: string;
    expirationDate: string;
    reason: string;
}

export interface GetConfigParams {
    archetype?: string;
    logPrefix?: string;
}

export interface InitializeParams {
    archetype: string;
    logPrefix?: string;
}

export interface LoadLocalConfigParams {
    archetype: string;
    localConfigPath: string;
}

export interface StartServerParams {
    customPort?: string;
    executionLogPrefix?: string;
}

export interface FactMetrics {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    longestExecutionTime: number;  // seconds to 4 decimal places
}

export interface ResultMetadata {
    XFI_RESULT: {
        repoXFIConfig: RepoXFIConfig;
        issueDetails: ScanResult[];
        telemetryData: TelemetryData;
        memoryUsage: any;
        factMetrics: {
            [factName: string]: FactMetrics;
        };
        options: any;
        startTime: number;
        finishTime: number;
        durationSeconds: number;
        xfiVersion: string;
        archetype: string;
        fileCount: number;
        totalIssues: number;
        warningCount: number;
        errorCount: number;
        fatalityCount: number;
        exemptCount: number;
        repoPath: string;
        repoUrl: string;
    };
}

export interface TelemetryData {
    repoUrl: string;
    configServer: string;
    hostInfo: {
        platform: string;
        release: string;
        type: string;
        arch: string;
        cpus: number;
        totalMemory: number;
        freeMemory: number;
    };
    userInfo: {
        username: string;
        homedir: string;
        shell: string | null;
    };
    startTime: number;
}

export interface LoadRulesParams {
    archetype: string;
    ruleNames: string[];
    configServer?: string;
    logPrefix?: string;
    localConfigPath?: string;
}

export interface LoadRemoteRuleParams {
    configServer: string;
    archetype: string;
    ruleName: string;
    logPrefix?: string;
    rule?: string;  // v3.24.0 compatibility
}

export interface LoadLocalRuleParams {
    ruleName: string;
}

export interface LoadLocalConfigRuleParams {
    ruleName: string;
    localConfigPath: string;
    archetype?: string;  // v3.24.0 compatibility
    rule?: string;       // v3.24.0 compatibility
}

export interface LoadExemptionsParams { 
    configServer?: string;  // Optional - either configServer or localConfigPath
    localConfigPath?: string;  // Optional - either configServer or localConfigPath
    logPrefix?: string; 
    archetype: string;
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

export interface FileData {
    fileName: string;
    filePath: string;
    fileContent: string;
    fileAst?: Record<string, any> | null;  // More specific than any, allows for structured AST objects
    relativePath?: string;
    content?: string;  // v3.24.0 compatibility - alias for fileContent
    // ✅ Enhanced AST preprocessing support
    ast?: AstResult;  // Precomputed AST result from repoFilesystemFacts
    astGenerationTime?: number;  // Time taken to generate AST in milliseconds
    astGenerationReason?: string;  // Reason if AST generation failed or was skipped
}

// Enhanced AST result interface for preprocessing optimization
export interface AstResult {
    tree: any;  // The Tree-sitter tree object
    rootNode?: any;  // Root node for convenience
    reason?: string;  // Reason if AST generation failed
    language?: string;  // Detected/used language for parsing
    hasErrors?: boolean;  // Whether the AST contains parsing errors
    errorCount?: number;  // Number of parsing errors
    generationTime?: number;  // Time taken to generate AST in milliseconds
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    errors?: string[];  // v3.24.0 compatibility - array of errors
}

export interface RuleReference {
  name: string;
  path?: string;  // Path relative to config dir or repo dir
  url?: string;   // Remote URL to fetch rule from
}

// RepoXFIConfig moved to config.ts to avoid duplication
export type { RepoXFIConfig } from './config';

export type RepoXFIConfigSchema = JSONSchemaType<RepoXFIConfig>;

// Plugin types moved to plugins.ts to avoid duplication
export type { PluginError, PluginResult, XFiPlugin, PluginRegistry } from './plugins';

export interface AiSuggestionCodeSnippet {
  filePath: string;
  lineNumber: number;
  before: string;
  after: string;
}
  
export interface AiSuggestion {
  issue: string;
  severity: number;
  description: string;
  filePaths: string[];
  suggestion: string;
  codeSnippets: AiSuggestionCodeSnippet[];
}

export interface AiSuggestions {
  issues: AiSuggestion[];
}

export type AiSuggestionsSchema = JSONSchemaType<AiSuggestions>;

export interface RatioThreshold {
    threshold: number;
    comparison?: 'gte' | 'lte'; // greater than or equal, less than or equal
    value?: number; // Add value property for compatibility
}

// Additional interfaces for backward compatibility
export type IssueDetail = ScanResult; // Alias for v4 compatibility

// CLI Options interface
export interface CLIOptions {
    dir: string;
    archetype: string;
    configServer?: string;
    localConfigPath?: string;
    openaiEnabled?: boolean;
    telemetryCollector?: string;
    mode: 'client' | 'server';
    port?: number;
    jsonTTL?: string;
    extensions?: string[];
    examine?: boolean;
    outputFormat?: 'human' | 'json';
    outputFile?: string;
    disableTreeSitterWorker?: boolean;  // ✅ Option to disable TreeSitter worker for performance testing (worker enabled by default)
    zapFiles?: string[];  // ✅ New option for targeted file analysis
    fileCacheTTL?: number;  // ✅ TTL for file modification time cache in minutes (default: 60)
}

// CodeOwner interface with v3.24.0 compatibility
export interface CodeOwner {
  path: string;
  owners: string[];
  pattern?: string; // v3.24.0 compatibility
}

// Notification types moved to notifications.ts to avoid duplication
export type { NotificationProvider, Notification } from './notifications';

export interface ErrorActionParams {
    error: Error;
    ruleName: string;
    filePath?: string;
    level?: string;
    context?: any;
    params?: any;
    [key: string]: any;
} 
