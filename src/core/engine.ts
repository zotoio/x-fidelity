import { logger } from '../utils/logger';
import { Engine,RuleProperties } from 'json-rules-engine';
import { FileData, collectRepoFileData } from '../facts/repoFilesystemFacts'; 
import { loadRules } from '../rules';
import { operators } from '../operators';
import { getDependencyVersionFacts, collectMinimumDependencyVersions } from '../facts/repoDependencyFacts';
import { ScanResult, RuleFailure } from '../typeDefs';

async function analyzeCodebase(repoPath: string): Promise<any[]> {
    const installedDependencyVersions = await getDependencyVersionFacts();
    const fileData: FileData[] = await collectRepoFileData(repoPath); 
    const minimumDependencyVersions = await collectMinimumDependencyVersions();
    
    const engine = new Engine([], { replaceFactsInEventParams: true });

    // Add operators to engine
    operators.map((operator) => engine.addOperator(operator.name, operator.fn));

    // Add rules to engine
    const rules: RuleProperties[] = await loadRules();
     
    rules.map((rule) => {
        
        try {
            engine.addRule(rule)
        } catch (e: any) {     
            console.error(`Error loading rule: ${rule?.name}`);
            console.error(e.message);
        }
    });

    engine.on('failure', function(event, almanac, ruleResult) {
        //console.log(event) 
    });

    // Run the engine for each file's data
    let results: ScanResult[] = [];
    for (const file of fileData) {
        logger.info(`running engine for ${file.filePath}`);

        const facts = {fileData: file, dependencyData: {installedDependencyVersions, minimumDependencyVersions}};
        let fileFailures: RuleFailure[] = [];

        await engine.run(facts)
            .then(({failureResults}) => {
                failureResults.map((result) => {
                    fileFailures.push({
                        ruleFailure: result?.name,
                        details: result?.event?.params
                    })
                })
            }).catch(e => console.log(e));

        if (fileFailures.length > 0) {
            results.push({ filePath: file.filePath, errors: fileFailures});
        }
    }

    logger.info(`${fileData.length} files analyzed. ${results.length} files with errors.`)

    return results;
    
}

export { analyzeCodebase };