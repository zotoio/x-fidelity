import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const globalPatternCount: OperatorDefn = {
    'name': 'globalPatternCount',
    'fn': (analysisResult: any, threshold: number) => {
        try {
            logger.debug(`globalPatternCount: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.summary) {
                logger.debug('globalPatternCount: no analysis result available');
                return false;
            }
            
            // Extract the patterns from the analysis result
            const patterns = Object.keys(analysisResult.matchCounts);
            if (patterns.length < 1) {
                logger.debug('globalPatternCount: no patterns found in analysis');
                return false;
            }
            
            // Get count for the first pattern
            const patternCount = analysisResult.matchCounts[patterns[0]] || 0;
            logger.info(`globalPatternCount: ${patternCount}, threshold: ${threshold}`);
            
            // Compare count with threshold
            return patternCount >= threshold;
        } catch (e) {
            logger.error(`globalPatternCount error: ${e}`);
            return false;
        }
    }
};

export { globalPatternCount };
