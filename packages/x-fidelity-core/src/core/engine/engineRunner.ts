import { ScanResult, RuleFailure, ErrorLevel, RunEngineOnFilesParams } from '@x-fidelity/types';
import { Engine } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../configManager';
import { executeErrorAction } from './errorActionExecutor';

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure } = params;
    const results: ScanResult[] = [];

    // Add configuration facts to the engine that are needed by rules
    engine.addFact('standardStructure', standardStructure, { priority: 50 });
    engine.addFact('installedDependencyVersions', installedDependencyVersions, { priority: 50 });
    engine.addFact('minimumDependencyVersions', minimumDependencyVersions, { priority: 50 });

    for (const file of fileData) {
        try {
            // Add the current file as a fact to the engine
            engine.addFact('fileData', file, { priority: 100 });
            
            // Run the engine with empty context since fileData is now a fact
            const fileResults = await engine.run({});
            if (fileResults.events.length > 0) {
                results.push({
                    filePath: file.filePath,
                    errors: fileResults.events.map((event: any) => ({
                        ruleFailure: event.type,
                        level: event.params?.level || 'error',
                        message: event.params?.message || '',
                        data: {
                            ...event.params?.data,
                            filePath: file.filePath,
                            fileName: file.fileName,
                            resultFact: event.params?.resultFact || event.params?.data?.resultFact
                        },
                        details: event.params?.details
                    }))
                });
            }
        } catch (error) {
            // Enhanced error logging with comprehensive debugging information
            const errorDetails = {
                file: file.filePath || 'unknown',
                fileName: file.fileName || 'unknown',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fileSize: file.fileContent?.length || 0,
                engineRulesCount: engine.prioritizedRules?.length || 0,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                timestamp: new Date().toISOString()
            };
            
            logger.error('Engine execution failed on file:', errorDetails);
            
            // Add structured error result to maintain backwards compatibility
            // This ensures analysis continues and errors are properly tracked
            results.push({
                filePath: file.filePath,
                errors: [{
                    ruleFailure: 'engine-error',
                    level: 'error',
                    message: `Engine failed to process file: ${errorDetails.error}`,
                    data: { 
                        filePath: file.filePath,
                        fileName: file.fileName,
                        errorType: errorDetails.errorType
                    }
                } as any] // Cast to any to handle both ScanResult and RuleFailure interfaces
            });
        }
    }

    return results;
}
