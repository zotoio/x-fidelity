import { Command } from 'commander';
import { logger, setOptions } from '@x-fidelity/core';
import path from "path";
import fs from "fs";
import json from 'prettyjson';
import { CLIOptions } from '@x-fidelity/types';

export let options: CLIOptions = {
    dir: '.',
    archetype: 'node-fullstack',
    mode: 'client',
    extraPlugins: []
};

export const DEMO_CONFIG_PATH = path.resolve(__dirname, 'demoConfig');

export function initCLI(): void {
    const program = new Command();

    program
        .name('xfidelity')
        .description('CLI tool for opinionated framework adherence checks')
        .version(require('../package.json').version, '-v, --version', 'output the version number')
        .option('-d, --dir <path>', 'path to repository root', '.')
        .option('-a, --archetype <archetype>', 'The archetype to use for analysis', 'node-fullstack')
        .option('-c, --configServer <url>', 'The config server URL for fetching remote archetype configuration')
        .option('-l, --localConfigPath <path>', 'Path to local archetype config and rules')
        .option('-o, --openaiEnabled', 'Enable OpenAI analysis')
        .option('-t, --telemetryCollector <url>', 'The URL telemetry data will be sent to for usage analysis')
        .option('-m, --mode <mode>', 'Run mode: \'client\' or \'server\'', 'client')
        .option('-p, --port <number>', 'The port to run the server on', '8888')
        .option('-j, --jsonTTL <minutes>', 'Set the server JSON cache TTL in minutes', '10')
        .option('-e, --extraPlugins <modules...>', 'Space-separated list of npm module names to load as extra plugins')
        .option('-x, --examine', 'Validate archetype config only')
        .option('--output-format <format>', 'Output format: human (default) or json')
        .option('--output-file <path>', 'Write structured output to file (works with --output-format json)')
        .parse(process.argv);

    const opts = program.opts();

    options = {
        dir: opts.dir || '.',
        archetype: opts.archetype || 'node-fullstack',
        configServer: opts.configServer,
        localConfigPath: opts.localConfigPath || DEMO_CONFIG_PATH,
        openaiEnabled: opts.openaiEnabled || false,
        telemetryCollector: opts.telemetryCollector,
        mode: opts.mode || 'client',
        port: opts.port ? parseInt(opts.port) : undefined,
        jsonTTL: opts.jsonTTL,
        extraPlugins: opts.extraPlugins || [],
        examine: opts.examine,
        outputFormat: opts.outputFormat,
        outputFile: opts.outputFile
    };

    // Update core options so they're available to other packages
    setOptions({
        dir: opts.dir || '.',
        archetype: opts.archetype || 'node-fullstack',
        configServer: opts.configServer,
        localConfigPath: opts.localConfigPath || DEMO_CONFIG_PATH,
        openaiEnabled: opts.openaiEnabled || false,
        telemetryCollector: opts.telemetryCollector,
        mode: opts.mode || 'client',
        port: opts.port ? parseInt(opts.port) : undefined,
        jsonTTL: opts.jsonTTL,
        extraPlugins: opts.extraPlugins || []
    });

    logger.debug({ options }, 'CLI options parsed');

    // Validate input
    const dirPath = options.dir || '.';
    if (!fs.existsSync(dirPath)) {
        logger.error(`Directory ${dirPath} does not exist`);
        process.exit(1);
    }

    // If examine flag is set, display archetype config and exit
    if (options.examine) {
        const archetypeName = options.archetype || 'node-fullstack';
        const archetypeConfigPath = path.resolve(options.localConfigPath || DEMO_CONFIG_PATH, `${archetypeName}.json`);
        if (!fs.existsSync(archetypeConfigPath)) {
            logger.error(`Archetype ${archetypeName} not found in ${options.localConfigPath || DEMO_CONFIG_PATH}`);
            process.exit(1);
        }
        logger.info(`Archetype config for ${archetypeName}:`);
        const config = JSON.parse(fs.readFileSync(archetypeConfigPath, 'utf8'));
        logger.info(json.render(config));
        process.exit(0);
    }
} 