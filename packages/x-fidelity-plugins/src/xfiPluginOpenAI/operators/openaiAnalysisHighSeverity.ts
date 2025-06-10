import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const openaiAnalysisHighSeverity: OperatorDefn = {
    'name': 'openaiAnalysisHighSeverity',
    'description': 'Checks if OpenAI analysis indicates high severity issues',
    'fn': (factValue: any) => {
        try {
            logger.debug(`openaiAnalysisHighSeverity: processing ${JSON.stringify(factValue)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('openaiAnalysisHighSeverity: factValue is not an array');
                return false;
            }

            const result = factValue.some((issue: any) => issue.severity === 'high');
            logger.debug(`openaiAnalysisHighSeverity: result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`openaiAnalysisHighSeverity error: ${e}`);
            return false;
        }
    }
};

export { openaiAnalysisHighSeverity }; 