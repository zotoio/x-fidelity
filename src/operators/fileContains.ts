import { logger } from '../utils/logger';
import { RuleDefn } from '../typeDefs';

const fileContains: RuleDefn = {
    'name': 'fileContains', 
    'fn': (fileContent: any, checkString: any) => {
        let result = false;

        logger.debug(`fileContains '${checkString}': working..`);
        
        const regex = new RegExp(checkString, 'g');
        if (regex.test(fileContent)) {
            result = true;
        }
        logger.debug(`fileContains '${checkString}': ${result}`);
        return result;
        
    }
}

export { fileContains };