// Jest unit test for ReportManager
import { ReportManager } from '../../reports/reportManager';
import { ConfigManager } from '../../configuration/configManager';
import { mockExtensionContext, resetMockConfigStore } from '../mocks/vscode.mock';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ mtime: new Date() }),
  unlink: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined)
}));

// Mock @x-fidelity/core
jest.mock('@x-fidelity/core', () => ({
  ReportGenerator: {
    generateMarkdownReport: jest.fn().mockReturnValue('# Test Report'),
    generateHTMLReport: jest.fn().mockReturnValue('<html><body>Test Report</body></html>'),
    generateCSVReport: jest.fn().mockReturnValue('col1,col2\nval1,val2')
  },
  ConfigManager: {
    getConfig: jest.fn().mockResolvedValue({
      archetype: { name: 'test-archetype' },
      rules: [],
      exemptions: []
    })
  }
}));

// Mock ReportViewer
jest.mock('../../reports/reportViewer', () => ({
  ReportViewer: jest.fn().mockImplementation(() => ({
    showReport: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock ReportHistoryManager
jest.mock('../../reports/reportHistoryManager', () => ({
  ReportHistoryManager: jest.fn().mockImplementation(() => ({
    addReportToHistory: jest.fn().mockResolvedValue(undefined),
    getReportHistory: jest.fn().mockResolvedValue([]),
    cleanupOldReports: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock ExportManager
jest.mock('../../reports/exportManager', () => ({
  ExportManager: jest.fn().mockImplementation(() => ({
    exportReport: jest.fn().mockResolvedValue('/path/to/export'),
    shareReport: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock FileSourceTranslator
jest.mock('../../utils/fileSourceTranslator', () => ({
  FileSourceTranslator: {
    translateFilePaths: jest.fn().mockImplementation((result) => result)
  }
}));

describe('ReportManager Unit Tests', () => {
  let reportManager: ReportManager;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockConfigStore();

    // Create mock ConfigManager
    mockConfigManager = ConfigManager.getInstance(mockExtensionContext);
    
    // Mock getConfig to return a configuration with report generation enabled
    jest.spyOn(mockConfigManager, 'getConfig').mockReturnValue({
      archetype: 'node-fullstack',
      runInterval: 0,
      autoAnalyzeOnSave: false,
      analyzeOnStartup: true,
      telemetryEnabled: false,
      maxConcurrentAnalysis: 1,
      generateReports: true,
      reportFormats: ['json', 'md'],
      reportOutputDir: '',
      reportRetentionDays: 7,
      enableAutoRun: false
    } as any);

    // Create ReportManager instance
    reportManager = new ReportManager(mockConfigManager, mockExtensionContext);
  });

  afterEach(() => {
    ConfigManager.resetInstance();
  });

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(reportManager).toBeDefined();
    });

    it('should initialize sub-managers', () => {
      const { ReportViewer } = require('../../reports/reportViewer');
      const { ReportHistoryManager } = require('../../reports/reportHistoryManager');
      const { ExportManager } = require('../../reports/exportManager');
      
      expect(ReportViewer).toHaveBeenCalled();
      expect(ReportHistoryManager).toHaveBeenCalled();
      expect(ExportManager).toHaveBeenCalled();
    });
  });

  describe('generateReports', () => {
    const mockResult = {
      XFI_RESULT: {
        totalIssues: 5,
        warningCount: 3,
        fatalityCount: 2,
        errorCount: 0,
        exemptCount: 0,
        issueDetails: []
      }
    };

    it('should not generate reports when disabled', async () => {
      jest.spyOn(mockConfigManager, 'getConfig').mockReturnValue({
        generateReports: false
      } as any);

      await reportManager.generateReports(mockResult as any, '/test/workspace');

      const fs = require('fs/promises');
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should create output directory', async () => {
      await reportManager.generateReports(mockResult as any, '/test/workspace');

      const fs = require('fs/promises');
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.xfiResults'),
        { recursive: true }
      );
    });

    it('should add report to history', async () => {
      await reportManager.generateReports(mockResult as any, '/test/workspace');

      const { ReportHistoryManager } = require('../../reports/reportHistoryManager');
      const historyManagerInstance = ReportHistoryManager.mock.results[0].value;
      expect(historyManagerInstance.addReportToHistory).toHaveBeenCalled();
    });
  });

  describe('showInteractiveReport', () => {
    it('should delegate to report viewer', async () => {
      const mockResult = {
        XFI_RESULT: { totalIssues: 0 }
      };

      await reportManager.showInteractiveReport(mockResult as any);

      const { ReportViewer } = require('../../reports/reportViewer');
      const reportViewerInstance = ReportViewer.mock.results[0].value;
      expect(reportViewerInstance.showReport).toHaveBeenCalled();
    });

    it('should pass preserveFocus flag to viewer', async () => {
      const mockResult = {
        XFI_RESULT: { totalIssues: 0 }
      };

      await reportManager.showInteractiveReport(mockResult as any, false);

      const { ReportViewer } = require('../../reports/reportViewer');
      const reportViewerInstance = ReportViewer.mock.results[0].value;
      expect(reportViewerInstance.showReport).toHaveBeenCalledWith(
        expect.any(Object),
        false
      );
    });
  });

  describe('exportReport', () => {
    it('should delegate to export manager', async () => {
      const mockResult = { XFI_RESULT: { totalIssues: 0 } };
      const options = { format: 'json' as const, outputPath: '/test/output' };

      await reportManager.exportReport(mockResult as any, options);

      const { ExportManager } = require('../../reports/exportManager');
      const exportManagerInstance = ExportManager.mock.results[0].value;
      expect(exportManagerInstance.exportReport).toHaveBeenCalled();
    });
  });

  describe('getReportHistory', () => {
    it('should delegate to history manager', async () => {
      await reportManager.getReportHistory('/test/workspace');

      const { ReportHistoryManager } = require('../../reports/reportHistoryManager');
      const historyManagerInstance = ReportHistoryManager.mock.results[0].value;
      expect(historyManagerInstance.getReportHistory).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose report viewer', () => {
      reportManager.dispose();

      const { ReportViewer } = require('../../reports/reportViewer');
      const reportViewerInstance = ReportViewer.mock.results[0].value;
      expect(reportViewerInstance.dispose).toHaveBeenCalled();
    });
  });
});
