import { logger } from '../utils/logger';
import { program } from "commander";

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
    .option("-d, --dir <directory>", "The checkout directory to analyze (default: current directory)", ".")
    .option("-a, --archetype <archetype>", "The archetype to use for analysis (default: node-fullstack)", "node-fullstack")
    .option("-c, --configServer <configServer>", "The config server URL for fetching remote archetype configurations and rules")
    .option("-o, --openaiEnabled <boolean>", "Enable OpenAI analysis (default: false)", false)
    .option("-t, --telemetryCollector <telemetryCollector>", "The URL telemetry data will be sent to for usage analysis")
    .option("-m, --mode <mode>", "Run mode: 'cli' or 'server' (default: cli)", "cli")
    .option("-p, --port <port>", "The port to run the server on (default: 8888)", "8888")
    .option("-l, --localConfig <path>", "Path to local archetype config and rules");

program.parse();

const options = program.opts();

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
                               
--------------------
${new Date().toString().slice(0, 24)}
archetype: ${options.archetype}
directory: ${process.env.PWD}/${options.dir}
configServer: ${options.configServer ? options.configServer : 'none'}
mode: ${options.mode}
port: ${options.mode === 'server' ? options.port : 'N/A'}
local-config: ${options.localConfig ? options.localConfig : 'none'}
for available options run: xfidelity --help
=====================================`);

logger.info(banner);

// print help if no arguments are passed
if (program.options.length === 0) program.help();

export { options };
