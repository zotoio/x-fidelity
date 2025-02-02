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

  describe('customFact', () => {
    it('should return expected data', async () => {
      const mockAlmanac = {
        factValue: jest.fn()
      };
      const result = await customFact.fn({}, mockAlmanac);
      expect(result).toEqual({ result: 'custom fact data' });
    });
  });

  describe('customOperator', () => {
    it('should evaluate equality correctly', () => {
      expect(customOperator.fn('test', 'test')).toBe(true);
      expect(customOperator.fn('test', 'different')).toBe(false);
      expect(customOperator.fn(123, 123)).toBe(true);
      expect(customOperator.fn(null, null)).toBe(true);
      expect(customOperator.fn(undefined, undefined)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(customOperator.fn('', '')).toBe(true);
      expect(customOperator.fn(0, '0')).toBe(false); // Strict equality
      expect(customOperator.fn([], [])).toBe(false); // Reference equality
      expect(customOperator.fn({}, {})).toBe(false); // Reference equality
    });
  });
});
