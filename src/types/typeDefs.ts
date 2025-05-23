import { Engine, OperatorEvaluator } from 'json-rules-engine';
import { JSONSchemaType } from 'ajv';

export type OperatorDefn = {
    name: string,
    fn: OperatorEvaluator<any, any>
}

export type FactDefn = {
    name: string,
    fn: (params: any, almanac: any) => Promise<any>
    priority?: number
}
export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}

export interface RuleFailure {
    ruleFailure: string;
    level: ErrorLevel | undefined;
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
        [key: string]: any;
    } | undefined;
}

export interface VersionData {
    dep: string;
    ver: string;
    min: string;
}

export interface MinimumDepVersions {
    [propertyName: string]: string;
}

export interface LocalDependencies {
    name: string;
    version: string;
    dependencies?: LocalDependencies[];
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
}

export interface RunEngineOnFilesParams {
    engine: Engine;
    fileData: FileData[];
    installedDependencyVersions: any;
    minimumDependencyVersions: any;
    standardStructure: any;
    repoUrl: string;
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
}

export interface CollectTelemetryDataParams {
    repoPath: string;
    configServer: string;
}

export interface ArchetypeConfig {
    name: string;
    rules: string[];
    operators: string[];
    facts: string[];
    plugins?: string[];  // New optional field for archetype-specified plugins
    config: {
        minimumDependencyVersions: Record<string, string>; // This will be validated in the JSON schema
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
}

// Add a new type for the JSON schema
export type ArchetypeConfigSchema = JSONSchemaType<ArchetypeConfig>;

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
    metadata: ResultMetadata | BasicTelemetryMetadata | ExemptionTelemetryMetadata;
    timestamp: string;
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
        archetype: string;
        repoPath: string;
        fileCount: number;
        totalIssues: number;
        warningCount: number;
        errorCount: number;
        fatalityCount: number;
        exemptCount: number;
        issueDetails: ScanResult[];
        startTime: number;
        finishTime: number;
        durationSeconds: number;
        telemetryData: TelemetryData;
        options: any;
        repoXFIConfig: RepoXFIConfig;
        memoryUsage: any;
        repoUrl: string;
        xfiVersion: string;
        factMetrics: {
            [factName: string]: FactMetrics;
        };
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
}

export interface LoadLocalRuleParams {
    ruleName: string;
}

export interface LoadLocalConfigRuleParams {
    ruleName: string;
    localConfigPath: string;
}

export interface LoadExemptionsParams { 
    configServer: string; 
    localConfigPath: string; 
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
    fileAst?: any;
    relativePath?: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface RuleReference {
  name: string;
  path?: string;  // Path relative to config dir or repo dir
  url?: string;   // Remote URL to fetch rule from
}

export interface RepoXFIConfig {
  sensitiveFileFalsePositives?: string[];
  additionalRules?: (RuleConfig | RuleReference)[];
  additionalFacts?: string[];
  additionalOperators?: string[];
  additionalPlugins?: string[];
  notifications?: {
    recipients?: {
      email?: string[];
      slack?: string[];
      teams?: string[];
    };
    codeOwners?: boolean;
    notifyOnSuccess?: boolean;
    notifyOnFailure?: boolean;
  };
  [key: string]: any;  // Allow for additional properties
}

export type RepoXFIConfigSchema = JSONSchemaType<RepoXFIConfig>;
export type ErrorLevel = 'warning' | 'error' | 'fatality' | 'exempt';

export interface PluginError {
  message: string;
  level: ErrorLevel;
  details?: any;
}

export interface PluginResult {
  success: boolean;
  data: any;
  error?: PluginError;
}

export interface XFiPlugin {
  name: string;
  version: string;
  facts?: FactDefn[];
  operators?: OperatorDefn[];
  onError?: (error: Error) => PluginError;
  [key: string]: any; // Allow for additional properties
}

export interface PluginRegistry {
  registerPlugin: (plugin: XFiPlugin) => void;
  getPluginFacts: () => FactDefn[];
  getPluginOperators: () => OperatorDefn[];
  executePluginFunction: (pluginName: string, functionName: string, ...args: any[]) => PluginResult;
}

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
}
