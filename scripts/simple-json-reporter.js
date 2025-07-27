const fs = require('fs');
const path = require('path');

class SimpleJSONReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const outputPath = this._options.outputPath || './jest-results.json';
    
    const jsonResults = {
      success: results.success,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numTodoTests: results.numTodoTests,
      startTime: results.startTime,
      endTime: results.endTime,
      testResults: results.testResults.map(testResult => ({
        name: testResult.testFilePath,
        status: testResult.status,
        startTime: testResult.perfStats.start,
        endTime: testResult.perfStats.end,
        numPassingTests: testResult.numPassingTests,
        numFailingTests: testResult.numFailingTests,
        numPendingTests: testResult.numPendingTests,
        numTodoTests: testResult.numTodoTests
      }))
    };

    fs.writeFileSync(path.resolve(outputPath), JSON.stringify(jsonResults, null, 2));
  }
}

module.exports = SimpleJSONReporter;
