import { logger } from '../utils/logger';
import { OperatorDefn } from '../typeDefs';

let hasChecked = false;

const openaiAnalysisPasses: OperatorDefn = {
    'name': 'openaiAnalysisPasses', 
    'fn': (fileName: any, openAIResponse: any) => {
        if (fileName !== 'yarn.lock' || hasChecked) {
            return true;
        }
        hasChecked = true;
        let result;
        
        // check the openai analysis response
        //logger.debug(openAIResponse);

        if (openAIResponse) {
            result = true;
        } else {
            result = false;
        }
    
        return result;
        
    }
}

export { openaiAnalysisPasses };