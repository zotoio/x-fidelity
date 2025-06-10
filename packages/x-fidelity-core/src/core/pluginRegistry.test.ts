import { pluginRegistry } from './pluginRegistry';
import { logger } from '../utils/logger';
import { XFiPlugin, FactDefn, OperatorDefn } from '@x-fidelity/types';

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  },
}));

describe('XFiPluginRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the registry by removing all plugins
    // This is a bit of a hack since we don't have a public API to do this
    const registry = pluginRegistry as any;
    registry.plugins = [];
  });

  describe('registerPlugin', () => {
    it('should register a valid plugin', () => {
      const mockPlugin: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        facts: [{ name: 'testFact', fn: jest.fn() }],
        operators: [{ name: 'testOperator', fn: jest.fn() }],
      };

      pluginRegistry.registerPlugin(mockPlugin);
      
      const facts = pluginRegistry.getPluginFacts();
      const operators = pluginRegistry.getPluginOperators();
      
      expect(facts).toHaveLength(1);
      expect(facts[0].name).toBe('testFact');
      expect(operators).toHaveLength(1);
      expect(operators[0].name).toBe('testOperator');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          plugin: expect.objectContaining({
            name: 'test-plugin',
            version: '1.0.0',
          }),
          operation: 'register-plugin'
        }),
        'Registering plugin: test-plugin'
      );
    });

    it('should throw an error when registering an invalid plugin', () => {
      const invalidPlugin = {
        // Missing name and version
        facts: [{ name: 'testFact', fn: jest.fn() }],
      } as unknown as XFiPlugin;

      expect(() => pluginRegistry.registerPlugin(invalidPlugin)).toThrow('Invalid plugin format - missing name or version');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should warn about invalid facts in a plugin', () => {
      const pluginWithInvalidFact: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        facts: [
          { name: 'validFact', fn: jest.fn() },
          { name: '', fn: jest.fn() }, // Invalid name
          { name: 'noFn' } as FactDefn, // Missing fn
        ],
        operators: [],
      };

      pluginRegistry.registerPlugin(pluginWithInvalidFact);
      
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('Invalid fact in plugin test-plugin: ');
      expect(logger.warn).toHaveBeenCalledWith('Invalid fact in plugin test-plugin: noFn');
    });

    it('should warn about invalid operators in a plugin', () => {
      const pluginWithInvalidOperator: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        facts: [],
        operators: [
          { name: 'validOperator', fn: jest.fn() },
          { name: '', fn: jest.fn() }, // Invalid name
          { name: 'noFn' } as OperatorDefn, // Missing fn
        ],
      };

      pluginRegistry.registerPlugin(pluginWithInvalidOperator);
      
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('Invalid operator in plugin test-plugin: ');
      expect(logger.warn).toHaveBeenCalledWith('Invalid operator in plugin test-plugin: noFn');
    });
  });

  describe('getPluginFacts', () => {
    it('should return facts from all registered plugins', () => {
      const plugin1: XFiPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        facts: [{ name: 'fact1', fn: jest.fn() }],
      };
      
      const plugin2: XFiPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        facts: [{ name: 'fact2', fn: jest.fn() }],
      };

      pluginRegistry.registerPlugin(plugin1);
      pluginRegistry.registerPlugin(plugin2);
      
      const facts = pluginRegistry.getPluginFacts();
      
      expect(facts).toHaveLength(2);
      expect(facts.map(f => f.name)).toEqual(['fact1', 'fact2']);
    });

    it('should return an empty array when no plugins are registered', () => {
      const facts = pluginRegistry.getPluginFacts();
      expect(facts).toEqual([]);
    });

    it('should handle plugins with no facts', () => {
      const plugin: XFiPlugin = {
        name: 'plugin',
        version: '1.0.0',
        operators: [{ name: 'operator', fn: jest.fn() }],
      };

      pluginRegistry.registerPlugin(plugin);
      
      const facts = pluginRegistry.getPluginFacts();
      expect(facts).toEqual([]);
    });
  });

  describe('getPluginOperators', () => {
    it('should return operators from all registered plugins', () => {
      const plugin1: XFiPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        operators: [{ name: 'operator1', fn: jest.fn() }],
      };
      
      const plugin2: XFiPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        operators: [{ name: 'operator2', fn: jest.fn() }],
      };

      pluginRegistry.registerPlugin(plugin1);
      pluginRegistry.registerPlugin(plugin2);
      
      const operators = pluginRegistry.getPluginOperators();
      
      expect(operators).toHaveLength(2);
      expect(operators.map(o => o.name)).toEqual(['operator1', 'operator2']);
    });

    it('should return an empty array when no plugins are registered', () => {
      const operators = pluginRegistry.getPluginOperators();
      expect(operators).toEqual([]);
    });

    it('should handle plugins with no operators', () => {
      const plugin: XFiPlugin = {
        name: 'plugin',
        version: '1.0.0',
        facts: [{ name: 'fact', fn: jest.fn() }],
      };

      pluginRegistry.registerPlugin(plugin);
      
      const operators = pluginRegistry.getPluginOperators();
      expect(operators).toEqual([]);
    });
  });

  describe('executePluginFunction', () => {
    it('should execute a plugin function and return the result', () => {
      const mockFn = jest.fn().mockReturnValue('result');
      const plugin: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        testFunction: mockFn as unknown as any,
      };

      pluginRegistry.registerPlugin(plugin);
      
      const result = pluginRegistry.executePluginFunction('test-plugin', 'testFunction', 'arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toEqual({ success: true, data: 'result' });
    });

    it('should throw an error when plugin is not found', () => {
      expect(() => {
        pluginRegistry.executePluginFunction('non-existent-plugin', 'someFunction');
      }).toThrow('Plugin non-existent-plugin not found');
    });

    it('should throw an error when function is not found in plugin', () => {
      const plugin: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      pluginRegistry.registerPlugin(plugin);
      
      expect(() => {
        pluginRegistry.executePluginFunction('test-plugin', 'nonExistentFunction');
      }).toThrow('Function nonExistentFunction not found in plugin test-plugin');
    });

    it('should handle errors in plugin functions using plugin error handler', () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      const mockErrorHandler = jest.fn().mockReturnValue({
        message: 'Handled error',
        level: 'warning',
        details: 'Error details'
      });
      
      const plugin: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        testFunction: mockFn as unknown as any,
        onError: mockErrorHandler,
      };

      pluginRegistry.registerPlugin(plugin);
      
      const result = pluginRegistry.executePluginFunction('test-plugin', 'testFunction');
      
      expect(mockFn).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Handled error',
          level: 'warning',
          details: 'Error details'
        },
        data: null
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle errors in plugin functions without error handler', () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      const plugin: XFiPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        testFunction: mockFn as unknown as any,
        // No error handler
      };

      pluginRegistry.registerPlugin(plugin);
      
      expect(() => {
        pluginRegistry.executePluginFunction('test-plugin', 'testFunction');
      }).toThrow();
      
      expect(mockFn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('singleton pattern', () => {
    it('should always return the same instance', () => {
      // Import the class directly to test its singleton behavior
      const { XFiPluginRegistry } = require('./pluginRegistry');
      
      const instance1 = XFiPluginRegistry.getInstance();
      const instance2 = XFiPluginRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
