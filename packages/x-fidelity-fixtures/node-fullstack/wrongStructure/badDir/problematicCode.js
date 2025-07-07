// This file is in a non-standard directory structure
// Should trigger nonStandardDirectoryStructure-global rule
// The standard structure expects app/frontend and app/server, not wrongStructure/badDir

const problematicCode = {
  message: 'This code is in the wrong directory structure',
  location: 'wrongStructure/badDir',
  shouldBe: 'app/frontend or app/server',
  
  processData: (input) => {
    console.log('Processing data in wrong location:', input);
    return { processed: true, data: input };
  },
  
  // More code that violates directory structure expectations
  configurations: {
    environment: 'development',
    features: ['feature1', 'feature2'],
    settings: {
      debug: true,
      verbose: false
    }
  }
};

module.exports = problematicCode; 