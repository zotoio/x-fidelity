import { logger, logPrefix } from '../utils/logger';
import { Engine, EngineResult, Event, RuleProperties, RuleResult } from 'json-rules-engine';
import { FileData, collectRepoFileData } from '../facts/repoFilesystemFacts';
import { ScanResult, RuleFailure} from '../types/typeDefs';
import { getDependencyVersionFacts, repoDependencyAnalysis } from '../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../facts/openaiAnalysisFacts';
import { loadOperators } from '../operators';
import { loadFacts } from '../facts';
import { loadRules } from '../rules';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../utils/config';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { sendTelemetry } from '../utils/telemetry';
import { execSync } from 'child_process';
import os from 'os';

async function analyzeCodebase(repoPath: string, archetype = 'node-fullstack', configServer = '', localConfigPath = ''): Promise<any[]> {
    logger.info(`INITIALISING..`);
    const configManager = ConfigManager.getInstance();
    await configManager.initialize(archetype, configServer, localConfigPath);
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

    let openaiSystemPrompt; 
    if (isOpenAIEnabled()) {
        openaiSystemPrompt = await collectOpenaiAnalysisFacts(fileData);
    }

    const engine = new Engine([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });

    // Get GitHub repository URL
    let repoUrl = '';
    try {
        repoUrl = execSync('git config --get remote.origin.url', { cwd: repoPath }).toString().trim();
    } catch (error) {
        logger.warn('Unable to get GitHub repository URL');
    }

    // Get host information
    const hostInfo = {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
    };

    // Get user information
    const userInfo = {
        username: os.userInfo().username,
        homedir: os.userInfo().homedir,
        shell: os.userInfo().shell
    };

    // Send telemetry for analysis start
    await sendTelemetry({
        eventType: 'analysisStart',
        metadata: {
            archetype,
            repoPath,
            repoUrl,
            fileCount: fileData.length,
            configServer: configServer || 'none',
            hostInfo,
            userInfo
        },
        timestamp: new Date().toISOString()
    });

    // Add operators to engine
    logger.info(`=== loading custom operators..`);
    const operators = await loadOperators(archetypeConfig.operators);
    operators.forEach((operator) => {
        if (!operator?.name?.includes('openai') || (process.env.OPENAI_API_KEY && operator?.name?.includes('openai'))) {
            logger.info(`adding custom operator: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }
    });

    // Add rules to engine
    logger.info(`=== loading json rules..`);
    const rules: RuleProperties[] = await loadRules(archetype, archetypeConfig.rules, configManager.configServer, logPrefix, configManager.localConfigPath);
    logger.debug(rules);

    rules.forEach((rule) => {
        try {
            logger.info(`adding rule: ${rule?.name}`);
            engine.addRule(rule);

        } catch (e: any) {
            console.error(`Error loading rule: ${rule?.name}`);
            logger.error(e.message);
        }
    });

    engine.on('success', async ({ type, params }: Event) => {
        if (type === 'violation') {
            logger.warn(`violation detected: ${JSON.stringify(params)}}`);
            await sendTelemetry({
                eventType: 'violation',
                metadata: {
                    archetype,
                    repoPath,
                    ...params
                },
                timestamp: new Date().toISOString()
            });
        }
        if (type === 'fatality') {
            logger.error(`fatality detected: ${JSON.stringify(params)}}`);
            await sendTelemetry({
                eventType: 'fatality',
                metadata: {
                    archetype,
                    repoPath,
                    ...params
                },
                timestamp: new Date().toISOString()
            });
        }
    });

    // Add facts to engine
    logger.info(`=== loading facts..`);
    const facts = await loadFacts(archetypeConfig.facts);
    facts.forEach((fact) => {
        if (!fact?.name?.includes('openai') || (process.env.OPENAI_API_KEY && fact?.name?.includes('openai'))) {
            logger.info(`adding fact: ${fact.name}`);
            engine.addFact(fact.name, fact.fn);
        }
    });

    if (isOpenAIEnabled() && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        logger.info(`adding additional openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // add output facts
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);

    // Run the engine for each file's data    
    const msg = `\n==========================\nRUNNING FILE CHECKS..\n==========================`;
    logger.info(msg);
    const failures: ScanResult[] = [];
    const enginePromises = fileData.map(async (file) => {
        if (file.fileName === REPO_GLOBAL_CHECK) {
            const msg = `\n==========================\nRUNNING GLOBAL REPO CHECKS..\n==========================`;
            logger.info(msg);
        } else {
            const msg = `analysing ${file.filePath} ...`
            logger.info(msg);
        }
        const facts = {
            fileData: file,
            dependencyData: {
                installedDependencyVersions,
                minimumDependencyVersions
            },
            standardStructure
        };
        const fileFailures: RuleFailure[] = [];

        try {
            const { results }: EngineResult = await engine.run(facts);
            results.forEach((result: RuleResult) => {
                logger.debug(result);
                if (result.result) {
                    fileFailures.push({
                        ruleFailure: result.name,
                        details: result.event?.params
                    });
                }
            });

            if (fileFailures.length > 0) {
                failures.push({ filePath: file.filePath, errors: fileFailures });
            }
        } catch (e) {
            logger.error(e);
        }
    });

    await Promise.all(enginePromises);

    const finishMsg = `\n==========================\nCHECKS COMPLETED..\n==========================`;
    logger.info(finishMsg);
    logger.info(`${fileData.length} files analyzed. ${failures.length} files with errors.`)

    const fatalities = findKeyValuePair(failures, 'level', 'fatality');

    // Send telemetry for analysis end
    await sendTelemetry({
        eventType: 'analysisEnd',
        metadata: {
            archetype,
            repoPath,
            repoUrl,
            fileCount: fileData.length,
            failureCount: failures.length,
            fatalityCount: fatalities.length,
            hostInfo,
            userInfo
        },
        timestamp: new Date().toISOString()
    });

    if (fatalities.length > 0) {
        throw new Error(JSON.stringify(fatalities));
    }
    return failures;
}

const findKeyValuePair = (
    data: any,
    targetKey: string,
    targetValue: any
): any[] => {
    const results: any[] = [];

    const recursiveSearch = (obj: any): void => {
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (key === targetKey && obj[key] === targetValue) {
                        results.push(obj);
                        return; // Stop searching this branch as we've found the target in this object
                    }
                    if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
                        recursiveSearch(obj[key]);
                    }
                }
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item) => {
                recursiveSearch(item);
            });
        }
    };

    if (Array.isArray(data)) {
        data.forEach((item) => {
            recursiveSearch(item);
        });
    } else {
        recursiveSearch(data);
    }

    return results;
};

export { analyzeCodebase }; 
