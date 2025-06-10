// Minimal options interface for core package use
// CLI-specific options should be handled in the CLI package

export interface CoreOptions {
    localConfigPath?: string;
    jsonTTL?: string;
    archetype?: string;
    configServer?: string;
    mode?: string;
    dir?: string;
    extensions?: string[];
    port?: number;
    openaiEnabled?: boolean;
    telemetryCollector?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    telemetryEnabled?: boolean;
    maxFileSize?: number;
    timeout?: number;
}

// Default options for core functionality
export let options: CoreOptions = {
    localConfigPath: undefined,
    jsonTTL: '60',
    archetype: 'node-fullstack',
    configServer: undefined,
    mode: 'analyze',
    dir: undefined,
    extensions: [],
    port: undefined,
    openaiEnabled: false,
    telemetryCollector: undefined,
    logLevel: 'info',
    telemetryEnabled: true,
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 30000 // 30 seconds
};

// Function to update options (used by CLI and other packages)
export function setOptions(newOptions: Partial<CoreOptions>): void {
    options = { ...options, ...newOptions };
}

// Function to get current options
export function getOptions(): CoreOptions {
    return { ...options };
} 