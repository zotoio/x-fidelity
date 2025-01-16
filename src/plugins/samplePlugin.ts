import { XFiPlugin } from '../types/pluginTypes';

const samplePlugin: XFiPlugin = {
  name: 'sample-plugin',
  version: '1.0.0',
  facts: [
    {
      name: 'customFact',
      fn: async () => {
        return { result: 'custom fact data' };
      }
    }
  ],
  operators: [
    {
      name: 'customOperator',
      fn: (factValue: any, expectedValue: any) => {
        return factValue === expectedValue;
      }
    }
  ]
};

export default samplePlugin;
