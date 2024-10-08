import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const openaiAnalysisHighSeverity: OperatorDefn = {
    'name': 'openaiAnalysisHighSeverity', 
    'fn': (openaiAnalysis: any, severityThreshold: any) => {
        try {
            if (!openaiAnalysis || !openaiAnalysis.result) {
                logger.error('openaiAnalysisHighSeverity: TypeError: Cannot read properties of undefined (reading \'result\')');
                return false;
            }

            const threshold = parseInt(severityThreshold) || 8;
            
            if (Array.isArray(openaiAnalysis.result) && openaiAnalysis.result.length > 0) {
                const hasHighSeverityIssue = openaiAnalysis.result.some((issue: any) => {
                    const severity = parseInt(issue?.severity);
                    return !isNaN(severity) && severity >= threshold;
                });

                if (hasHighSeverityIssue) {
                    logger.error('openai: high severity issues found');
                    return true;
                }
            }
        
            return false;
        } catch (e) {
            // for now we don't fail the build if openai response parsing fails
            logger.debug(e);
            logger.error(`openaiAnalysisHighSeverity: ${e}`);
            return false;
        }
    }
}

export { openaiAnalysisHighSeverity };
