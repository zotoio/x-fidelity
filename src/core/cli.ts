import { logger } from '../utils/logger';
import { program } from "commander";
import path from "path";
import fs from "fs";
import { version } from "../../package.json";
import { validateInput } from '../utils/inputValidation';
import json from 'prettyjson';

export const DEMO_CONFIG_PATH = path.resolve(__dirname, '../demoConfig');
export const options = program.opts();

export function initCLI() {

    // Ensure logger is initialized
    if (!logger || typeof logger.info !== 'function') {
        console.error({ msg: 'Logger is not properly initialized' });
        // Instead of exiting, we'll create a fallback logger
        const fallbackLogger = {
            info: (obj: unknown) => console.log(JSON.stringify(obj)),
            error: (obj: unknown) => console.error(JSON.stringify(obj)),
            warn: (obj: unknown) => console.warn(JSON.stringify(obj)), 
            debug: (obj: unknown) => console.debug(JSON.stringify(obj))
        };
        (global as any).logger = fallbackLogger;
    }

    logger.info('CLI initialized');

    // we are overiding the default behavior of commander to exit 
    // the process due to https://github.com/pinojs/pino/issues/871
    program.exitOverride(() => {
        try {
            if (process.env.NODE_ENV !== 'test') process.exit(0);
        } catch (error) {
            //swallow
        }
    });

    program
        .option("-d, --dir <directory>", "code directory to analyze. equivalent of directory argument")
        .option("-a, --archetype <archetype>", "The archetype to use for analysis", "node-fullstack")
        .option("-c, --configServer <configServer>", "The config server URL for fetching remote archetype configurations and rules. This takes precedence over localConfigPath.")
        .option("-o, --openaiEnabled <boolean>", "Enable OpenAI analysis", false)
        .option("-t, --telemetryCollector <telemetryCollector>", "The URL telemetry data will be sent to for usage analysis")
        .option("-m, --mode <mode>", "Run mode: 'client' or 'server'", "client")
        .option("-p, --port <port>", "The port to run the server on", "8888")
        .option("-l, --localConfigPath <path>", "Path to local archetype config and rules", DEMO_CONFIG_PATH)
        .option("-j, --jsonTTL <minutes>", "Set the server json cache TTL in minutes", "10")
        .option("-e, --extensions <modules...>", "Space-separated list of npm module names to load as extensions")
        .option("-x, --examine <archetype>", "Examine the archetype configuration and rules")
        .version(version, "-v, --version", "Output the version number of xfidelity")
        .helpOption("-h, --help", "Display help for command")
        .argument('[directory]', 'code directory to analyze');

    

    program.parse(process.argv);

    // Resolve paths
    const resolvePath = (inputPath: string) => {
        const resolvedPath = path?.resolve(process.cwd(), inputPath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Path does not exist: ${resolvedPath}`);
        }
        if (!validateInput(resolvedPath)) {
            throw new Error(`Potential malicious input detected: ${inputPath}`);
        }
        return resolvedPath;
    };

    if (program.args.length === 0) {
        if (process.env.NODE_ENV === 'test' || options.mode === 'server') options.dir = '.';
        if (!options.dir && process.env.NODE_ENV !== 'test') program.help({ error: false });
    }

    if (process.env.NODE_ENV === 'test' || options.mode === 'server') options.dir = '.';
    try {    
        options.dir = program.args.length == 1 && program.args[0] !== undefined ? resolvePath(program.args[0]) : options.dir && resolvePath(options.dir);
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') program.error(`Error resolving repo path to analyse: ${error}`)
    }

    try {
        if (options.localConfigPath) {
            options.localConfigPath = resolvePath(options.localConfigPath);
        }
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') program.error(`LocalConfigPath does not exist or is invalid: ${error}`);
    }

const bannerArt = `\n
=====================================
 __    __          ________  ______ 
| ##  | ##        | ######## \\######
 \\##\\/  ## ______ | ##__      | ##  
  >##  ## |      \\| ##  \\     | ##  
 /  ####\\  \\######| ######    | ##  
|  ## \\##\\        | ##       _| ##_ 
| ##  | ##        | ##      |   ## \\
 \\##   \\##         \\##       \\######
------------------------------------- 
`;

    logger.info(bannerArt);

    logger.info(`\n${json.render({
        version,
        startTime: new Date().toString().slice(0, 24),
        archetype: options.archetype,
        directory: options.dir,
        configServer: options.configServer ? options.configServer : 'none',
        mode: options.mode,
        port: options.mode === 'server' ? options.port : 'n/a', 
        localConfigPath: options.localConfigPath ? options.localConfigPath : 'none',
        jsonTTL: `${options.jsonTTL} minutes`,
        openaiEnabled: options.openaiEnabled,
        extensions: options.extensions ? options.extensions : 'none'
    })}
-------------------------------------
    `);

    // print help if no arguments are passed
    if (program.options.length === 0) program.help();
}

