// This fact file intentionally DOES NOT call almanac.addRuntimeFact
// This should trigger the factDoesNotAddResultToAlmanac-iterative rule

export interface ProblematicFactParams {
  threshold: number;
  resultFact: string;
}

export const problematicFact = async (params: ProblematicFactParams, almanac: any) => {
  // Simulate some fact processing
  const result = {
    value: Math.random() * 100,
    threshold: params.threshold,
    timestamp: new Date().toISOString(),
    status: 'processed'
  };

  // BUG: This fact does NOT call almanac.addRuntimeFact(params.resultFact, result)
  // This violates the requirement that facts should always add results to the almanac
  
  console.log('Fact processed but NOT added to almanac:', result);
  
  return result;
}; 