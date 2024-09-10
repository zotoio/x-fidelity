import { ScanResult, RuleFailure } from '../../types/typeDefs';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../../utils/configManager';

import { RunEngineOnFilesParams } from '../../types/typeDefs';

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure } = params;
    const msg = `\n==========================\nRUNNING FILE CHECKS..\n==========================`;
    logger.info(msg);
    const failures: ScanResult[] = [];

    for (const file of fileData) {
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
            const { results } = await engine.run(facts);
            for (const result of results) {
                logger.debug(JSON.stringify(result));
                if (result.result) {
                    fileFailures.push({
                        ruleFailure: result.name,
                        level: result.event?.type,
                        details: result.event?.params
                    });
                }
            }

            if (fileFailures.length > 0) {
                failures.push({ filePath: file.filePath, errors: fileFailures });
            }
        } catch (e) {
            logger.error(`Error processing file ${file.filePath}: ${e}`);
            failures.push({ 
                filePath: file.filePath, 
                errors: [{ 
                    ruleFailure: 'ProcessingError', 
                    level: 'error', 
                    details: { message: `Error processing file: ${e}` } 
                }] 
            });
        }
    }

    return failures;
}
