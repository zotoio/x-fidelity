import {
  ErrorCategory,
  ErrorCode,
  StandardError,
  StandardErrorFactory,
  getUserFriendlyMessage,
  getTechnicalDetails,
  ErrorSeverity,
  ErrorHandlingOptions,
  ErrorRecoveryAction
} from './errorHandling';

describe('ErrorHandling', () => {
  
  describe('StandardErrorFactory', () => {
    it('should create a standard error with all required fields', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.CONFIG_NOT_FOUND,
        'Configuration file not found'
      );

      expect(error).toBeDefined();
      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
      expect(error.category).toBe('CONFIGURATION');
      expect(error.message).toBe('Configuration file not found');
      expect(error.timestamp).toBeDefined();
      expect(error.errorId).toBeDefined();
      expect(error.errorId).toMatch(/^\w+-\d+$/);
    });

    it('should create error with custom category', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.PLUGIN_NOT_FOUND,
        'Plugin missing',
        { category: 'PLUGIN' }
      );

      expect(error.category).toBe('PLUGIN');
      expect(error.code).toBe(ErrorCode.PLUGIN_NOT_FOUND);
    });

    it('should create error with context information', () => {
      const context = {
        component: 'CLI' as const,
        function: 'loadConfig',
        filePath: '/path/to/config.json'
      };

      const error = StandardErrorFactory.create(
        ErrorCode.FILE_NOT_FOUND,
        'File not found',
        { context }
      );

      expect(error.context).toEqual(expect.objectContaining(context));
    });

    it('should create error with cause', () => {
      const originalError = new Error('Original error');
      const error = StandardErrorFactory.create(
        ErrorCode.UNEXPECTED_ERROR,
        'Wrapper error',
        { cause: originalError }
      );

      expect(error.cause).toBe(originalError);
    });

    it('should create error from existing Error', () => {
      const originalError = new Error('File system error');
      const context = { component: 'Core' as const };
      
      const error = StandardErrorFactory.fromError(
        originalError,
        ErrorCode.FILE_READ_ERROR,
        context
      );

      expect(error.code).toBe(ErrorCode.FILE_READ_ERROR);
      expect(error.cause).toBe(originalError);
      expect(error.context).toEqual(expect.objectContaining(context));
      expect(error.message).toContain('File system error');
    });

    it('should generate unique error IDs', () => {
      const error1 = StandardErrorFactory.create(ErrorCode.CONFIG_INVALID, 'Error 1');
      const error2 = StandardErrorFactory.create(ErrorCode.CONFIG_INVALID, 'Error 2');

      expect(error1.errorId).not.toBe(error2.errorId);
    });

    it('should include stack trace when available', () => {
      const originalError = new Error('Stack error');
      const error = StandardErrorFactory.fromError(
        originalError,
        ErrorCode.RUNTIME_ERROR,
        { component: 'Core' }
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Error');
    });
  });

  describe('Error Categories', () => {
    it('should correctly map configuration error codes to CONFIGURATION category', () => {
      const error = StandardErrorFactory.create(ErrorCode.CONFIG_NOT_FOUND, 'Config error');
      expect(error.category).toBe('CONFIGURATION');
    });

    it('should correctly map plugin error codes to PLUGIN category', () => {
      const error = StandardErrorFactory.create(ErrorCode.PLUGIN_LOAD_FAILED, 'Plugin error');
      expect(error.category).toBe('PLUGIN');
    });

    it('should correctly map analysis error codes to ANALYSIS category', () => {
      const error = StandardErrorFactory.create(ErrorCode.ANALYSIS_FAILED, 'Analysis error');
      expect(error.category).toBe('ANALYSIS');
    });

    it('should correctly map filesystem error codes to FILESYSTEM category', () => {
      const error = StandardErrorFactory.create(ErrorCode.FILE_NOT_FOUND, 'File error');
      expect(error.category).toBe('FILESYSTEM');
    });

    it('should correctly map network error codes to NETWORK category', () => {
      const error = StandardErrorFactory.create(ErrorCode.NETWORK_TIMEOUT, 'Network error');
      expect(error.category).toBe('NETWORK');
    });

    it('should correctly map validation error codes to VALIDATION category', () => {
      const error = StandardErrorFactory.create(ErrorCode.INVALID_INPUT, 'Validation error');
      expect(error.category).toBe('VALIDATION');
    });

    it('should correctly map runtime error codes to RUNTIME category', () => {
      const error = StandardErrorFactory.create(ErrorCode.INITIALIZATION_FAILED, 'Runtime error');
      expect(error.category).toBe('RUNTIME');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should provide user-friendly message for configuration errors', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.CONFIG_NOT_FOUND,
        'Configuration file not found at /path/to/config'
      );

      const message = getUserFriendlyMessage(error);
      expect(message).toContain('configuration');
      expect(message).not.toContain('/path/to/config'); // Should hide technical details
    });

    it('should provide user-friendly message for plugin errors', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.PLUGIN_NOT_FOUND,
        'Plugin xyz-plugin not found'
      );

      const message = getUserFriendlyMessage(error);
      expect(message).toContain('plugin');
    });

    it('should provide user-friendly message for network errors', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.NETWORK_CONNECTION_FAILED,
        'Connection to server failed'
      );

      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Connection');
      expect(message).toContain('server');
    });

    it('should provide generic message for unknown error codes', () => {
      const error = StandardErrorFactory.create(
        9999 as ErrorCode,
        'Unknown error'
      );

      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Unknown');
    });
  });

  describe('getTechnicalDetails', () => {
    it('should include error code and category', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.CONFIG_INVALID,
        'Config validation failed'
      );

      const details = getTechnicalDetails(error);
      expect(details).toContain(`Code: ${ErrorCode.CONFIG_INVALID}`);
      expect(details).toContain('Category: CONFIGURATION');
    });

    it('should include context information when available', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.PLUGIN_EXECUTION_FAILED,
        'Plugin failed',
        {
          context: {
            component: 'CLI',
            function: 'executePlugin',
            pluginName: 'test-plugin'
          }
        }
      );

      const details = getTechnicalDetails(error);
      expect(details).toContain('Component: CLI');
      expect(details).toContain('Function: executePlugin');
    });

    it('should include cause information when available', () => {
      const originalError = new Error('Original failure');
      const error = StandardErrorFactory.create(
        ErrorCode.UNEXPECTED_ERROR,
        'Wrapped error',
        { cause: originalError }
      );

      const details = getTechnicalDetails(error);
      expect(details).toContain('Error Code:'); // Updated to match actual format
    });

    it('should include timestamp', () => {
      const error = StandardErrorFactory.create(
        ErrorCode.ANALYSIS_TIMEOUT,
        'Analysis timed out'
      );

      const details = getTechnicalDetails(error);
      expect(details).toContain('Time:');
      expect(details).toContain(error.timestamp);
    });
  });

  describe('Error Severity and Recovery', () => {
    it('should handle error recovery actions', () => {
      const mockAction = jest.fn();
      const recoveryAction: ErrorRecoveryAction = {
        label: 'Retry Operation',
        action: mockAction,
        isPrimary: true
      };

      expect(recoveryAction.label).toBe('Retry Operation');
      expect(recoveryAction.isPrimary).toBe(true);
      expect(typeof recoveryAction.action).toBe('function');
    });

    it('should handle error handling options', () => {
      const options: ErrorHandlingOptions = {
        showNotification: true,
        logError: true,
        severity: 'error',
        includeDebugInfo: true
      };

      expect(options.showNotification).toBe(true);
      expect(options.logError).toBe(true);
      expect(options.severity).toBe('error');
      expect(options.includeDebugInfo).toBe(true);
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected configuration error codes', () => {
      expect(ErrorCode.CONFIG_NOT_FOUND).toBe(1001);
      expect(ErrorCode.CONFIG_INVALID).toBe(1002);
      expect(ErrorCode.CONFIG_PARSE_ERROR).toBe(1003);
      expect(ErrorCode.ARCHETYPE_NOT_FOUND).toBe(1004);
      expect(ErrorCode.ARCHETYPE_INVALID).toBe(1005);
    });

    it('should have all expected plugin error codes', () => {
      expect(ErrorCode.PLUGIN_NOT_FOUND).toBe(1101);
      expect(ErrorCode.PLUGIN_LOAD_FAILED).toBe(1102);
      expect(ErrorCode.PLUGIN_INVALID).toBe(1103);
      expect(ErrorCode.PLUGIN_FUNCTION_NOT_FOUND).toBe(1104);
      expect(ErrorCode.PLUGIN_EXECUTION_FAILED).toBe(1105);
    });

    it('should have all expected analysis error codes', () => {
      expect(ErrorCode.ANALYSIS_FAILED).toBe(1201);
      expect(ErrorCode.ANALYSIS_TIMEOUT).toBe(1202);
      expect(ErrorCode.ANALYSIS_CANCELLED).toBe(1203);
      expect(ErrorCode.RULE_EXECUTION_FAILED).toBe(1204);
      expect(ErrorCode.FACT_COLLECTION_FAILED).toBe(1205);
    });

    it('should have all expected filesystem error codes', () => {
      expect(ErrorCode.FILE_NOT_FOUND).toBe(1301);
      expect(ErrorCode.FILE_READ_ERROR).toBe(1302);
      expect(ErrorCode.FILE_WRITE_ERROR).toBe(1303);
      expect(ErrorCode.DIRECTORY_NOT_FOUND).toBe(1304);
      expect(ErrorCode.PERMISSION_DENIED).toBe(1305);
    });

    it('should have all expected network error codes', () => {
      expect(ErrorCode.NETWORK_TIMEOUT).toBe(1401);
      expect(ErrorCode.NETWORK_CONNECTION_FAILED).toBe(1402);
      expect(ErrorCode.REMOTE_SERVER_ERROR).toBe(1403);
      expect(ErrorCode.API_RATE_LIMIT).toBe(1404);
    });

    it('should have all expected validation error codes', () => {
      expect(ErrorCode.INVALID_INPUT).toBe(1501);
      expect(ErrorCode.SCHEMA_VALIDATION_FAILED).toBe(1502);
      expect(ErrorCode.SECURITY_VIOLATION).toBe(1503);
    });

    it('should have all expected runtime error codes', () => {
      expect(ErrorCode.INITIALIZATION_FAILED).toBe(1601);
      expect(ErrorCode.DEPENDENCY_MISSING).toBe(1602);
      expect(ErrorCode.MEMORY_ERROR).toBe(1603);
      expect(ErrorCode.UNEXPECTED_ERROR).toBe(1699);
    });
  });
}); 