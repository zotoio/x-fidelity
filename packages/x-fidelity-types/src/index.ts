// X-Fidelity Types Package
// This package contains all shared TypeScript type definitions

// Export all core types
export * from './core';

// Export configuration types
export * from './config';

// Export plugin types
export * from './plugins';

// Export server types
export * from './server';

// Re-export commonly used types for convenience
export type {
    // Core types
    FileData,
    FactDefn,
    OperatorDefn,
    ValidationResult,
    ScanResult,
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    FactMetrics,
    ErrorLevel,
    
    // Notification types (basic)
    NotificationProvider,
    Notification,
    
    // AI types
    AiSuggestion,
    AiSuggestions,
    
    // Telemetry types
    TelemetryEvent,
    TelemetryData,
    
    // Analysis types
    AnalyzeCodebaseParams,
    RunEngineOnFilesParams,
    
    // Version types
    VersionData,
    LocalDependencies,
    MinimumDepVersions,
    
    // Server types
    StartServerParams
} from './core';

export type {
    // Rule types
    RuleConfig,
    RuleCondition,
    ArchetypeConfig,
    
    // Configuration types
    RepoXFIConfig,
    CLIOptions,
    
    // Notification config types
    NotificationConfig,
    EmailProviderConfig,
    SlackProviderConfig,
    TeamsProviderConfig
} from './config';

export type {
    // Plugin types
    XFiPlugin,
    PluginError,
    PluginResult,
    PluginRegistry
} from './plugins';

export type {
    // Server-specific types
    ApiResponse,
    ServerConfig,
    HealthCheckResponse
} from './server'; 