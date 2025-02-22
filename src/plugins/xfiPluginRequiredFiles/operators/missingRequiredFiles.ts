import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

export const missingRequiredFiles: OperatorDefn = {
    name: 'missingRequiredFiles',
    fn: (fileData: any, requiredFiles: string[]) => {
        logger.info('Executing missingRequiredFiles check', { requiredFiles });

        if (!Array.isArray(fileData) || !Array.isArray(requiredFiles)) {
            logger.error('Invalid input: globalFileData and requiredFiles must be arrays');
            return true;
        }

        // Get all file paths from the fileData fact
        const repoFiles = new Set(fileData.map((file: any) => {
            logger.trace(`${file.filePath} added to missingRequiredFiles check set`);
            return file.filePath;
        }));

        // get the repo dir for the current repo as prefix
        const repoDirPrefix = 'TEST_DIR';
        logger.info(`Repo dir prefix: ${repoDirPrefix}`);

        // Find which required files are missing
        const missingFiles = requiredFiles.filter(file => {
            let pathCheck = `${repoDirPrefix}/${file}`;
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
            return true;
        }

        logger.debug('All required files present');
        return false;
    }
};
