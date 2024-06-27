import { RuleDefn } from '../typeDefs';
import { logger } from '../utils/logger';
import { analyze } from 'complexity-report';

const codeComplexity: RuleDefn = {
    'name': 'codeComplexity',
    'fn': (fileContent: any, maxComplexity: any) => {
        let result = false;

        const report = analyze(fileContent);
        const complexity = report.aggregate.complexity.cyclomatic;
        if (complexity <= maxComplexity) {
            result = true;
        }
        logger.debug(`codeComplexity: ${complexity} (max: ${maxComplexity}): ${result}`);
        return result;
    }
}

export { codeComplexity };
