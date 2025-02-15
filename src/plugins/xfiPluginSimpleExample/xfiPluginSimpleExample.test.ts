import { plugin } from './xfiPluginSimpleExample';
import { pluginRegistry } from '../../core/pluginRegistry';
import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';

describe('samplePlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct metadata', () => {
      expect(plugin).toHaveProperty('name', 'xfiPluginSimpleExample');
      expect(plugin).toHaveProperty('version', '1.0.0');
      expect(plugin.facts).toHaveLength(1);
      expect(plugin.operators).toHaveLength(1);
    });

    it('should include customFact', () => {
      expect(plugin.facts).toContainEqual(customFact);
    });

    it('should include customOperator', () => {
      expect(plugin.operators).toContainEqual(customOperator);
    });
  });

  describe('plugin registration', () => {
    it('should register successfully with registry', () => {
      pluginRegistry.registerPlugin(plugin);
      const facts = pluginRegistry.getPluginFacts();
      const operators = pluginRegistry.getPluginOperators();

      expect(facts).toHaveLength(1);
      expect(facts[0].name).toBe('customFact');
      expect(operators).toHaveLength(1);
      expect(operators[0].name).toBe('customOperator');
    });
  });
});
