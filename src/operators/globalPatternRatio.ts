import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const globalPatternRatio: OperatorDefn = {
    'name': 'globalPatternRatio',
    'fn': (analysisResult: any, threshold: number) => {
        try {
            logger.debug(`globalPatternRatio: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.summary) {
                logger.debug('globalPatternRatio: no analysis result available');
                return false;
            }
            
            // Extract the patterns from the analysis result
            const patterns = Object.keys(analysisResult.matchCounts);
            if (patterns.length < 2) {
                logger.debug('globalPatternRatio: need at least 2 patterns to calculate ratio');
                return false;
            }
            
            // Calculate ratio between first two patterns
            const pattern1Count = analysisResult.matchCounts[patterns[0]] || 0;
            const pattern2Count = analysisResult.matchCounts[patterns[1]] || 0;
            
            // Avoid division by zero
            if (pattern2Count === 0) {
                logger.debug('globalPatternRatio: denominator pattern has zero matches');
                return false;
            }
            
            const ratio = pattern1Count / pattern2Count;
            logger.info(`globalPatternRatio: ${pattern1Count}/${pattern2Count} = ${ratio}, threshold: ${threshold}`);
            
            // Compare ratio with threshold
            return ratio >= threshold;
        } catch (e) {
            logger.error(`globalPatternRatio error: ${e}`);
            return false;
        }
    }
};

export { globalPatternRatio };
