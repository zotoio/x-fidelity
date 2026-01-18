// Jest unit test for StatusBarProvider
import { StatusBarProvider } from '../../ui/statusBarProvider';
import { window as vscodeWindow } from '../mocks/vscode.mock';

// Mock the VSCode Logger
jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  })
}));

// Mock EventEmitter
const mockStateChangedEmitter = {
  event: jest.fn().mockReturnValue({ dispose: jest.fn() })
};
const mockCompleteEmitter = {
  event: jest.fn().mockReturnValue({ dispose: jest.fn() })
};

// Mock analysis engine interface
const mockAnalysisEngine = {
  isAnalysisRunning: false,
  onStateChanged: mockStateChangedEmitter.event,
  onComplete: mockCompleteEmitter.event,
  triggerAnalysis: jest.fn(),
  cancelAnalysis: jest.fn(),
  getPerformanceMetrics: jest.fn().mockReturnValue({}),
  getLogger: jest.fn(),
  dispose: jest.fn()
};

describe('StatusBarProvider Unit Tests', () => {
  let statusBarProvider: StatusBarProvider;
  let mockStatusBarItem: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: undefined,
      backgroundColor: undefined,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };

    // Mock window.createStatusBarItem
    (vscodeWindow.createStatusBarItem as jest.Mock).mockReturnValue(
      mockStatusBarItem
    );

    // Create StatusBarProvider instance
    statusBarProvider = new StatusBarProvider(mockAnalysisEngine as any);
  });

  afterEach(() => {
    statusBarProvider.dispose();
  });

  describe('constructor', () => {
    it('should create status bar item', () => {
      expect(vscodeWindow.createStatusBarItem).toHaveBeenCalled();
    });

    it('should show status bar item', () => {
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should set initial text with lightning icon', () => {
      expect(mockStatusBarItem.text).toContain('$(zap)');
      expect(mockStatusBarItem.text).toContain('X-Fidelity');
    });

    it('should set initial tooltip', () => {
      expect(mockStatusBarItem.tooltip).toContain('X-Fidelity');
      expect(mockStatusBarItem.tooltip).toContain('Click to run analysis');
    });

    it('should set initial command to run analysis', () => {
      expect(mockStatusBarItem.command).toBe('xfidelity.runAnalysis');
    });
  });

  describe('event listeners', () => {
    it('should subscribe to state changes', () => {
      expect(mockStateChangedEmitter.event).toHaveBeenCalled();
    });

    it('should subscribe to completion events', () => {
      expect(mockCompleteEmitter.event).toHaveBeenCalled();
    });
  });

  describe('updateFromProcessedResult', () => {
    it('should update status bar from processed result', () => {
      const mockProcessedResult = {
        totalIssues: 5,
        successfulIssues: 3,
        failedIssues: [],
        failedIssuesCount: 2,
        timestamp: new Date().toISOString(),
        duration: 1000,
        metadata: { XFI_RESULT: { fileCount: {} } },
        issueBreakdown: {
          error: 2,
          warning: 3,
          info: 0,
          hint: 0,
          exempt: 0
        }
      };

      statusBarProvider.updateFromProcessedResult(mockProcessedResult as any);

      // Check that the status bar was updated
      expect(mockStatusBarItem.text).toBeDefined();
      expect(mockStatusBarItem.text).toContain('$(warning)');
    });

    it('should handle result with no issues', () => {
      const mockProcessedResult = {
        totalIssues: 0,
        successfulIssues: 0,
        failedIssues: [],
        failedIssuesCount: 0,
        timestamp: new Date().toISOString(),
        duration: 500,
        metadata: { XFI_RESULT: { fileCount: {} } },
        issueBreakdown: {
          error: 0,
          warning: 0,
          info: 0,
          hint: 0,
          exempt: 0
        }
      };

      expect(() =>
        statusBarProvider.updateFromProcessedResult(mockProcessedResult as any)
      ).not.toThrow();
      expect(mockStatusBarItem.text).toContain('$(check)');
    });

    it('should handle result with only warnings', () => {
      const mockProcessedResult = {
        totalIssues: 3,
        successfulIssues: 3,
        failedIssues: [],
        failedIssuesCount: 0,
        timestamp: new Date().toISOString(),
        duration: 500,
        metadata: { XFI_RESULT: { fileCount: {} } },
        issueBreakdown: {
          error: 0,
          warning: 3,
          info: 0,
          hint: 0,
          exempt: 0
        }
      };

      expect(() =>
        statusBarProvider.updateFromProcessedResult(mockProcessedResult as any)
      ).not.toThrow();
    });

    it('should handle result with unhandled issues', () => {
      const mockProcessedResult = {
        totalIssues: 5,
        successfulIssues: 3,
        failedIssues: [{}, {}],
        failedIssuesCount: 2,
        timestamp: new Date().toISOString(),
        duration: 500,
        metadata: { XFI_RESULT: { fileCount: {} } },
        issueBreakdown: {
          error: 3,
          warning: 0,
          info: 0,
          hint: 0,
          exempt: 0
        }
      };

      expect(() =>
        statusBarProvider.updateFromProcessedResult(mockProcessedResult as any)
      ).not.toThrow();
      expect(mockStatusBarItem.text).toContain('unhandled');
    });
  });

  describe('dispose', () => {
    it('should dispose status bar item', () => {
      statusBarProvider.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should not throw when called multiple times', () => {
      statusBarProvider.dispose();
      expect(() => statusBarProvider.dispose()).not.toThrow();
    });
  });

  describe('state transitions', () => {
    it('should handle idle state', () => {
      // Trigger state change callback
      const stateCallback = (mockStateChangedEmitter.event as jest.Mock).mock
        .calls[0]?.[0];
      if (stateCallback) {
        stateCallback('idle');
        expect(mockStatusBarItem.text).toContain('$(zap)');
      }
    });

    it('should handle analyzing state', () => {
      const stateCallback = (mockStateChangedEmitter.event as jest.Mock).mock
        .calls[0]?.[0];
      if (stateCallback) {
        stateCallback('analyzing');
        expect(mockStatusBarItem.text).toContain('$(sync~spin)');
      }
    });

    it('should handle complete state', () => {
      const stateCallback = (mockStateChangedEmitter.event as jest.Mock).mock
        .calls[0]?.[0];
      if (stateCallback) {
        stateCallback('complete');
      }
      // Just verify no error was thrown
      expect(mockStatusBarItem).toBeDefined();
    });

    it('should handle error state', () => {
      const stateCallback = (mockStateChangedEmitter.event as jest.Mock).mock
        .calls[0]?.[0];
      if (stateCallback) {
        stateCallback('error');
      }
      // Just verify no error was thrown
      expect(mockStatusBarItem).toBeDefined();
    });
  });
});
