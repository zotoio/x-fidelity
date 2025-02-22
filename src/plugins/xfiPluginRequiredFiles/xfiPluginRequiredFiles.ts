import { XFiPlugin } from '../../types/typeDefs';
import { missingRequiredFiles as missingRequiredFilesFact } from './facts/missingRequiredFiles';
import { missingRequiredFiles as missingRequiredFilesOperator } from './operators/missingRequiredFiles';

const plugin: XFiPlugin = {
    name: 'xfiPluginRequiredFiles',
    version: '1.0.0',
    facts: [missingRequiredFilesFact],
    operators: [missingRequiredFilesOperator],
    onError: (error: Error) => ({
        message: `Required files check error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
