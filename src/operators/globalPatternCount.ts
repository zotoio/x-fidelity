import { logger } from '../utils/logger';
import { OperatorDefn, RatioThreshold } from '../types/typeDefs';

const globalPatternCount: OperatorDefn = {
    'name': 'globalPatternCount',
    'fn': (analysisResult: any, threshold: number | RatioThreshold) => {
        try {
            logger.trace(`globalPatternCount: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.summary) {
                logger.debug('globalPatternCount: no analysis result available');
                return false;
            }
            
            // Parse threshold and comparison type
            let thresholdValue: number;
            let comparisonType: 'gte' | 'lte' = 'lte'; // Default to greater than or equal
            
            if (typeof threshold === 'object' && threshold !== null) {
                thresholdValue = threshold.threshold;
                if (threshold.comparison) {
                    comparisonType = threshold.comparison;
                }
            } else {
                thresholdValue = threshold as number;
            }
            
            // Check if we have new pattern totals
            if (analysisResult.summary.newPatternsTotal !== undefined) {
                const newTotal = analysisResult.summary.newPatternsTotal;
                logger.info(`globalPatternCount: new patterns total: ${newTotal}, threshold: ${thresholdValue}, comparison: ${comparisonType}`);
                
                // Compare count with threshold based on comparison type
                return comparisonType === 'gte' ? newTotal >= thresholdValue : newTotal <= thresholdValue;
            }
            
            // Use pattern data directly
            if (!analysisResult.patternData || analysisResult.patternData.length < 1) {
                logger.debug('globalPatternCount: no patterns found in analysis');
                return false;
            }
            
            // Get count for the first pattern
            const patternCount = analysisResult.patternData[0].count || 0;
            logger.info(`globalPatternCount: ${patternCount}, threshold: ${thresholdValue}, comparison: ${comparisonType}`);
            
            // Compare count with threshold based on comparison type
            return comparisonType === 'gte' ? patternCount >= thresholdValue : patternCount <= thresholdValue;
        } catch (e) {
            logger.error(`globalPatternCount error: ${e}`);
            return false;
        }
    }
};

export { globalPatternCount };
