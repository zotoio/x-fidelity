import { Engine, OperatorEvaluator } from 'json-rules-engine';
import { ConfigManager } from '../utils/configManager';
import { FileData } from '../facts/repoFilesystemFacts';

export type OperatorDefn = {
    name: string,
    fn: OperatorEvaluator<any, any>
}
export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}

export interface RuleFailure {
    ruleFailure: string;
    level: string | undefined;
    details: Record<string, any> | undefined;
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
}

export interface SetupEngineParams {
    archetypeConfig: ArchetypeConfig;
    archetype: string;
    configManager: ConfigManager;
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
    metadata: ResultMetadata | BasicTelemetryMetadata;
    timestamp: string;
}

export interface BasicTelemetryMetadata {
    archetype: string;
    repoPath: string;
    telemetryData?: TelemetryData;
    errorMessage?: string;
    options?: any
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

export interface ResultMetadata {
    XFI_RESULT: {
        archetype: string;
        repoPath: string;
        fileCount: number;
        totalIssues: number;
        warningCount: number;
        fatalityCount: number;
        issueDetails: ScanResult[];
        startTime: number;
        finishTime: number;
        durationSeconds: number;
        telemetryData: TelemetryData;
        options: any;
        [key: string]: any;
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
}export interface LoadRulesParams {
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

