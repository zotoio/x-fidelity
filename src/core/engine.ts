import { logger } from '../utils/logger';
import { Engine, EngineResult, RuleProperties, RuleResult } from 'json-rules-engine';
import { FileData, collectRepoFileData } from '../facts/repoFilesystemFacts';
import { ScanResult, RuleFailure, ArchetypeConfig } from '../typeDefs';
import { getDependencyVersionFacts } from '../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../facts/openaiAnalysisFacts';
import axios from 'axios';
import { archetypes } from '../archetypes';
import { loadRules } from '../rules';
import { loadOperators } from '../operators';
import { loadFacts } from '../facts';

async function analyzeCodebase(repoPath: string, archetype: string = 'node-fullstack'): Promise<any[]> {
    let archetypeConfig: ArchetypeConfig = archetypes[archetype] || archetypes['node-fullstack'];
    
    if (archetypeConfig.configUrl) {
        try {
            const response = await axios.get(archetypeConfig.configUrl);
            archetypeConfig = {
                ...archetypeConfig,
                config: {
                    ...archetypeConfig.config,
                    ...response.data
                }
            };
        } catch (error) {
            logger.error(`Error fetching remote config: ${error}`);
        }
    }

    const installedDependencyVersions = await getDependencyVersionFacts(archetypeConfig);
    const fileData: FileData[] = await collectRepoFileData(repoPath, archetypeConfig);
    const { minimumDependencyVersions, standardStructure } = archetypeConfig.config;
    const openaiSystemPrompt = await collectOpenaiAnalysisFacts(fileData);

    const engine = new Engine([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });

    // Add operators to engine
    const operators = await loadOperators(archetypeConfig.operators);
    operators.forEach((operator) => {
        if (!operator?.name?.includes('openai') || (process.env.OPENAI_API_KEY && operator?.name?.includes('openai'))) {
            console.log(`adding custom operator: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }
    });

    // Add rules to engine
    const rules: RuleProperties[] = await loadRules(archetypeConfig.rules);
    rules.forEach((rule) => {
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
    });

    // Add facts to engine
    const facts = await loadFacts(archetypeConfig.facts);
    facts.forEach((fact) => {
        engine.addFact(fact.name, fact.fn);
    });

    if (process.env.OPENAI_API_KEY && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        console.log(`adding openai facts to engine..`);
        engine.addFact('openaiAnalysis', (params, almanac) => Promise.resolve(openaiAnalysis(params, almanac)));
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
