import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const hasFilesWithMultiplePatterns: OperatorDefn = {
    'name': 'hasFilesWithMultiplePatterns',
    'fn': (analysisResult: any, threshold: number = 2) => {
        try {
            logger.trace(`hasFilesWithMultiplePatterns: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.fileResultsArray) {
                logger.debug('hasFilesWithMultiplePatterns: no file-centric analysis result available');
                return false;
            }
            
            // Find files that match multiple patterns
            const filesWithMultiplePatterns = analysisResult.fileResultsArray.filter(
                (file: any) => Object.keys(file.patternMatches).length >= threshold
            );
            
            logger.info(`hasFilesWithMultiplePatterns: found ${filesWithMultiplePatterns.length} files with ${threshold} or more patterns`);
            
            return filesWithMultiplePatterns.length > 0;
        } catch (e) {
            logger.error(`hasFilesWithMultiplePatterns error: ${e}`);
            return false;
        }
    }
};

export { hasFilesWithMultiplePatterns };
