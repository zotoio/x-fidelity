import { logger } from '../utils/logger';
import { program } from "commander";

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
${new Date().toString()}`);

logger.debug(banner);
logger.info([banner]);

program
    .option("-d, --dir <directory>", "The checkout directory to analyse", ".")
    .option("-a, --archetype <archetype>", "The archetype to use for analysis", "node-fullstack")
    .option("-c, --configServer <configServer>", "The config server URL for fetching remote archetype configurations and rules");

program.parse();

const options = program.opts();

// print help if no arguments are passed
if (program.options.length === 0) program.help();

if (!options.dir) {
    console.error("Checkout directory not provided. Defaulting to current directory.");
}

let msg = `Archetype ${options.archetype}: analysis of: ${process.env.PWD}/${options.dir}`;
logger.info(msg)&& console.log(msg) ;
msg = `configServer: ${options.configServer ? options.configServer : 'local'}`;
logger.info(msg)&& console.log(msg) ;
msg = '=====================================';
logger.info(msg) && console.log(msg);

export { options };
