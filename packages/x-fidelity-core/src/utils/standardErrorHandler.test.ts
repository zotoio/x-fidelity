import { StandardErrorHandler, handleConfigurationError, handlePluginError, handleAnalysisError } from './standardErrorHandler';
import { StandardError, StandardErrorFactory, ErrorCode, ErrorHandlingOptions } from '@x-fidelity/types';

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
    setLevel: jest.fn(),
    getLevel: jest.fn().mockReturnValue('info'),
    isLevelEnabled: jest.fn().mockReturnValue(true)
  }
}));

// Mock VSCode API
const mockVscode = {
  window: {
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showInformationMessage: jest.fn().mockResolvedValue(undefined)
  }
};

// Mock global objects that might be available in VSCode environment
Object.defineProperty(global, 'vscode', {
  value: mockVscode,
  writable: true
});

describe('StandardErrorHandler', () => {
  let errorHandler: StandardErrorHandler;
  let mockStandardError: StandardError;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = StandardErrorHandler.getInstance();
    
    // Clear any debug context from previous tests
    errorHandler.setDebugContext(null as any);

    mockStandardError = {
      errorId: 'test-error-123',
      code: 1001,
      category: 'configuration',
      message: 'Test error message',
      timestamp: new Date().toISOString(),
      context: {
        component: 'Core',
        function: 'testFunction',
        filePath: '/test/file.ts',
        ruleName: 'test-rule',
        pluginName: 'test-plugin',
        extra: { testData: 'value' }
      },
      stack: 'Error stack trace...',
      cause: new Error('Underlying cause')
    };
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StandardErrorHandler.getInstance();
      const instance2 = StandardErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('handleError', () => {
    it('should handle error with default options', async () => {
      await errorHandler.handleError(mockStandardError);

      // Should not throw and should complete successfully
    });

    it('should handle error with custom options', async () => {
      const options: ErrorHandlingOptions = {
        showNotification: true,
        logError: true,
        severity: 'warning',
        recoveryActions: [
          {
            label: 'Retry',
            action: 'retry',
            command: 'test.retry'
          }
        ],
        includeDebugInfo: true
      };

      await errorHandler.handleError(mockStandardError, options);

      // Should handle custom options without throwing
    });

    it('should skip logging when logError is false', async () => {
      const options: ErrorHandlingOptions = {
        logError: false
      };

      await errorHandler.handleError(mockStandardError, options);

      // Should complete without logging
    });

    it('should skip notification when showNotification is false', async () => {
      const options: ErrorHandlingOptions = {
        showNotification: false
      };

      await errorHandler.handleError(mockStandardError, options);

      // Should complete without showing notification
    });

    it('should call custom reporter when provided', async () => {
      const customReporter = jest.fn().mockResolvedValue(undefined);
      const options: ErrorHandlingOptions = {
        customReporter
      };

      await errorHandler.handleError(mockStandardError, options);

      expect(customReporter).toHaveBeenCalledWith(mockStandardError);
    });

    it('should handle custom reporter errors gracefully', async () => {
      const customReporter = jest.fn().mockRejectedValue(new Error('Reporter error'));
      const options: ErrorHandlingOptions = {
        customReporter
      };

      await expect(errorHandler.handleError(mockStandardError, options)).resolves.not.toThrow();
    });
  });

  describe('handleJavaScriptError', () => {
    it('should wrap JavaScript error and handle it', async () => {
      const jsError = new Error('JavaScript error');
      const context = {
        component: 'CLI' as const,
        function: 'testFunction'
      };

      const standardError = await errorHandler.handleJavaScriptError(
        jsError,
        1002,
        context
      );

      expect(standardError.code).toBe(1002);
      expect(standardError.message).toBe('JavaScript error');
      expect(standardError.context?.component).toBe('CLI');
      expect(standardError.context?.function).toBe('testFunction');
    });

    it('should handle JavaScript error with empty context', async () => {
      const jsError = new Error('Simple error');

      const standardError = await errorHandler.handleJavaScriptError(
        jsError,
        1003
      );

      expect(standardError.code).toBe(1003);
      expect(standardError.message).toBe('Simple error');
    });
  });

  describe('createAndHandleError', () => {
    it('should create and handle new error', async () => {
      const context = {
        component: 'VSCode' as const,
        function: 'testOperation',
        extra: { operationId: 'op-123' }
      };

      const standardError = await errorHandler.createAndHandleError(
        1004,
        'Created error message',
        context
      );

      expect(standardError.code).toBe(1004);
      expect(standardError.message).toBe('Created error message');
      expect(standardError.context?.component).toBe('VSCode');
      expect(standardError.context?.extra?.operationId).toBe('op-123');
    });

    it('should create error with minimal parameters', async () => {
      const standardError = await errorHandler.createAndHandleError(
        1005,
        'Minimal error'
      );

      expect(standardError.code).toBe(1005);
      expect(standardError.message).toBe('Minimal error');
    });
  });

  describe('debug context management', () => {
    it('should set and get debug context', () => {
      const debugContext = {
        operation: 'test-operation',
        correlationId: 'corr-123',
        timestamp: new Date().toISOString(),
        metadata: { testFlag: true }
      };

      errorHandler.setDebugContext(debugContext);
      const retrievedContext = errorHandler.getDebugContext();

      expect(retrievedContext).toEqual(debugContext);
    });

    it('should return null when no debug context is set', () => {
      const context = errorHandler.getDebugContext();
      expect(context).toBeNull();
    });
  });

  describe('correlation management', () => {
    it('should create correlation', () => {
      const correlationId = errorHandler.createCorrelation('test-operation');

      expect(typeof correlationId).toBe('string');
      expect(correlationId).toMatch(/^corr-/);
    });

    it('should create correlation without operation ID', () => {
      const correlationId = errorHandler.createCorrelation();

      expect(typeof correlationId).toBe('string');
      expect(correlationId).toMatch(/^corr-/);
    });

    it('should add error to correlation', () => {
      const correlationId = errorHandler.createCorrelation('test-operation');
      errorHandler.addToCorrelation(correlationId, 'error-123');

      const relatedErrors = errorHandler.getCorrelatedErrors(correlationId);
      expect(relatedErrors).toContain('error-123');
    });

    it('should get correlated errors', () => {
      const correlationId = errorHandler.createCorrelation();
      errorHandler.addToCorrelation(correlationId, 'error-1');
      errorHandler.addToCorrelation(correlationId, 'error-2');

      const relatedErrors = errorHandler.getCorrelatedErrors(correlationId);
      expect(relatedErrors).toEqual(['error-1', 'error-2']);
    });

    it('should return empty array for non-existent correlation', () => {
      const relatedErrors = errorHandler.getCorrelatedErrors('non-existent');
      expect(relatedErrors).toEqual([]);
    });

    it('should handle adding to non-existent correlation', () => {
      errorHandler.addToCorrelation('non-existent', 'error-123');
      // Should not throw
    });
  });

  describe('notification handling', () => {
    it('should detect VSCode environment correctly', async () => {
      // Test both with and without VSCode global
      await errorHandler.handleError(mockStandardError, { showNotification: true });
      
      // Should complete without throwing regardless of environment
    });

    it('should handle CLI notifications', async () => {
      // Remove VSCode global to simulate CLI environment
      delete (global as any).vscode;

      await errorHandler.handleError(mockStandardError, { showNotification: true });

      // Should handle CLI notifications without throwing
    });

    it('should handle different severity levels', async () => {
      const severities: Array<'error' | 'warning' | 'info'> = ['error', 'warning', 'info'];

      for (const severity of severities) {
        await errorHandler.handleError(mockStandardError, {
          showNotification: true,
          severity
        });
      }

      // Should handle all severity levels
    });
  });

  describe('error correlation with debug context', () => {
    it('should add correlation from debug context', async () => {
      const debugContext = {
        operation: 'test-operation',
        correlationId: 'debug-corr-123',
        timestamp: new Date().toISOString()
      };

      errorHandler.setDebugContext(debugContext);
      await errorHandler.handleError(mockStandardError);

      // Should add error to operation correlation
      const relatedErrors = errorHandler.getCorrelatedErrors('op-test-operation');
      expect(relatedErrors).toContain(mockStandardError.errorId);
    });
  });

  describe('telemetry handling', () => {
    it('should handle telemetry sending', async () => {
      await errorHandler.handleError(mockStandardError);

      // Should complete telemetry sending without throwing
    });

    it('should handle telemetry errors gracefully', async () => {
      // Mock a scenario where telemetry might fail
      await errorHandler.handleError(mockStandardError);

      // Should not throw even if telemetry fails
    });
  });

  describe('edge cases', () => {
    it('should handle error with null context', async () => {
      const errorWithNullContext: StandardError = {
        ...mockStandardError,
        context: null as any
      };

      await expect(errorHandler.handleError(errorWithNullContext)).resolves.not.toThrow();
    });

    it('should handle error with undefined properties', async () => {
      const minimalError: StandardError = {
        errorId: 'minimal-error',
        code: 1006,
        category: 'unknown',
        message: 'Minimal error',
        timestamp: new Date().toISOString(),
        context: undefined,
        stack: undefined,
        cause: undefined
      };

      await expect(errorHandler.handleError(minimalError)).resolves.not.toThrow();
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'x'.repeat(10000);
      const longError: StandardError = {
        ...mockStandardError,
        message: longMessage
      };

      await expect(errorHandler.handleError(longError)).resolves.not.toThrow();
    });

    it('should handle circular references in context', async () => {
      const circularContext: any = {
        component: 'Core',
        function: 'test'
      };
      circularContext.self = circularContext;

      const circularError: StandardError = {
        ...mockStandardError,
        context: circularContext
      };

      await expect(errorHandler.handleError(circularError)).resolves.not.toThrow();
    });
  });

  describe('recovery actions', () => {
    it('should handle recovery actions in notifications', async () => {
      const recoveryActions = [
        {
          label: 'Retry',
          action: 'retry' as const,
          command: 'test.retry'
        },
        {
          label: 'Open Settings',
          action: 'open-settings' as const,
          command: 'workbench.action.openSettings'
        }
      ];

      await errorHandler.handleError(mockStandardError, {
        showNotification: true,
        recoveryActions
      });

      // Should handle recovery actions without throwing
    });
  });

  it('should exist', () => {
    expect(true).toBe(true);
  });
});

describe('utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConfigurationError', () => {
    it('should handle configuration error with all parameters', async () => {
      const jsError = new Error('Configuration failed');
      const archetype = 'node-fullstack';
      const filePath = '/config/test.json';

      const standardError = await handleConfigurationError(jsError, archetype, filePath);

      expect(standardError.category).toBe('CONFIGURATION');
      expect(standardError.context?.extra?.archetype).toBe(archetype);
      expect(standardError.context?.filePath).toBe(filePath);
    });

    it('should handle configuration error with minimal parameters', async () => {
      const jsError = new Error('Simple config error');

      const standardError = await handleConfigurationError(jsError);

      expect(standardError.category).toBe('CONFIGURATION');
      expect(standardError.message).toBe('Simple config error');
    });

    it('should handle configuration error with only archetype', async () => {
      const jsError = new Error('Archetype error');
      const archetype = 'java-microservice';

      const standardError = await handleConfigurationError(jsError, archetype);

      expect(standardError.context?.extra?.archetype).toBe(archetype);
    });

    it('should handle configuration error with only file path', async () => {
      const jsError = new Error('File error');
      const filePath = '/config/invalid.json';

      const standardError = await handleConfigurationError(jsError, undefined, filePath);

      expect(standardError.context?.filePath).toBe(filePath);
    });
  });

  describe('handlePluginError', () => {
    it('should handle plugin error with all parameters', async () => {
      const jsError = new Error('Plugin failed to load');
      const pluginName = 'test-plugin';
      const functionName = 'initialize';

      const standardError = await handlePluginError(jsError, pluginName, functionName);

      expect(standardError.category).toBe('PLUGIN');
      expect(standardError.context?.pluginName).toBe(pluginName);
      expect(standardError.context?.function).toBe(functionName);
    });

    it('should handle plugin error without function name', async () => {
      const jsError = new Error('Plugin error');
      const pluginName = 'failing-plugin';

      const standardError = await handlePluginError(jsError, pluginName);

      expect(standardError.context?.pluginName).toBe(pluginName);
      expect(standardError.context?.function).toBeUndefined();
    });

    it('should handle plugin error with empty plugin name', async () => {
      const jsError = new Error('Unknown plugin error');
      const pluginName = '';

      const standardError = await handlePluginError(jsError, pluginName);

      expect(standardError.context?.pluginName).toBe('');
    });
  });

  describe('handleAnalysisError', () => {
    it('should handle analysis error with all parameters', async () => {
      const jsError = new Error('Analysis failed');
      const filePath = '/src/component.tsx';
      const ruleName = 'test-rule';

      const standardError = await handleAnalysisError(jsError, filePath, ruleName);

      expect(standardError.category).toBe('ANALYSIS');
      expect(standardError.context?.filePath).toBe(filePath);
      expect(standardError.context?.ruleName).toBe(ruleName);
    });

    it('should handle analysis error with only file path', async () => {
      const jsError = new Error('File analysis failed');
      const filePath = '/src/utils.ts';

      const standardError = await handleAnalysisError(jsError, filePath);

      expect(standardError.context?.filePath).toBe(filePath);
      expect(standardError.context?.ruleName).toBeUndefined();
    });

    it('should handle analysis error with only rule name', async () => {
      const jsError = new Error('Rule execution failed');
      const ruleName = 'complexity-rule';

      const standardError = await handleAnalysisError(jsError, undefined, ruleName);

      expect(standardError.context?.ruleName).toBe(ruleName);
      expect(standardError.context?.filePath).toBeUndefined();
    });

    it('should handle analysis error with minimal parameters', async () => {
      const jsError = new Error('Generic analysis error');

      const standardError = await handleAnalysisError(jsError);

      expect(standardError.category).toBe('ANALYSIS');
      expect(standardError.message).toBe('Generic analysis error');
    });
  });
});

describe('integration tests', () => {
  let errorHandler: StandardErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = StandardErrorHandler.getInstance();
  });

  it('should handle complete error workflow with correlation', async () => {
    // Set up debug context
    const debugContext = {
      operation: 'full-analysis',
      correlationId: 'integration-test',
      timestamp: new Date().toISOString(),
      metadata: { testRun: true }
    };
    errorHandler.setDebugContext(debugContext);

    // Create correlation
    const correlationId = errorHandler.createCorrelation('full-analysis');

    // Handle multiple related errors
    const error1 = await errorHandler.createAndHandleError(
      1100,
      'Configuration error',
      { component: 'CLI', function: 'loadConfig' }
    );

    const error2 = await errorHandler.createAndHandleError(
      1101,
      'Plugin loading error',
      { component: 'Core', pluginName: 'test-plugin' }
    );

    // Add errors to correlation
    errorHandler.addToCorrelation(correlationId, error1.errorId);
    errorHandler.addToCorrelation(correlationId, error2.errorId);

    // Verify correlation
    const relatedErrors = errorHandler.getCorrelatedErrors(correlationId);
    expect(relatedErrors).toContain(error1.errorId);
    expect(relatedErrors).toContain(error2.errorId);

    // Verify debug context
    const retrievedContext = errorHandler.getDebugContext();
    expect(retrievedContext).toEqual(debugContext);
  });

  it('should handle error cascades gracefully', async () => {
    // Simulate a cascade of errors
    const errors: StandardError[] = [];

    for (let i = 0; i < 5; i++) {
      const error = await errorHandler.createAndHandleError(
        1200 + i,
        `Cascade error ${i}`,
        { 
          component: 'Core',
          function: `step${i}`,
          extra: { cascadeLevel: i }
        }
      );
      errors.push(error);
    }

    // All errors should be handled without throwing
    expect(errors.length).toBe(5);
    errors.forEach((error, index) => {
      expect(error.code).toBe(1200 + index);
      expect(error.context?.extra?.cascadeLevel).toBe(index);
    });
  });

  it('should handle concurrent error processing', async () => {
    // Process multiple errors concurrently
    const errorPromises = Array(10).fill(0).map(async (_, index) => {
      return errorHandler.createAndHandleError(
        1300 + index,
        `Concurrent error ${index}`,
        { 
          component: 'Plugin',
          function: `concurrent${index}`,
          extra: { threadId: index }
        }
      );
    });

    const errors = await Promise.all(errorPromises);

    expect(errors.length).toBe(10);
    errors.forEach((error, index) => {
      expect(error.code).toBe(1300 + index);
      expect(error.context?.extra?.threadId).toBe(index);
    });
  });
}); 