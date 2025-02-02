import { XFiPlugin, PluginError } from '../../types/typeDefs';
import { errorDemoOperator } from './operators/errorDemoOperator';
import { errorDemoFact } from './facts/errorDemoFact';

const errorDemoPlugin: XFiPlugin = {
    name: 'error-demo-plugin',
    version: '1.0.0',
    facts: [errorDemoFact],
    operators: [errorDemoOperator],
    onError: (error: Error): PluginError => ({
        message: `Plugin error handler caught: ${error.message}`,
        level: 'error',
        details: {
            source: 'plugin',
            originalError: error,
            stack: error.stack
        }
    })
};

export default errorDemoPlugin;
