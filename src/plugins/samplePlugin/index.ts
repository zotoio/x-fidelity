import { XFiPlugin } from '../types/typeDefs';
import { customOperator } from './operators/customOperator';
import { customFact } from './facts/customFact';
import path from 'path';
import fs from 'fs';

const samplePlugin: XFiPlugin = {
    name: 'sample-plugin',
    version: '1.0.0',
    facts: [customFact],
    operators: [customOperator],
    sampleRules: [
        JSON.parse(fs.readFileSync(path.join(__dirname, 'sampleRules/custom-rule.json'), 'utf8'))
    ]
};

export default samplePlugin;
