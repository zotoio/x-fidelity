import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const openaiAnalysisHighSeverity: OperatorDefn = {
    'name': 'openaiAnalysisHighSeverity', 
    'fn': (openaiAnalysis: any, severityThreshold: any) => {
        try {
            if (!openaiAnalysis) {
                logger.error('openaiAnalysisHighSeverity: openaiAnalysis is undefined');
                return false;
            }

            severityThreshold = parseInt(severityThreshold) ? parseInt(severityThreshold) : 8;
            let result = false;
            
            if (openaiAnalysis.result?.length > 0) {
                if (openaiAnalysis.result.map((issue: any) => {
                    return parseInt(issue?.severity)
                }).some((severity: number) => severity >= severityThreshold)) {
                    logger.error('openai: high severity issues found');
                    result = true;
                }
            }
        
            return result;
        } catch (e) {
            // for now we don't fail the build if openai response parsing fails
            logger.debug(e)
            logger.error(`openaiAnalysisHighSeverity: ${e}`);
            return false;
        }
    }
}

export { openaiAnalysisHighSeverity };
