import { logger } from '../utils/logger';
import { OperatorDefn } from '../typeDefs';

const openaiAnalysisHighSeverity: OperatorDefn = {
    'name': 'openaiAnalysisHighSeverity', 
    'fn': (openaiAnalysis: any, severityThreshold: any) => {
        severityThreshold = severityThreshold ? severityThreshold : 8;
        let result = false;
        
        // check the openai analysis response
        //logger.debug(openaiAnalysis);

        if (openaiAnalysis?.result?.length > 0) {
            if (openaiAnalysis.result.map((issue: any) => issue?.severity)
                .some((severity: number) => severity > severityThreshold)) {
                    logger.error('openai: high severity issues found');
                    result = true;
                }
        }
    
        return result;
        
    }
}

export { openaiAnalysisHighSeverity };