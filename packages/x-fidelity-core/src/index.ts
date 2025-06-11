// Core exports
export * from './core/engine/analyzer';
export * from './core/configManager';
export { validateArchetypeConfig } from './core/validateConfig';
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

// Utility exports
export * from './utils/logger';
export * from './utils/telemetry';

// Export core functionality
export { logger } from './utils/logger';
export { getLogPrefix, setLogLevel, setLogPrefix } from './utils/logger';
export { analyzeCodebase } from './core/engine/analyzer';
export { sendTelemetry } from './utils/telemetry';

// Export core options functionality
export { options, setOptions, getOptions } from './core/options';

// Export utilities for plugins
export { generateAst } from './utils/astUtils';
export { validateUrlInput } from './utils/inputValidation';

// Export plugin registry and configuration manager
export { pluginRegistry } from './core/pluginRegistry';
export { ConfigManager } from './core/configManager';

// Export utility functions
export * from './utils/pathUtils';
export * from './utils/openaiUtils';
export * from './utils/inputValidation';
export * from './utils/maskSensitiveData';
export * from './utils/utils';

// Facts and operators are now provided by plugins through the plugin registry
export { loadFacts } from './facts';
export { loadOperators } from './operators';

// Export validation functions
export { validateArchetype, validateRule, validateXFIConfig, aiSuggestionsSchema } from './utils/jsonSchemas';
export { initializeNotifications } from './notifications'; 