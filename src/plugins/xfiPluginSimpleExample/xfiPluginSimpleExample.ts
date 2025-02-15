import { XFiPlugin } from '../../types/typeDefs';
import { customOperator } from './operators/customOperator';
import { customFact } from './facts/customFact';

const plugin: XFiPlugin = {
    name: 'xfiPluginSimpleExample',
    version: '1.0.0',
    facts: [customFact],
    operators: [customOperator]
};

export { plugin };
