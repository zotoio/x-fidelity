import { Engine, EngineResult, RuleResult } from 'json-rules-engine';
import { FileData } from '../../facts/repoFilesystemFacts';
import { ScanResult, RuleFailure } from '../../types/typeDefs';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../../config/configManager';

export async function runEngineOnFiles(
    engine: Engine,
    fileData: FileData[],
    installedDependencyVersions: any,
    minimumDependencyVersions: any,
    standardStructure: any
): Promise<ScanResult[]> {
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
    return failures;
}
