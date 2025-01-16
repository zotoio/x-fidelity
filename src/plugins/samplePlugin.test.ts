import samplePlugin from './samplePlugin';
import { pluginRegistry } from '../core/pluginRegistry';

describe('samplePlugin', () => {
  beforeEach(() => {
    // Reset the plugin registry before each test
    jest.clearAllMocks();
  });

  it('should have correct plugin structure', () => {
    expect(samplePlugin).toHaveProperty('name', 'sample-plugin');
    expect(samplePlugin).toHaveProperty('version', '1.0.0');
    expect(samplePlugin.facts).toHaveLength(1);
    expect(samplePlugin.operators).toHaveLength(1);
  });

  it('should register plugin successfully', () => {
    pluginRegistry.registerPlugin(samplePlugin);
    const facts = pluginRegistry.getPluginFacts();
    const operators = pluginRegistry.getPluginOperators();

    expect(facts).toHaveLength(1);
    expect(facts[0].name).toBe('customFact');
    expect(operators).toHaveLength(1);
    expect(operators[0].name).toBe('customOperator');
  });

  it('should execute custom fact', async () => {
    const customFact = samplePlugin.facts![0];
    const result = await customFact.fn();
    expect(result).toEqual({ result: 'custom fact data' });
  });

  it('should execute custom operator', () => {
    const customOperator = samplePlugin.operators![0];
    expect(customOperator.fn('test', 'test')).toBe(true);
    expect(customOperator.fn('test', 'different')).toBe(false);
  });
});
