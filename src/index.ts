import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine";

console.log(`analyzing repo at ${options.dir}...`);

(async () => {
    await analyzeCodebase(options.dir);
})();

console.log('done!');
