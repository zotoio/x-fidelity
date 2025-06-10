import { FactDefn, OperatorDefn } from '@x-fidelity/types';

// Plugin error type
export interface PluginError {
    message: string;
    severity: 'error' | 'warning' | 'info';
    source: string;
    details?: any;
}

// Function metrics type
export interface FunctionMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
    lineCount?: number;
}

// Plugin definition
export interface XFiPlugin {
    name: string;
    version: string;
    description?: string;
    facts?: FactDefn[];
    rules?: any[];
    onError?: (error: Error) => PluginError;
    [key: string]: any; // Allow for additional properties
}

// Plugin result type
export interface PluginResult {
    success: boolean;
    data: any;
    error?: PluginError;
}

// Plugin registry interface
export interface PluginRegistry {
    registerPlugin: (plugin: XFiPlugin) => void;
    getPluginFacts: () => FactDefn[];
    getPluginOperators: () => OperatorDefn[];
    executePluginFunction: (pluginName: string, functionName: string, ...args: any[]) => PluginResult;
}

// AST types
export interface AstResult {
    program: any;
    rootNode: any;
    [key: string]: any;
}

// Remote validation types
export interface RemoteValidationParams {
    content: string;
    pattern: string;
    options?: {
        caseSensitive?: boolean;
        multiline?: boolean;
        global?: boolean;
    };
}

export interface RemoteValidationResult {
    isValid: boolean;
    matches?: string[];
    error?: string;
} 