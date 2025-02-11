import { logger } from '../utils/logger';
import { program } from "commander";
import path from "path";
import fs from "fs";
import { version } from "../../package.json";
import { validateInput } from '../utils/inputValidation';
import json from 'prettyjson';

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

export const DEMO_CONFIG_PATH = path.resolve(__dirname, '../demoConfig');

// we are overiding the default behavior of commander to exit 
// the process due to https://github.com/pinojs/pino/issues/871
program.exitOverride((e) => {
    try {
        process.exit(0);
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
    .version(version, "-v, --version", "Output the version number of xfidelity")
    .helpOption("-h, --help", "Display help for command")
    .argument('[directory]', 'code directory to analyze');

const options = program.opts();

program.parse(process.argv);

// If no options or args are provided, display the help message
if (process.argv.length === 2 && program.args.length === 0) {
    program.help();
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
    startTime: new Date().toString().slice(0, 24),
    version,
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

export { options };
