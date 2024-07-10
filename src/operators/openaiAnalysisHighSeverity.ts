import { logger } from '../utils/logger';
import { OperatorDefn } from '../typeDefs';

const openaiAnalysisHighSeverity: OperatorDefn = {
    'name': 'openaiAnalysisHighSeverity', 
    'fn': (openaiAnalysis: any, severityThreshold: any) => {
        try {
            severityThreshold = parseInt(severityThreshold) ? parseInt(severityThreshold) : 8;
            let result = false;
            
            // check the openai analysis response
            const analysis = JSON.parse(openaiAnalysis);
            console.log(analysis);

            if (analysis?.result?.length > 0) {
                console.log('asd)')
                if (analysis.result.map((issue: any) => {
                    console.log(issue?.severity)
                    return parseInt(issue?.severity)
                }).some((severity: number) => severity > severityThreshold)) {
                    logger.error('openai: high severity issues found');
                    result = true;
                }
            }
        
            return result;
        } catch (e) {
            console.log(e)
            logger.error(`openaiAnalysisHighSeverity: ${e}`);
            return false;
        }
    }
}

export { openaiAnalysisHighSeverity };