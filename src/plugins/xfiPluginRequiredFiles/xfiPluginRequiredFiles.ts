import { XFiPlugin } from '../../types/typeDefs';
import { missingRequiredFiles } from './facts/missingRequiredFiles';

const plugin: XFiPlugin = {
    name: 'xfiPluginRequiredFiles',
    version: '1.0.0',
    facts: [missingRequiredFiles],
    onError: (error: Error) => ({
        message: `Required files check error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
