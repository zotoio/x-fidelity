// Second facts file to trigger functionCount-iterative rule
// Contains even more functions than manyFunctionsFact.ts (25+ functions)

export interface MassiveFunctionParams {
  resultFact: string;
  mode: string;
}

// Utility functions (30+ functions to exceed the 20 function threshold)
export const utilFunction1 = () => ({ name: 'util1', type: 'utility' });
export const utilFunction2 = () => ({ name: 'util2', type: 'utility' });
export const utilFunction3 = () => ({ name: 'util3', type: 'utility' });
export const utilFunction4 = () => ({ name: 'util4', type: 'utility' });
export const utilFunction5 = () => ({ name: 'util5', type: 'utility' });
export const utilFunction6 = () => ({ name: 'util6', type: 'utility' });
export const utilFunction7 = () => ({ name: 'util7', type: 'utility' });
export const utilFunction8 = () => ({ name: 'util8', type: 'utility' });
export const utilFunction9 = () => ({ name: 'util9', type: 'utility' });
export const utilFunction10 = () => ({ name: 'util10', type: 'utility' });

// Processor functions
export const processFunction1 = (data: any) => ({ ...data, processed: 1 });
export const processFunction2 = (data: any) => ({ ...data, processed: 2 });
export const processFunction3 = (data: any) => ({ ...data, processed: 3 });
export const processFunction4 = (data: any) => ({ ...data, processed: 4 });
export const processFunction5 = (data: any) => ({ ...data, processed: 5 });
export const processFunction6 = (data: any) => ({ ...data, processed: 6 });
export const processFunction7 = (data: any) => ({ ...data, processed: 7 });
export const processFunction8 = (data: any) => ({ ...data, processed: 8 });
export const processFunction9 = (data: any) => ({ ...data, processed: 9 });
export const processFunction10 = (data: any) => ({ ...data, processed: 10 });

// Validator functions
export const validateFunction1 = (input: any) => input !== null;
export const validateFunction2 = (input: any) => input !== undefined;
export const validateFunction3 = (input: any) => typeof input === 'string';
export const validateFunction4 = (input: any) => typeof input === 'number';
export const validateFunction5 = (input: any) => Array.isArray(input);
export const validateFunction6 = (input: any) => input.length > 0;
export const validateFunction7 = (input: any) => input.hasOwnProperty('id');
export const validateFunction8 = (input: any) => input.id !== '';
export const validateFunction9 = (input: any) => input.name && input.name.length > 0;
export const validateFunction10 = (input: any) => input.type && ['A', 'B', 'C'].includes(input.type);

// Transform functions
export const transformFunction1 = (data: any) => data.toString().toUpperCase();
export const transformFunction2 = (data: any) => data.toString().toLowerCase();
export const transformFunction3 = (data: any) => JSON.stringify(data);
export const transformFunction4 = (data: any) => JSON.parse(data);
export const transformFunction5 = (data: any) => data.split(',');

// Main fact function (this is the 36th function in the file, well over the 20 threshold)
export const massiveFunctionCollection = async (params: MassiveFunctionParams, almanac: any) => {
  // Properly add result to almanac (unlike the problematic facts)
  const result = {
    totalFunctions: 35, // All the functions above
    utilityCount: 10,
    processorCount: 10,
    validatorCount: 10,
    transformCount: 5,
    mode: params.mode,
    timestamp: new Date().toISOString()
  };

  // This fact DOES add the result to almanac (good practice)
  almanac.addRuntimeFact(params.resultFact, result);

  return result;
}; 