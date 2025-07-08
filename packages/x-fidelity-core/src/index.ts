// Core exports
export * from './core/configManager';
export * from './core/engine/analyzer';
export * from './core/engine/engineSetup';
export * from './core/engine/engineRunner';
export * from './core/engine/errorActionExecutor';
export * from './core/engine/telemetryCollector';
export * from './core/options';
export * from './core/pluginRegistry';
export * from './core/validateConfig';
export * from './facts';
export * from './operators';
export * from './notifications';

// Re-export types from the types package
export type {
    // Core types
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    FileData,
    FactDefn,
    OperatorDefn,
    ErrorLevel,
    ValidationResult,
    ScanResult,
    RatioThreshold,
    RunEngineOnFilesParams,
    AnalyzeCodebaseParams,
    VersionData,
    LocalDependencies,
    MinimumDepVersions,
    TelemetryEvent,
    TelemetryData,
    BasicTelemetryMetadata,
    ExemptionTelemetryMetadata,
    FactMetrics,
    CollectTelemetryDataParams,
    AiSuggestion,
    AiSuggestions,
    Notification,
    NotificationProvider,
    
    // Configuration types
    LoadExemptionsParams,
    RuleReference,
    RepoXFIConfig,
    CLIOptions,
    ArchetypeConfig,
    ExecutionConfig,
    GetConfigParams,
    InitializeParams,
    RuleConfig,
    RuleCondition,
    Exemption,
    SetupEngineParams,
    IsBlacklistedParams,
    isWhitelistedParams,
    NotificationConfig,
    EmailProviderConfig,
    SlackProviderConfig,
    TeamsProviderConfig,
    
    // Plugin types
    PluginError,
    XFiPlugin,
    PluginResult,
    PluginRegistry,
    PluginConfig,
    PluginContext,
    PluginFactResult,
    PluginOperatorResult,
    
    // Server types
    StartServerParams,
    ApiResponse,
    ServerConfig,
    HealthCheckResponse
} from '@x-fidelity/types';

// Export utility classes and functions
export * from './utils/defaultLogger';
export * from './utils/logger';
export * from './utils/loggerProvider';
export * from './utils/maskSensitiveData';
export * from './utils/openaiUtils';
export * from './utils/telemetry';
export * from './utils/utils';
export * from './utils/pathUtils';
export * from './utils/timingUtils';
export * from './utils/inputValidation';
export * from './utils/fileCacheManager';
export * from './utils/executionContext';
export * from './utils/axiosClient';

// Export core functionality
export { logger, LoggerProvider } from './utils/logger';
export { getLogPrefix, setLogLevel, setLogFilePath, getLogFilePath } from './utils/logger';
export { analyzeCodebase } from './core/engine/analyzer';
export { sendTelemetry } from './utils/telemetry';

// Export core options functionality
export { options, setOptions, getOptions } from './core/options';

// Export plugin registry and configuration manager
export { pluginRegistry } from './core/pluginRegistry';
export { ConfigManager } from './core/configManager';

// Export validation functions
export { validateArchetype, validateRule, validateXFIConfig, aiSuggestionsSchema } from './utils/jsonSchemas';
export { initializeNotifications } from './notifications';
export { factMetricsTracker } from './utils/factMetricsTracker';
export { loadRepoXFIConfig } from './utils/repoXFIConfigLoader'; 