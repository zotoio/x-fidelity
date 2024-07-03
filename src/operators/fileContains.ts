import { logger } from '../utils/logger';
import { OperatorDefn } from '../typeDefs';

const fileContains: OperatorDefn = {
    'name': 'fileContains', 
    'fn': (fileContent: any, checkString: any) => {
        let result = false;

        const regex = new RegExp(checkString, 'g');
        if (regex.test(fileContent)) {
            result = true;
        }
        logger.debug(`fileContains '${checkString}': ${result}`);
        return result;
        
    }
}

export { fileContains };