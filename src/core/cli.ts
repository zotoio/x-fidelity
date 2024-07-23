import { logger } from '../utils/logger';
import { program } from "commander";
import { startServer } from '../server/server';

program
    .option("-d, --dir <directory>", "The checkout directory to analyse", ".")
    .option("-a, --archetype <archetype>", "The archetype to use for analysis", "node-fullstack")
    .option("-c, --configServer <configServer>", "The config server URL for fetching remote archetype configurations and rules")
    .option("-m, --mode <mode>", "Run mode: 'cli' or 'server'", "cli")
    .option("-p, --port <port>", "Port number for server mode", "3000");

program.parse();

const options = program.opts();

if (options.mode === 'server') {
    startServer(options.port);
} else {
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
archetype: ${options.archetype}
directory: ${process.env.PWD}/${options.dir}
configServer: ${options.configServer ? options.configServer : 'none'}
for available options run: xfidelity --help
=====================================`);

logger.info(banner);

// print help if no arguments are passed
if (program.options.length === 0) program.help();

export { options };
