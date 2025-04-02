import { logger } from '../utils/logger';
import { OperatorDefn, RatioThreshold } from '../types/typeDefs';

const globalPatternRatio: OperatorDefn = {
    'name': 'globalPatternRatio',
    'fn': (analysisResult: any, threshold: number | RatioThreshold) => {
        try {
            logger.trace(`globalPatternRatio: processing ${JSON.stringify(analysisResult)}`);
            
            if (!analysisResult || !analysisResult.summary) {
                logger.debug('globalPatternRatio: no analysis result available');
                return false;
            }
            
            // Parse threshold and comparison type
            let thresholdValue: number;
            let comparisonType: 'gte' | 'lte' = 'gte'; // Default to greater than or equal
            
            if (typeof threshold === 'object' && threshold !== null) {
                thresholdValue = threshold.threshold;
                if (threshold.comparison) {
                    comparisonType = threshold.comparison;
                }
            } else {
                thresholdValue = threshold as number;
            }
            
            // Check if we have new and legacy pattern totals
            if (analysisResult.summary.newPatternsTotal !== undefined && 
                analysisResult.summary.legacyPatternsTotal !== undefined) {
                
                const newTotal = analysisResult.summary.newPatternsTotal;
                const legacyTotal = analysisResult.summary.legacyPatternsTotal;
                const total = newTotal + legacyTotal;
                
                // Avoid division by zero
                if (total === 0) {
                    logger.debug('globalPatternRatio: no pattern matches found');
                    return false;
                }
                
                // Calculate ratio of new patterns to total patterns
                const ratio = newTotal / total;
                logger.info(`globalPatternRatio: ${newTotal}/(${newTotal}+${legacyTotal}) = ${ratio}, threshold: ${thresholdValue}, comparison: ${comparisonType}`);
                
                // Compare ratio with threshold based on comparison type
                return comparisonType === 'gte' ? ratio >= thresholdValue : ratio <= thresholdValue;
            }
            
            // Use pattern data directly
            if (!analysisResult.patternData || analysisResult.patternData.length < 2) {
                logger.debug('globalPatternRatio: need at least 2 patterns to calculate ratio');
                return false;
            }
            
            // Calculate ratio between first two patterns
            const pattern1Count = analysisResult.patternData[0].count || 0;
            const pattern2Count = analysisResult.patternData[1].count || 0;
            
            // Avoid division by zero
            if (pattern2Count === 0) {
                logger.debug('globalPatternRatio: denominator pattern has zero matches');
                return false;
            }
            
            const ratio = pattern1Count / pattern2Count;
            logger.info(`globalPatternRatio: ${pattern1Count}/${pattern2Count} = ${ratio}, threshold: ${thresholdValue}, comparison: ${comparisonType}`);
            
            // Compare ratio with threshold based on comparison type
            return comparisonType === 'gte' ? ratio >= thresholdValue : ratio <= thresholdValue;
        } catch (e) {
            logger.error(`globalPatternRatio error: ${e}`);
            return false;
        }
    }
};

export { globalPatternRatio };
