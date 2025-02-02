import { XFiPlugin } from '../../types/typeDefs';
import { customOperator } from './operators/customOperator';
import { customFact } from './facts/customFact';

const samplePlugin: XFiPlugin = {
    name: 'sample-plugin',
    version: '1.0.0',
    facts: [customFact],
    operators: [customOperator]
};

export default samplePlugin;
