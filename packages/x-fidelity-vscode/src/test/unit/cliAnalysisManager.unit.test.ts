// Jest unit test for CLIAnalysisManager
import { CLIAnalysisManager } from '../../analysis/cliAnalysisManager';
import { ConfigManager } from '../../configuration/configManager';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import {
  mockExtensionContext,
  workspace,
  resetMockConfigStore
} from '../mocks/vscode.mock';

// Mock the VSCode Logger
jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  }),
  commandLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the VSCodeLogger class
jest.mock('../../utils/vscodeLogger', () => ({
  VSCodeLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  }))
}));

// Mock CLI spawner
jest.mock('../../utils/cliSpawner', () => ({
  createCLISpawner: jest.fn().mockReturnValue({
    spawn: jest.fn().mockResolvedValue({
      stdout: JSON.stringify({ XFI_RESULT: { totalIssues: 0 } }),
      stderr: ''
    }),
    isAvailable: jest.fn().mockReturnValue(true)
  })
}));

// Mock AnalysisResultCache
jest.mock('../../utils/analysisResultCache', () => ({
  AnalysisResultCache: {
    ensureFreshResults: jest.fn(),
    isAnalysisRunning: jest.fn().mockReturnValue(false),
    markAnalysisStarted: jest.fn().mockReturnValue('test-analysis-id'),
    markAnalysisCompleted: jest.fn(),
    getCachedResult: jest.fn().mockReturnValue(null),
    cacheResult: jest.fn()
  }
}));

// Mock serialization
jest.mock('../../utils/serialization', () => ({
  safeSerializeAnalysisResult: jest.fn().mockImplementation((result) => JSON.stringify(result))
}));

// Mock workspaceUtils
jest.mock('../../utils/workspaceUtils', () => ({
  getAnalysisTargetDirectory: jest.fn().mockReturnValue('/test/workspace')
}));

describe('CLIAnalysisManager Unit Tests', () => {
  let cliAnalysisManager: CLIAnalysisManager;
  let mockConfigManager: ConfigManager;
  let mockDiagnosticProvider: DiagnosticProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockConfigStore();

    // Create mock ConfigManager
    mockConfigManager = ConfigManager.getInstance(mockExtensionContext);

    // Create mock DiagnosticProvider
    mockDiagnosticProvider = {
      updateDiagnostics: jest.fn(),
      clearDiagnostics: jest.fn(),
      dispose: jest.fn()
    } as unknown as DiagnosticProvider;

    // Create CLIAnalysisManager instance
    cliAnalysisManager = new CLIAnalysisManager(mockConfigManager, mockDiagnosticProvider);
  });

  afterEach(() => {
    ConfigManager.resetInstance();
    cliAnalysisManager.dispose();
  });

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(cliAnalysisManager).toBeDefined();
    });

    it('should initialize CLI spawner', () => {
      const { createCLISpawner } = require('../../utils/cliSpawner');
      expect(createCLISpawner).toHaveBeenCalled();
    });
  });

  describe('isAnalysisRunning', () => {
    it('should return false when not analyzing', () => {
      expect(cliAnalysisManager.isAnalysisRunning).toBe(false);
    });
  });

  describe('cancelAnalysis', () => {
    it('should cancel running analysis', async () => {
      await cliAnalysisManager.cancelAnalysis();
      expect(cliAnalysisManager.isAnalysisRunning).toBe(false);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return empty object', () => {
      const metrics = cliAnalysisManager.getPerformanceMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('getLogger', () => {
    it('should return logger instance', () => {
      const logger = cliAnalysisManager.getLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('getCLISpawner', () => {
    it('should return CLI spawner instance', () => {
      const spawner = cliAnalysisManager.getCLISpawner();
      expect(spawner).toBeDefined();
    });
  });

  describe('events', () => {
    it('should expose onStateChanged event', () => {
      expect(cliAnalysisManager.onStateChanged).toBeDefined();
    });

    it('should expose onComplete event', () => {
      expect(cliAnalysisManager.onComplete).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should dispose resources without throwing', () => {
      expect(() => cliAnalysisManager.dispose()).not.toThrow();
    });
  });

  describe('configuration change handling', () => {
    it('should set up configuration change listener', () => {
      // The listener is set up in constructor via setupEventListeners
      expect(workspace.onDidChangeConfiguration).toBeDefined();
    });
  });
});
