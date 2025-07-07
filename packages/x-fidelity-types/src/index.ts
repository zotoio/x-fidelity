// X-Fidelity Types Package
// This package contains all shared TypeScript type definitions

// Export everything from core types (v3.24.0 takes precedence)
export * from './core';

// Export notification types  
export * from './notifications';

// Export selective config types that don't conflict with core.ts
export type { 
    RuleCondition,
    EmailProviderConfig,
    SlackProviderConfig,
    TeamsProviderConfig
} from './config';

// Export plugin types (maintain v4 separation)  
export * from './plugins';

// Export server types (maintain v4 separation)
export * from './server';

// Export logger types
export * from './logger';

// Export enhanced error handling types
export * from './errorHandling';

// Export developer experience types
export * from './developerExperience';

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
    // Configuration types (no RuleConfig here anymore)
    RepoXFIConfig,
    CLIOptions,
    
    // Notification config types
    NotificationConfig
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

export * from './logger'; 