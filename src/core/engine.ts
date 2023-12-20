import { Engine } from 'json-rules-engine';
import { FileData, parseRepo } from './parser'; 
import { rule } from '../rules/default';

async function analyzeCodebase(repoPath: string): Promise<void> {
    const filesData: FileData[] = parseRepo(repoPath); // Your function to parse the repo into JSON
    const engine = new Engine();

    // Add rules to the engine
    engine.addRule(rule);

    let failureEvents = [];

    // Run the engine for each file's data
    for (const fileData of filesData) {
        console.log(`Running engine for ${fileData.filePath}...`);
        let fileContent = fileData.content;
        let results = await engine.run({ fileContent });
        console.log(results);
        // Process results...
        if (results.failureEvents.length === 0) {
            console.log('No violations found.');      
        } else{
            console.log(results.failureEvents)
            failureEvents.push(results.failureEvents);
        }
    }
    if (failureEvents.length > 0) {
        console.log(`violations found in ${failureEvents.length} files.`);
        console.log(`${failureEvents.map(f => (f as any).filePath).join('\n')}`);
    }
    console.log(`processed ${filesData.length} files..`);
    console.log(`${filesData.map(f => f.filePath).join('\n')}`);
    console.log('done!');
}

export { analyzeCodebase };