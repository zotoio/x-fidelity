import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

const invalidRemoteValidation: OperatorDefn = {
    'name': 'invalidRemoteValidation', 
    'fn': (factValue: any, requiredResultStructure: any) => {
        let result = false;
        
        logger.debug(`invalidRemoteValidation: processing ${JSON.stringify(factValue)}`);

        // if the factValue is an object with a result array of length 0 all remote validations have passed 
        if (factValue?.result?.length === 0) {
            result = true;
        }

        // todo
        
        return result;
    }
}

export { invalidRemoteValidation };