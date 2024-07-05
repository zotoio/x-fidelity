import { logger } from '../utils/logger';
import { Engine, EngineResult, RuleProperties, RuleResult } from 'json-rules-engine';
import { FileData, collectRepoFileData, collectStandardDirectoryStructure } from '../facts/repoFilesystemFacts';
import { loadRules } from '../rules';
import { operators } from '../operators';
import { ScanResult, RuleFailure } from '../typeDefs';
import { getDependencyVersionFacts, collectMinimumDependencyVersions } from
    '../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../facts/openaiAnalysisFacts';

async function analyzeCodebase(repoPath: string, configUrl?: string): Promise<any[]> {
    const installedDependencyVersions = await getDependencyVersionFacts();
    const fileData: FileData[] = await collectRepoFileData(repoPath);
    const minimumDependencyVersions = await collectMinimumDependencyVersions(configUrl);
    const standardStructure = await collectStandardDirectoryStructure(configUrl);
    const openaiSystemPrompt = await collectOpenaiAnalysisFacts(fileData);

    const engine = new Engine([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });

    // Add operators to engine                                                                                         
    operators.map((operator) => {
        if (!operator?.name?.includes('openai') || (process.env.OPENAI_API_KEY && operator?.name?.includes('openai'))) {
            console.log(`adding custom operator: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }
    });        

    // Add rules to engine                                                                                             
    const rules: RuleProperties[] = await loadRules();

    rules.map((rule) => {

        try {
            if (!rule?.name?.includes('openai') || (process.env.OPENAI_API_KEY && rule?.name?.includes('openai'))) {
                console.log(`adding rule: ${rule?.name}`);
                engine.addRule(rule);
            }    
        } catch (e: any) {
            console.error(`Error loading rule: ${rule?.name}`);
            logger.error(e.message);
        }
    });

    engine.on('success', ({ type, params }) => {
        if (type === 'violation') {
            //console.log(params);
        }
    })

    if (process.env.OPENAI_API_KEY) {
        console.log(`adding openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // Run the engine for each file's data                                                                             
    let failures: ScanResult[] = [];
    for (const file of fileData) {
        logger.info(`running engine for ${file.filePath}`);

        const facts = {
            fileData: file,
            dependencyData: {
                installedDependencyVersions,
                minimumDependencyVersions
            },
            standardStructure

        };
        let fileFailures: RuleFailure[] = [];
        console.log(`running engine for ${file.filePath} ..`);
        await engine.run(facts)
            .then(({ results }: EngineResult) => {
                //console.log(events);
                results.map((result: RuleResult) => {
                    logger.debug(result);
                    if (result.result) {
                        fileFailures.push({
                            ruleFailure: result.name,
                            details: result.event?.params
                        })
                    }
                })
            }).catch(e => logger.error(e));

        if (fileFailures.length > 0) {
            failures.push({ filePath: file.filePath, errors: fileFailures });
        }
    }

    logger.info(`${fileData.length} files analyzed. ${failures.length} files with errors.`)

    return failures;

}

export { analyzeCodebase }; 