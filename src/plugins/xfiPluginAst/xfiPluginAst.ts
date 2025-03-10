import { XFiPlugin } from '../../types/typeDefs';
import { astFact } from './facts/astFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { astComplexity } from './operators/astComplexity';

const plugin: XFiPlugin = {
    name: 'xfiPluginAst',
    version: '1.0.0',
    facts: [astFact, functionComplexityFact],
    operators: [astComplexity],
    onError: (error: Error) => ({
        message: `AST analysis error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
