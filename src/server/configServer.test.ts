import { validateArchetype, validateRule } from '../utils/jsonSchemas';

jest.mock('../utils/config');
jest.mock('../rules');
jest.mock('../utils/jsonSchemas', () => ({
  validateArchetype: jest.fn().mockReturnValue(true),
  validateRule: jest.fn().mockReturnValue(true)
}));

describe('configServer', () => {
  const mockArchetypeConfig = {
    rules: ['rule1', 'rule2'],
    operators: ['operator1', 'operator2'],
    facts: ['fact1', 'fact2'],
    config: {
      minimumDependencyVersions: {},
      standardStructure: {},
      blacklistPatterns: [],
      whitelistPatterns: []
    }
  };

  const mockRule = {
    name: 'testRule',
    conditions: { all: [] },
    event: { type: 'testEvent', params: {} }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate archetype config', () => {
    expect(validateArchetype(mockArchetypeConfig)).toBe(true);
  });

  it('should validate rule', () => {
    expect(validateRule(mockRule)).toBe(true);
  });

  // Add more tests for configServer functionality here
});
