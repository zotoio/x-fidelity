import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const globalPatternCount: OperatorDefn = {
    'name': 'globalPatternCount',
    'fn': (analysisResult: any, threshold: number) => {
        try {
            logger.trace(`globalPatternCount: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.summary) {
                logger.debug('globalPatternCount: no analysis result available');
                return false;
            }
            
            // Check if we have new pattern totals
            if (analysisResult.summary.newPatternsTotal !== undefined) {
                const newTotal = analysisResult.summary.newPatternsTotal;
                logger.info(`globalPatternCount: new patterns total: ${newTotal}, threshold: ${threshold}`);
                
                // Compare count with threshold
                return newTotal >= threshold;
            }
            
            // Fallback to original behavior for backward compatibility
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
