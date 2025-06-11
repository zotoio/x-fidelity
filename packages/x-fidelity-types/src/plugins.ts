// Plugin types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/plugin.ts and pluginTypes.ts

import { FactDefn, OperatorDefn } from './core';

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

// Plugin definition
export interface XFiPlugin {
    name: string;
    version: string;
    description?: string;
    facts?: FactDefn[];
    operators?: OperatorDefn[];
    rules?: any[];
    initialize?: () => Promise<void>;
    cleanup?: () => Promise<void>;
    onError?: (error: Error) => PluginError;
    [key: string]: any; // Allow for additional properties
}

// Plugin registry interface
export interface PluginRegistry {
    registerPlugin: (plugin: XFiPlugin) => void;
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
    initialize?: () => Promise<void>;
    cleanup?: () => Promise<void>;
}

// Plugin context type
export interface PluginContext {
    config: any;
    logger: any;
    utils: any;
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

 