import { logger } from '../utils/logger';
import { program } from "commander";
import path from "path";
import fs from "fs";
import { version } from "../../package.json";
import { validateInput } from '../utils/inputValidation';
import { pluginRegistry } from '../core/pluginRegistry';

// Ensure logger is initialized
if (!logger || typeof logger.info !== 'function') {
    console.error('Logger is not properly initialized');
    // Instead of exiting, we'll create a fallback logger
    const fallbackLogger = {
        info: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug
    };
    (global as any).logger = fallbackLogger;
}

program
    .option("-d, --dir <directory>", "code directory to analyze. equivalent of directory argument")
    .option("-a, --archetype <archetype>", "The archetype to use for analysis", "node-fullstack")
    .option("-c, --configServer <configServer>", "The config server URL for fetching remote archetype configurations and rules")
    .option("-o, --openaiEnabled <boolean>", "Enable OpenAI analysis", false)
    .option("-t, --telemetryCollector <telemetryCollector>", "The URL telemetry data will be sent to for usage analysis")
    .option("-m, --mode <mode>", "Run mode: 'client' or 'server'", "client")
    .option("-p, --port <port>", "The port to run the server on", "8888")
    .option("-l, --localConfigPath <path>", "Path to local archetype config and rules")
    .option("-j, --jsonTTL <minutes>", "Set the server json cache TTL in minutes", "10")
    .option("-e, --extensions <modules...>", "Space-separated list of npm module names to load as extensions")
    .version(version, "-v, --version", "Output the version number of xfidelity")
    .helpOption("-h, --help", "Display help for command")
    .argument('[directory]', 'code directory to analyze');

const options = program.opts();

program.parse(process.argv);

// If no options or args are provided, display the help message
if (process.argv.length === 2 && program.args.length === 0) {
    // dont exit in tests
    if (process.env.NODE_ENV !== 'test') program.help();
}

// Resolve paths
if (process.env.NODE_ENV === 'test' || options.mode === 'server') options.dir = '.';
const resolvePath = (inputPath: string) => {
    const resolvedPath = path?.resolve(process.cwd(), inputPath);
    if (!validateInput(resolvedPath)) {
        logger.warn(`Potential malicious input detected: ${inputPath}`);
        return null;
    }
    return resolvedPath;
};
options.dir = program.args.length == 1 ? resolvePath(program.args[0]) : resolvePath(options.dir);
if (options.localConfigPath) {
    options.localConfigPath = resolvePath(options.localConfigPath);
}

// if dir does not exist or is invalid, exit
if (!options.dir || !fs.existsSync(options.dir)) {
    logger.error(`Target directory ${options.dir} does not exist or is invalid`);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
}

// if localConfig path does not exist or is invalid, exit
if (options.localConfigPath && (!fs.existsSync(options.localConfigPath) || !validateInput(options.localConfigPath))) {
    logger.error(`LocalConfigPath ${options.localConfigPath} does not exist or is invalid`);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
}

const banner = (`
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
${new Date().toString().slice(0, 24)}
version: ${version}
archetype: ${options.archetype}
directory: ${options.dir}
configServer: ${options.configServer ? options.configServer : 'none'}
mode: ${options.mode}
port: ${options.mode === 'server' ? options.port : 'n/a'}
localConfigPath: ${options.localConfigPath ? options.localConfigPath : 'none'}
jsonTTL: ${options.jsonTTL} minutes
openaiEnabled: ${options.openaiEnabled}
extensions: ${options.extensions ? options.extensions : 'none'}
for options run: xfidelity --help
=====================================`);

logger.info(banner);

// print help if no arguments are passed
if (program.options.length === 0) program.help();

export { options };
