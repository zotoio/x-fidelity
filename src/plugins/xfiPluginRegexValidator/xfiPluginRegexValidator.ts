import { XFiPlugin } from '../../types/typeDefs';
import { validateRegexMatchOperator } from './operators/validateRegexMatchOperator';
import { regexExtractFact } from './facts/regexExtractFact';

const plugin: XFiPlugin = {
    name: 'xfiPluginRegexValidator',
    version: '1.0.0',
    facts: [regexExtractFact],
    operators: [validateRegexMatchOperator],
    onError: (error: Error) => ({
        message: `Regex validation error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
