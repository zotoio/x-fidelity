// Second facts file that violates factDoesNotAddResultToAlmanac-iterative rule
// This fact also fails to add results to the almanac

export interface AnotherProblematicFactParams {
  maxRetries: number;
  timeout: number;
  resultFact: string;
}

export const anotherProblematicFact = async (params: AnotherProblematicFactParams, almanac: any) => {
  console.log('Processing another problematic fact with params:', params);
  
  // Simulate some processing work
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const result = {
    processed: true,
    duration: Date.now() - startTime,
    maxRetries: params.maxRetries,
    timeout: params.timeout,
    timestamp: new Date().toISOString(),
    metadata: {
      processor: 'anotherProblematicFact',
      version: '1.0.0'
    }
  };

  // VIOLATION: This fact also does NOT call almanac.addRuntimeFact(params.resultFact, result)
  // This is the second file that violates the factDoesNotAddResultToAlmanac rule
  
  console.log('Another fact processed successfully:', result);
  console.log('Result fact name was:', params.resultFact);
  console.log('But we are NOT adding it to the almanac!');
  
  // Return the result but don't add to almanac (this is the bug)
  return result;
};

// Additional fact that also violates the rule
export const yetAnotherBadFact = async (params: any, almanac: any) => {
  const data = {
    id: Math.random().toString(36),
    status: 'complete',
    resultFact: params.resultFact
  };
  
  // Another violation - not calling almanac.addRuntimeFact
  console.log('Third problematic fact completed but not added to almanac');
  
  return data;
}; 