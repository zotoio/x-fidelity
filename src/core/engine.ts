import { Engine,RuleProperties } from 'json-rules-engine';
import { FileData, parseRepo } from './parser'; 
import { rules } from '../rules';
import { operators } from '../operators';

async function analyzeCodebase(repoPath: string): Promise<any[]> {
    const filesData: FileData[] = parseRepo(repoPath); // Your function to parse the repo into JSON
    const engine = new Engine();

    // Add operators to engine
    operators.map((operator) => engine.addOperator(operator.name, operator.fn));

    // Add rules to engine
    rules.map((rule) => engine.addRule(rule));

    engine.on('failure', function(event, almanac, ruleResult) {
        console.log(event) 
    });

    // Run the engine for each file's data
    let failures: any[] = [];
    for (const fileData of filesData) {
        console.log(`running engine for ${fileData.filePath}...`);
        let fileContent = fileData.content;
        await engine.run({ fileContent })
            .then(({failureResults}) => {
                failureResults.map((result) => {
                    failures.push({
                        'filePath': fileData.filePath,
                        'message': result?.event?.params?.message
                    })
                })
            }).catch(e => console.log(e));
    }

    console.log(`${filesData.length} files analyzed..`)

    return failures;
    
}

export { analyzeCodebase };