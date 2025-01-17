import { XFiPlugin, OperatorDefn, FactDefn } from 'x-fidelity';
import * as fs from 'fs';
import * as path from 'path';

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

// Load sample rules from the rules directory
const sampleRules = fs.readdirSync(path.join(__dirname, 'rules'))
  .filter(file => file.endsWith('-rule.json'))
  .map(file => JSON.parse(fs.readFileSync(path.join(__dirname, 'rules', file), 'utf8')));

const plugin: XFiPlugin = {
  name: 'xfi-basic-plugin',
  version: '1.0.0',
  operators: [customOperator],
  facts: [customFact],
  sampleRules
};

export default plugin;
