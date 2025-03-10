import { XFiPlugin } from '../../types/typeDefs';
import { astFact } from './facts/astFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCount } from './operators/functionCount';

const plugin: XFiPlugin = {
    name: 'xfiPluginAst',
    version: '1.0.0',
    facts: [astFact, functionComplexityFact, functionCountFact],
    operators: [astComplexity, functionCount],
    onError: (error: Error) => ({
        message: `AST analysis error: ${error.message}`,
        level: 'warning',
        details: error.stack
    })
};

export { plugin };
