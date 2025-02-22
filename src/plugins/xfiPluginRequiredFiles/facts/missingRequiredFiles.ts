import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { repoDir } from '../../../core/configManager';
import path from 'path';

export const missingRequiredFiles: FactDefn = {
    name: 'missingRequiredFiles',
    fn: async (params: any, almanac: any) => {
        const result: any = {'result': []};
        
        try {
            // Get the required files from params
            const requiredFiles = params.requiredFiles;
            if (!Array.isArray(requiredFiles)) {
                throw new Error('Required files parameter must be an array');
            }

            // Get globalFileData from almanac
            const globalFileData: FileData[] = await almanac.factValue('globalFileData');
            if (!Array.isArray(globalFileData?.fileData)) {
                throw new Error('Invalid globalFileData');
            }

            logger.info('Executing missingRequiredFiles check', { requiredFiles });

            // Get all file paths from the fileData fact
            const repoFiles = new Set(globalFileData.fileData.map((file: FileData) => {
                logger.trace(`${file.filePath} added to missingRequiredFiles check set`);
                return file.filePath;
            }));
            
            // get the repo dir for the current repo as prefix
            const repoDirPrefix = repoDir();
            logger.info(`Repo dir prefix: ${repoDirPrefix}`);

            // Find which required files are missing
            const missingFiles = requiredFiles.filter(file => {
                let pathCheck = path.join(repoDirPrefix, file);
                if (!pathCheck.startsWith(repoDirPrefix)) {
                    throw new Error(`Potential malicious input detected: ${file}`);
                }
                let result = !repoFiles.has(pathCheck);
                if (result) {
                    logger.error(`Required file: ${pathCheck} is missing`);
                } else {
                    logger.info(`Required file: ${pathCheck} is present`);
                }
                return result;
            });

            if (missingFiles.length > 0) {
                logger.error(`Missing required files: ${JSON.stringify(missingFiles)}`);
                result.result = missingFiles;
            } else {
                logger.debug('All required files present');
            }

            // Add the result to the almanac
            almanac.addRuntimeFact(params.resultFact, result);

            return result;

        } catch (error) {
            logger.error(`Error in missingRequiredFiles: ${error}`);
            throw error;
        }
    }
};
