import { RuleDefn } from '../typeDefs';
import { logger } from '../utils/logger';
import { calculateComplexity } from 'complexity-calculator'; // Assuming a library for complexity calculation

const codeComplexity: RuleDefn = {
    'name': 'codeComplexity',
    'fn': (fileContent: any, maxComplexity: any) => {
        let result = false;

        const complexity = calculateComplexity(fileContent);
        if (complexity <= maxComplexity) {
            result = true;
        }
        logger.debug(`codeComplexity: ${complexity} (max: ${maxComplexity}): ${result}`);
        return result;
    }
}

export { codeComplexity };
