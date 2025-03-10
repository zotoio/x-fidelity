import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, threshold: number) => {
        try {
            if (!factValue || !factValue.maxComplexity) {
                return false;
            }

            return factValue.maxComplexity >= threshold;
        } catch (error) {
            logger.error(`Error in astComplexity operator: ${error}`);
            return false;
        }
    }
};
