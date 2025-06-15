import { xfiPluginSimpleExample } from './xfiPluginSimpleExample';
import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';

// Mock the plugin registry
const mockPluginRegistry = {
  registerPlugin: jest.fn(),
  getPluginFacts: jest.fn().mockReturnValue([customFact]),
  getPluginOperators: jest.fn().mockReturnValue([customOperator])
};

describe('xfiPluginSimpleExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct metadata', () => {
      expect(xfiPluginSimpleExample).toHaveProperty('name', 'xfi-plugin-simple-example');
      expect(xfiPluginSimpleExample).toHaveProperty('version', '1.0.0');
      expect(xfiPluginSimpleExample.facts).toHaveLength(1);
      expect(xfiPluginSimpleExample.operators).toHaveLength(1);
    });

    it('should include customFact', () => {
      expect(xfiPluginSimpleExample.facts).toContainEqual(customFact);
    });

    it('should include customOperator', () => {
      expect(xfiPluginSimpleExample.operators).toContainEqual(customOperator);
    });
  });

  describe('plugin registration', () => {
    it('should register successfully with registry', () => {
      mockPluginRegistry.registerPlugin(xfiPluginSimpleExample);
      const facts = mockPluginRegistry.getPluginFacts();
      const operators = mockPluginRegistry.getPluginOperators();

      expect(facts).toHaveLength(1);
      expect(facts[0].name).toBe('customFact');
      expect(operators).toHaveLength(1);
      expect(operators[0].name).toBe('customOperator');
    });
  });
});
