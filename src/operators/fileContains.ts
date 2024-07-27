import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const fileContains: OperatorDefn = {
    'name': 'fileContains', 
    'fn': (fileContent: any, checkString: any) => {
        let result = false;

        const regex = new RegExp(checkString, 'g');
        const lines = fileContent.split('\n');
        let lineNumber = 0;
        for (const line of lines) {
            lineNumber++;
            if (regex.test(line)) {
                logger.debug(`fileContains '${checkString}' found in line ${lineNumber}: ${line}`);
                result = true;
                break;
            }
        }
        
        return result;
        
    } // oracle
}

export { fileContains };