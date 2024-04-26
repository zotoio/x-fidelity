import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine";

console.log(`analyzing repo at path: [${options.dir}]`);

try {
    (async () => {
        let results = await analyzeCodebase(options.dir);
        if (results.length > 0) {
            console.log('WARNING: lo-fi attributes detected in codebase!');
        }
        console.log(results);
        console.log('analysis completed.');
    })().catch((e) => {console.log(e)});
} catch(e) {
    console.log(e)
}
