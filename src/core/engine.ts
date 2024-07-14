import { logger } from '../utils/logger';
import { Almanac, Engine, EngineResult, Event, RuleProperties, RuleResult } from 'json-rules-engine';
import { FileData, collectRepoFileData } from '../facts/repoFilesystemFacts';
import { ScanResult, RuleFailure, ArchetypeConfig, OpenAIAnalysisParams } from '../typeDefs';
import { getDependencyVersionFacts, repoDependencyAnalysis } from '../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../facts/openaiAnalysisFacts';
import { loadOperators } from '../operators';
import { loadFacts } from '../facts';
import { loadRules } from '../rules';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../utils/config';

async function analyzeCodebase(repoPath: string, archetype: string = 'node-fullstack', configServer: string = ''): Promise<any[]> {
    const configManager = ConfigManager.getInstance();
    await configManager.initialize(archetype, configServer);
    const archetypeConfig = configManager.getConfig();

    const installedDependencyVersions = await getDependencyVersionFacts(archetypeConfig);
    const fileData: FileData[] = await collectRepoFileData(repoPath, archetypeConfig);

    // add REPO_GLOBAL_CHECK to fileData, which is the trigger for global checks
    fileData.push({
        fileName: REPO_GLOBAL_CHECK,
        filePath: REPO_GLOBAL_CHECK,
        fileContent: REPO_GLOBAL_CHECK
    });

    const { minimumDependencyVersions, standardStructure } = archetypeConfig.config;
    const openaiSystemPrompt = await collectOpenaiAnalysisFacts(fileData);

    const engine = new Engine([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });

    // Add operators to engine
    console.log(`### loading custom operators..`);
    const operators = await loadOperators(archetypeConfig.operators);
    operators.forEach((operator) => {
        if (!operator?.name?.includes('openai') || (process.env.OPENAI_API_KEY && operator?.name?.includes('openai'))) {
            console.log(`adding custom operator: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }
    });

    // Add rules to engine
    console.log(`### loading json rules..`);
    const rules: RuleProperties[] = await loadRules(archetype, archetypeConfig.rules, configManager.configServer);
    logger.debug(rules);

    rules.forEach((rule) => {
        try {
            console.log(`adding rule: ${rule?.name}`);
            engine.addRule(rule);
                
        } catch (e: any) {
            console.error(`Error loading rule: ${rule?.name}`);
            logger.error(e.message);
        }
    });

    engine.on('success', async ({ type, params }: Event, almanac: Almanac) => {
        if (type === 'violation') {
            //console.log(await almanac.factValue('dependencyData'));
            console.log(`Rule violation: ${JSON.stringify(params)}}`);
        }
    });

    // Add facts to engine
    console.log(`### loading facts..`);
    const facts = await loadFacts(archetypeConfig.facts);
    facts.forEach((fact) => {
        if (!fact?.name?.includes('openai') || (process.env.OPENAI_API_KEY && fact?.name?.includes('openai'))) {
            console.log(`adding fact: ${fact.name}`);
            engine.addFact(fact.name, fact.fn);
        }    
    });

    if (process.env.OPENAI_API_KEY && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        console.log(`adding additional openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // add output facts
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);

    // Run the engine for each file's data    
    console.log(`### Executing rules..`);                                                                         
    let failures: ScanResult[] = [];
    for (const file of fileData) {
        if (file.fileName === 'REPO_GLOBAL_CHECK') {
            let msg = `\n==========================\nSTARTING GLOBAL REPO CHECKS..\n==========================`
            logger.info(msg) && console.log(msg);
            
        } else {  
            let msg = `running engine for ${file.filePath}`   
            logger.info(msg) && console.log(msg);
        }
        const facts = {
            fileData: file,
            dependencyData: {
                installedDependencyVersions,
                minimumDependencyVersions
            },
            standardStructure

        };
        let fileFailures: RuleFailure[] = [];
        
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
