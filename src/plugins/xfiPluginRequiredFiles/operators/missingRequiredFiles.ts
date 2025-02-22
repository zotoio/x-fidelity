import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

export const missingRequiredFiles: OperatorDefn = {
    name: 'missingRequiredFiles',
    fn: (fileData: any, requiredFiles: string[]) => {
        try {
            logger.debug('Executing missingRequiredFiles check', { requiredFiles });
            
            if (!Array.isArray(fileData) || !Array.isArray(requiredFiles)) {
                logger.error('Invalid input: fileData and requiredFiles must be arrays');
                return false;
            }

            // Get all file paths from the fileData fact
            const existingFiles = new Set(fileData.map((file: any) => file.fileName));
            
            // Find which required files are missing
            const missingFiles = requiredFiles.filter(file => !existingFiles.has(file));

            if (missingFiles.length > 0) {
                logger.error('Missing required files:', { missingFiles });
                return true;
            }

            logger.debug('All required files present');
            return false;
        } catch (error) {
            logger.error(`Error in missingRequiredFiles: ${error}`);
            return false;
        }
    }
};
