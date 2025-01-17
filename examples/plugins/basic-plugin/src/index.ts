import { XFiPlugin, OperatorDefn, FactDefn } from 'x-fidelity';

const customOperator: OperatorDefn = {
  name: 'customContains',
  fn: (fileContent: string, searchString: string) => {
    return fileContent.includes(searchString);
  }
};

const customFact: FactDefn = {
  name: 'customFileInfo',
  fn: async (params: any, almanac: any) => {
    const fileData = await almanac.factValue('fileData');
    return {
      fileName: fileData.fileName,
      size: fileData.fileContent.length,
      timestamp: new Date().toISOString()
    };
  }
};

const basicPlugin: XFiPlugin = {
  name: 'basic-plugin',
  version: '1.0.0',
  operators: [customOperator],
  facts: [customFact],
  sampleRules: [{
    name: 'custom-check',
    conditions: {
      all: [
        {
          fact: 'customFileInfo',
          operator: 'customContains',
          value: 'TODO'
        }
      ]
    },
    event: {
      type: 'warning',
      params: {
        message: 'Found TODO in file',
        details: {
          fact: 'customFileInfo'
        }
      }
    }
  }]
};

export default basicPlugin;
