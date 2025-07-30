import { Command } from 'commander';
import { logger, setOptions } from '@x-fidelity/core';
import path from "path";
import fs from "fs";
import json from 'prettyjson';
import { CLIOptions, ExecutionMode, EXECUTION_MODES } from '@x-fidelity/types';


export let options: CLIOptions = {
    dir: '.',
    archetype: 'node-fullstack',
    mode: 'cli' as ExecutionMode,
    extraPlugins: []
};

// Point to the bundled demo config directory
// In development: points to monorepo structure
// In production/global install: points to bundled demoConfig
export const DEMO_CONFIG_PATH = (() => {
    // Try bundled config in same directory as bundle (for global installations)
    const bundledPathSameDir = path.resolve(__dirname, 'demoConfig');
    if (require('fs').existsSync(bundledPathSameDir)) {
        return bundledPathSameDir;
    }
    
    // Try bundled config one level up (for some build configurations)
    const bundledPathParent = path.resolve(__dirname, '..', 'demoConfig');
    if (require('fs').existsSync(bundledPathParent)) {
        return bundledPathParent;
    }
    
    // Fall back to monorepo structure (for development)
    return path.resolve(__dirname, '..', '..', 'x-fidelity-democonfig', 'src');
})();

import { shouldDisableAllWorkers } from '@x-fidelity/core';

export function initCLI(): void {
    const program = new Command();
    
    // Get version from package.json
    const version = require('../package.json').version;

    program
        .name('xfidelity')
        .description(`CLI tool for opinionated framework adherence checks (v${version})`)
        .version(version, '-v, --version', 'output the version number')
        .argument('[directory]', 'path to repository root (default: current directory)')
        .option('-d, --dir <path>', 'path to repository root (overrides positional argument)')
        .option('-a, --archetype <archetype>', 'The archetype to use for analysis', 'node-fullstack')
        .option('-c, --configServer <url>', 'The config server URL for fetching remote archetype configuration')
        .option('-l, --localConfigPath <path>', 'Path to local archetype config and rules')
        .option('-g, --githubConfigLocation <url>', 'GitHub tree URL for config location (e.g., https://github.com/org/repo/tree/main/config)')
        .option('-o, --openaiEnabled', 'Enable OpenAI analysis')
        .option('-t, --telemetryCollector <url>', 'The URL telemetry data will be sent to for usage analysis')
        .option('-m, --mode <mode>', 'Run mode: \'cli\', \'vscode\', \'server\', or \'hook\' (\'client\' deprecated, use \'cli\')', 'cli')
        .option('-p, --port <number>', 'The port to run the server on', '8888')
        .option('-j, --jsonTTL <minutes>', 'Set the server JSON cache TTL in minutes', '10')
        .option('-e, --extraPlugins <modules...>', 'Space-separated list of npm module names to load as extra plugins')
        .option('-x, --examine', 'Validate archetype config only')
        .option('-z, --zap <files>', 'JSON array of specific files to analyze (relative to --dir or absolute paths)')
        .option('--file-cache-ttl <minutes>', 'File modification cache TTL in minutes', '60')
        .option('--output-format <format>', 'Output format: human (default) or json')
        .option('--output-file <path>', 'Write structured output to file (works with --output-format json)')
        .option('--enable-tree-sitter-wasm', 'Use WASM TreeSitter instead of native bindings (for compatibility)')
        .option('--enable-tree-sitter-worker', 'Enable TreeSitter worker mode (disabled by default, CLI uses direct parsing)')
        .option('--enable-file-logging', 'Enable logging to x-fidelity.log file (disabled by default)')
        .option('-w, --writeConfigSet [alias]', 'Save current options as a config set with the given alias (default: "default")')
        .option('-r, --readConfigSet [alias]', 'Load options from a saved config set (default: "default")');



    // Add main action handler for when no subcommand is provided
    program.action(async (directory, opts) => {
        // Import main analysis function to avoid circular dependency
        const { runMainAnalysis } = await import('./mainAnalysis');
        await runMainAnalysis(directory, opts);
    });

    // Check if no arguments provided (only node and script path)
    if (process.argv.length === 2) {
        // Show help with version when no arguments are provided
        program.help();
        process.exit(0);
    }

    program.parse(process.argv);
} 