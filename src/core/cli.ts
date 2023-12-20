import { program } from "commander";

program
    .option("-d, --dir <directory>", "Specify the repo directory");

program.parse();

const options = program.opts();
console.log(`starting with ${JSON.stringify(options)}...`);

if (!options.dir) {
    console.error("Repo directory is required. Please specify the directory using the -d or --dir option.");
    process.exit(1);
}

export { options };