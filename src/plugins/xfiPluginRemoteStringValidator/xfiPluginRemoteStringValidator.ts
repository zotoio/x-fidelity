import { XFiPlugin } from '../../types/typeDefs';
import { invalidRemoteValidation } from './operators/invalidRemoteValidation';
import { remoteSubstringValidation } from './facts/remoteSubstringValidation';

const plugin: XFiPlugin = {
    name: 'xfiPluginRemoteStringValidator',
    version: '1.0.0',
    facts: [remoteSubstringValidation],
    operators: [invalidRemoteValidation],
    onError: (error: Error) => ({
        message: `Remote validation error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
