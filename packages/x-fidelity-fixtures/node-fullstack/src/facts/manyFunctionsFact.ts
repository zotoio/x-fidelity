// This facts file intentionally contains more than 20 functions
// This should trigger the functionCount-iterative rule

export interface ManyFunctionsParams {
  resultFact: string;
}

export const function1 = () => ({ id: 1, name: 'function1' });
export const function2 = () => ({ id: 2, name: 'function2' });
export const function3 = () => ({ id: 3, name: 'function3' });
export const function4 = () => ({ id: 4, name: 'function4' });
export const function5 = () => ({ id: 5, name: 'function5' });
export const function6 = () => ({ id: 6, name: 'function6' });
export const function7 = () => ({ id: 7, name: 'function7' });
export const function8 = () => ({ id: 8, name: 'function8' });
export const function9 = () => ({ id: 9, name: 'function9' });
export const function10 = () => ({ id: 10, name: 'function10' });
export const function11 = () => ({ id: 11, name: 'function11' });
export const function12 = () => ({ id: 12, name: 'function12' });
export const function13 = () => ({ id: 13, name: 'function13' });
export const function14 = () => ({ id: 14, name: 'function14' });
export const function15 = () => ({ id: 15, name: 'function15' });
export const function16 = () => ({ id: 16, name: 'function16' });
export const function17 = () => ({ id: 17, name: 'function17' });
export const function18 = () => ({ id: 18, name: 'function18' });
export const function19 = () => ({ id: 19, name: 'function19' });
export const function20 = () => ({ id: 20, name: 'function20' });
export const function21 = () => ({ id: 21, name: 'function21' });
export const function22 = () => ({ id: 22, name: 'function22' });
export const function23 = () => ({ id: 23, name: 'function23' });
export const function24 = () => ({ id: 24, name: 'function24' });
export const function25 = () => ({ id: 25, name: 'function25' });

export const manyFunctionsFact = async (params: ManyFunctionsParams, almanac: any) => {
  const functions = [
    function1(), function2(), function3(), function4(), function5(),
    function6(), function7(), function8(), function9(), function10(),
    function11(), function12(), function13(), function14(), function15(),
    function16(), function17(), function18(), function19(), function20(),
    function21(), function22(), function23(), function24(), function25()
  ];

  almanac.addRuntimeFact(params.resultFact, {
    functionCount: functions.length,
    functions: functions
  });

  return functions;
}; 