import { XFiPlugin, OperatorDefn, FactDefn } from 'x-fidelity';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const regexExtractOperator: OperatorDefn = {
  name: 'regexExtract',
  fn: (repoFileAnalysis: any, pattern: string) => {
    if (!repoFileAnalysis?.result || !Array.isArray(repoFileAnalysis.result)) {
      return false;
    }
    return repoFileAnalysis.result.length > 0;
  }
};

const externalCallFact: FactDefn = {
  name: 'externalApiCall',
  fn: async (params: any, almanac: any) => {
    try {
      const fileData = await almanac.factValue('fileData');
      const fileContent = fileData.fileContent;
      
      // Extract value using regex
      const regex = new RegExp(params.regex);
      const match = regex.exec(fileContent);
      const extractedValue = match ? match[1] : null;

      if (!extractedValue) {
        return { success: false, reason: 'No match found' };
      }

      // Make external API call
      const response = await axios({
        method: params.method || 'GET',
        url: params.url,
        data: params.includeValue ? { value: extractedValue } : undefined,
        headers: params.headers || {},
        timeout: params.timeout || 5000
      });

      return {
        success: true,
        extractedValue,
        apiResponse: response.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Sample rule that uses the new fact and operator
const sampleRules = [{
  name: "externalApiCheck-iterative",
  conditions: {
    all: [
      {
        fact: "repoFileAnalysis",
        params: {
          checkPattern: "version:\\s*['\"]([^'\"]+)['\"]",
          resultFact: "versionMatch"
        },
        operator: "regexExtract",
        value: true
      },
      {
        fact: "externalApiCall",
        params: {
          regex: "version:\\s*['\"]([^'\"]+)['\"]",
          url: "https://api.example.com/validate-version",
          method: "POST",
          includeValue: true,
          headers: {
            "Content-Type": "application/json"
          }
        },
        operator: "equal",
        value: { success: true }
      }
    ]
  },
  event: {
    type: "warning",
    params: {
      message: "External API validation failed",
      details: {
        fact: "externalApiCall"
      }
    }
  }
}];

const plugin: XFiPlugin = {
  name: 'xfi-example-plugin',
  version: '1.0.0',
  operators: [regexExtractOperator],
  facts: [externalCallFact],
  sampleRules
};

export default plugin;
