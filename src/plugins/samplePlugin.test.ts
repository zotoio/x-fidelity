import samplePlugin from './samplePlugin/index';
import { pluginRegistry } from '../core/pluginRegistry';
import { customFact } from './samplePlugin/facts/customFact';
import { customOperator } from './samplePlugin/operators/customOperator';

describe('samplePlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct metadata', () => {
      expect(samplePlugin).toHaveProperty('name', 'sample-plugin');
      expect(samplePlugin).toHaveProperty('version', '1.0.0');
      expect(samplePlugin.facts).toHaveLength(1);
      expect(samplePlugin.operators).toHaveLength(1);
    });

    it('should include customFact', () => {
      expect(samplePlugin.facts).toContainEqual(customFact);
    });

    it('should include customOperator', () => {
      expect(samplePlugin.operators).toContainEqual(customOperator);
    });
  });

  describe('plugin registration', () => {
    it('should register successfully with registry', () => {
      pluginRegistry.registerPlugin(samplePlugin);
      const facts = pluginRegistry.getPluginFacts();
      const operators = pluginRegistry.getPluginOperators();

      expect(facts).toHaveLength(1);
      expect(facts[0].name).toBe('customFact');
      expect(operators).toHaveLength(1);
      expect(operators[0].name).toBe('customOperator');
    });
  });
});
