// Minimal options interface for core package use
// CLI-specific options should be handled in the CLI package

import { ExecutionMode } from '@x-fidelity/types';

export interface CoreOptions {
    localConfigPath?: string;
    jsonTTL?: string;
    archetype?: string;
    configServer?: string;
    mode?: ExecutionMode;
    dir?: string;
    extraPlugins?: string[];
    port?: number;
    openaiEnabled?: boolean;
    telemetryCollector?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    telemetryEnabled?: boolean;
    maxFileSize?: number;
    timeout?: number;
    examine?: boolean;
    enableTreeSitterWorker?: boolean;
    zapFiles?: string[];
    fileCacheTTL?: number;
    // WASM Tree-sitter options
    enableTreeSitterWasm?: boolean;
    wasmPath?: string;
    wasmLanguagesPath?: string;
    wasmTimeout?: number;
}

// Default options for core functionality
export let options: CoreOptions = {
    localConfigPath: undefined,
    jsonTTL: '60',
    archetype: 'node-fullstack',
    configServer: undefined,
    mode: 'cli',
    dir: undefined,
    extraPlugins: [],
    port: undefined,
    openaiEnabled: false,
    telemetryCollector: undefined,
    logLevel: 'info',
    telemetryEnabled: true,
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 60000, // 60 seconds
    enableTreeSitterWorker: false,  // Default to direct parsing (no worker)
    zapFiles: undefined,
    fileCacheTTL: 60,  // Default 60 minutes
    // WASM Tree-sitter defaults
    enableTreeSitterWasm: true,  // Default to WASM TreeSitter (better compatibility)
    wasmPath: undefined,
    wasmLanguagesPath: undefined,
    wasmTimeout: 60000  // 60 seconds
};

// Function to update options (used by CLI and other packages)
export function setOptions(newOptions: Partial<CoreOptions>): void {
    const updatedOptions = { ...options, ...newOptions };
    
    // Enforce worker disabling based on execution mode
    try {
        const { shouldDisableAllWorkers } = require('../utils/bundledEnvironmentDetector');
        if (shouldDisableAllWorkers()) {
            updatedOptions.enableTreeSitterWorker = false;
        }
    } catch (error) {
        // If import fails, default to safe behavior (workers disabled)
        if (updatedOptions.mode === 'cli' || updatedOptions.mode === 'vscode') {
            updatedOptions.enableTreeSitterWorker = false;
        }
    }
    
    options = updatedOptions;
}

// Function to get current options
export function getOptions(): CoreOptions {
    return { ...options };
} 