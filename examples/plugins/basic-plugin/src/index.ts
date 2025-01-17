import { XFiPlugin } from 'x-fidelity/dist/types/pluginTypes';
import { OperatorDefn } from 'x-fidelity/dist/types/typeDefs';

const customOperator: OperatorDefn = {
  name: 'customContains',
  fn: (fileContent: string, searchString: string) => {
    return fileContent.includes(searchString);
  }
};

const customFact = {
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
  facts: [customFact]
};

export default basicPlugin;
