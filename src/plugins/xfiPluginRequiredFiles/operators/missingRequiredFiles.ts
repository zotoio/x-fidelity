import { FileData, OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { repoDir } from '../../../core/configManager';
import path from 'path';

export const missingRequiredFiles: OperatorDefn = {
    name: 'missingRequiredFiles',
    fn: (globalFileData: FileData[], requiredFiles: string[]) => {
        
        logger.info('Executing missingRequiredFiles check', { requiredFiles });
        try {
            
            if (!Array.isArray(globalFileData) || !Array.isArray(requiredFiles)) {
                logger.error('Invalid input: globalFileData and requiredFiles must be arrays');
                return true;
            }

            // Get all file paths from the fileData fact
            const repoFiles = new Set(globalFileData.map((file: FileData) => {
                logger.trace(`${file.filePath} added to missingRequiredFiles check set`);
                return file.filePath;
            }));
            
            // get the repo dir for the current repo as prefix
            const repoDirPrefix = repoDir();
            logger.info(`Repo dir prefix: ${repoDirPrefix }`);

            // Find which required files are missing
            const missingFiles = requiredFiles.filter(file => {
                let pathCheck = path.join(repoDirPrefix, file);
                if (!pathCheck.startsWith(repoDirPrefix)) {
                    throw new Error(`Potential malicious input detected: ${file}`);
                }
                let result = !repoFiles.has(pathCheck);
                if (result) {
                    logger.error(`Required file: ${ pathCheck } is missing`);
                } else {
                    logger.info(`Required file: ${ pathCheck } is present`);
                }
                return result;
            });

            if (missingFiles.length > 0) {
                logger.error(`Missing required files: ${ JSON.stringify(missingFiles) }`);
                globalFileData.forEach((file: FileData) => {
                    logger.trace(`File: ${file.fileName} at path: ${file.filePath}`);
                });
                return true;
            }

            logger.debug('All required files present');
            return false;
        } catch (error) {
            logger.error(`Error in missingRequiredFiles: ${error}`);
            return true;
        }
    }
};
