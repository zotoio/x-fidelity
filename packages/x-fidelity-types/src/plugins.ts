// Plugin types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/plugin.ts and pluginTypes.ts

import { FactDefn, OperatorDefn } from './core';
import { ILogger } from './logger';

// Plugin error type
export interface PluginError {
    message: string;
    level: 'error' | 'warning' | 'fatality' | 'exempt';
    details?: any;
    stack?: string;
    severity?: 'error' | 'warning' | 'info'; // For backward compatibility
    source?: string; // For backward compatibility
}

// Plugin result type
export interface PluginResult {
    success: boolean;
    error?: PluginError;
    data?: any;
}

// Enhanced plugin context with comprehensive logging support
export interface PluginContext {
    config: any;
    logger: ILogger;
    utils: any;
    
    // Enhanced logger utilities for plugin use
    loggerContext: {
        /**
         * Create a child logger for specific operations
         * @param operation The operation name
         * @param additionalContext Additional context
         * @returns A child logger instance
         */
        createOperationLogger: (operation: string, additionalContext?: Record<string, any>) => ILogger;
        
        /**
         * Create a child logger for specific facts
         * @param factName The fact name
         * @param additionalContext Additional context
         * @returns A child logger instance
         */
        createFactLogger: (factName: string, additionalContext?: Record<string, any>) => ILogger;
        
        /**
         * Create a child logger for specific operators
         * @param operatorName The operator name
         * @param additionalContext Additional context
         * @returns A child logger instance
         */
        createOperatorLogger: (operatorName: string, additionalContext?: Record<string, any>) => ILogger;
    };
}

// Plugin definition
export interface XFiPlugin {
    name: string;
    version: string;
    description?: string;
    facts?: FactDefn[];
    operators?: OperatorDefn[];
    rules?: any[];
    
    /**
     * Initialize the plugin with context including logger
     * @param context Plugin context with logger and utilities
     */
    initialize?: (context: PluginContext) => Promise<void>;
    
    /**
     * Cleanup plugin resources
     */
    cleanup?: () => Promise<void>;
    
    /**
     * Plugin error handler
     * @param error The error that occurred
     * @returns Formatted plugin error
     */
    onError?: (error: Error) => PluginError;
    
    [key: string]: any; // Allow for additional properties
}

// Plugin registry interface
export interface PluginRegistry {
    registerPlugin: (plugin: XFiPlugin) => void;
    getPlugin: (name: string) => XFiPlugin | undefined;  // V4 enhancement - useful for plugin management
    getPluginFacts: () => FactDefn[];
    getPluginOperators: () => OperatorDefn[];
    executePluginFunction: (pluginName: string, functionName: string, ...args: any[]) => PluginResult;
}

// Plugin configuration
export interface PluginConfig {
    name: string;
    version: string;
    facts?: FactDefn[];
    operators?: OperatorDefn[];
    initialize?: (context: PluginContext) => Promise<void>;
    cleanup?: () => Promise<void>;
}

// Plugin fact result type
export interface PluginFactResult {
    [key: string]: any;
}

// Plugin operator result type
export interface PluginOperatorResult {
    result: boolean;
    message?: string;
}

// Plugin initialization options
export interface PluginInitializationOptions {
    /**
     * Whether to initialize plugins with logger context
     */
    enableLoggerContext?: boolean;
    
    /**
     * Whether to wrap plugin functions with error handling
     */
    enableErrorWrapping?: boolean;
    
    /**
     * Whether to provide backward compatibility for legacy plugins
     */
    enableLegacySupport?: boolean;
}

// Plugin logger context interface (for external plugins)
export interface PluginLoggerContext {
    /**
     * Main logger instance for the plugin
     */
    logger: ILogger;
    
    /**
     * Create a child logger for specific operations
     * @param operation The operation name
     * @param additionalContext Additional context
     * @returns A child logger instance
     */
    createOperationLogger: (operation: string, additionalContext?: Record<string, any>) => ILogger;
    
    /**
     * Create a child logger for specific facts
     * @param factName The fact name
     * @param additionalContext Additional context
     * @returns A child logger instance
     */
    createFactLogger: (factName: string, additionalContext?: Record<string, any>) => ILogger;
    
    /**
     * Create a child logger for specific operators
     * @param operatorName The operator name
     * @param additionalContext Additional context
     * @returns A child logger instance
     */
    createOperatorLogger: (operatorName: string, additionalContext?: Record<string, any>) => ILogger;
}

 
