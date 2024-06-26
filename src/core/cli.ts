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

console.log(banner);
logger.info([banner]);

program
    .option("-d, --dir <directory>", "The repo checkout directory")
    .option("-c, --configUrl <url>", "The URL used to fetch config");

program.parse();

const options = program.opts();

// print help if no arguments are passed
if (program.options.length === 0) program.help();

if (!options.dir) {
    console.error("Repo directory is required. Please specify the directory using the -d or --dir option.");
    process.exit(1);
}

console.log(`Analysis of: ${process.env.PWD}/${options.dir}`);
logger.info(`Analysis of: ${process.env.PWD}/${options.dir}`);
console.log('=====================================');
logger.info('=====================================');

export { options };
