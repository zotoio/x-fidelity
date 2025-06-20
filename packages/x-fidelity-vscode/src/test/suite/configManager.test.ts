import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ConfigManager } from '../../configuration/configManager';

// Mock vscode configuration
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() }))
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    fire: jest.fn(),
    dispose: jest.fn(),
    event: jest.fn()
  }))
}));

describe('ConfigManager Path Resolution Tests', () => {
  let configManager: ConfigManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: any;
  const originalEnv = process.env.XFI_CONFIG_PATH;
  const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;

  beforeEach(() => {
    // Create a mock extension context
    mockContext = {
      extensionPath: '/mock/extension/path',
      subscriptions: [],
    } as any;
    
    // Create mock configuration with default values
    mockConfig = {
      get: jest.fn((key: string, defaultValue: any) => {
        const defaults: Record<string, any> = {
          'runInterval': 300,
          'autoAnalyzeOnSave': true,
          'autoAnalyzeOnFileChange': false,
          'archetype': 'node-fullstack',
          'configServer': '',
          'localConfigPath': '',
          'openaiEnabled': false,
          'telemetryCollector': '',
          'telemetryEnabled': true,
          'generateReports': true,
          'reportOutputDir': '',
          'reportFormats': ['json', 'md'],
          'showReportAfterAnalysis': false,
          'reportRetentionDays': 30,
          'showInlineDecorations': true,
          'highlightSeverity': ['error', 'warning'],
          'statusBarVisibility': true,
          'problemsPanelGrouping': 'file',
          'showRuleDocumentation': true,
          'maxFileSize': 1024 * 1024,
          'analysisTimeout': 30000,
          'excludePatterns': ['node_modules/**', '.git/**'],
          'includePatterns': [],
          'maxConcurrentAnalysis': 3,
          'debugMode': false,
          'customPlugins': [],
          'ruleOverrides': {},
          'cacheResults': true,
          'cacheTTL': 5
        };
        return defaults[key] ?? defaultValue;
      }),
      update: jest.fn(),
      has: jest.fn(() => true)
    };
    
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    
    configManager = new ConfigManager(mockContext);
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.XFI_CONFIG_PATH = originalEnv;
    } else {
      delete process.env.XFI_CONFIG_PATH;
    }
    
    if (originalXdgConfigHome !== undefined) {
      process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    
    // Safely dispose if dispose method exists
    if (configManager && typeof configManager.dispose === 'function') {
      try {
        configManager.dispose();
      } catch (error) {
        // Ignore disposal errors in tests
      }
    }
    
    jest.clearAllMocks();
  });

  it('should use explicit localConfigPath when configured', () => {
    // Update the mock to return explicit path values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '/explicit/config/path';
      if (key === 'configServer') return '';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    expect(resolvedPath).toBe('/explicit/config/path');
  });

  it('should use explicit localConfigPath when configServer is set', () => {
    // Update the mock to return config server values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '/explicit/config/path';
      if (key === 'configServer') return 'https://config.server.com';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    expect(resolvedPath).toBe('/explicit/config/path');
  });

  it('should fall back to extension config when no explicit config', () => {
    // Update the mock to return empty values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '';
      if (key === 'configServer') return '';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    // Mock environment variable not set
    delete process.env.XFI_CONFIG_PATH;
    delete process.env.XDG_CONFIG_HOME;

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    const expectedPath = path.join('/mock/extension/path', 'dist', 'demoConfig');
    expect(resolvedPath).toBe(expectedPath);
  });

  it('should use XDG_CONFIG_HOME when set and valid', () => {
    // Create a temporary directory to simulate XDG_CONFIG_HOME
    const tempDir = path.join(os.tmpdir(), 'xdg-config-test');
    const xfiConfigDir = path.join(tempDir, 'x-fidelity');
    
    try {
      // Ensure temp directories exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      if (!fs.existsSync(xfiConfigDir)) {
        fs.mkdirSync(xfiConfigDir, { recursive: true });
      }

      // Set environment variable
      process.env.XDG_CONFIG_HOME = tempDir;
      delete process.env.XFI_CONFIG_PATH;

      // Update the mock to return empty values
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'localConfigPath') return '';
        if (key === 'configServer') return '';
        // Return other defaults
        const defaults: Record<string, any> = {
          'runInterval': 300,
          'autoAnalyzeOnSave': true,
          'archetype': 'node-fullstack'
        };
        return defaults[key] ?? defaultValue;
      });

      // Force config reload
      (configManager as any).loadConfiguration();

      const resolvedPath = configManager.getResolvedLocalConfigPath();
      expect(resolvedPath).toBe(xfiConfigDir);
    } finally {
      // Clean up temp directory
      if (fs.existsSync(xfiConfigDir)) {
        fs.rmSync(xfiConfigDir, { recursive: true, force: true });
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('should use default ~/.config/x-fidelity when XDG_CONFIG_HOME not set', () => {
    // Remove environment variables
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.XFI_CONFIG_PATH;

    // Update the mock to return empty values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '';
      if (key === 'configServer') return '';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    const expectedPath = path.join('/mock/extension/path', 'dist', 'demoConfig');
    // Should fallback to extension config since ~/.config/x-fidelity doesn't exist
    expect(resolvedPath).toBe(expectedPath);
  });

  it('should use environment variable when set and valid', () => {
    // Create a temporary directory to simulate XFI_CONFIG_PATH
    const tempDir = path.join(os.tmpdir(), 'xfi-test-config');
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Set environment variable
      process.env.XFI_CONFIG_PATH = tempDir;
      delete process.env.XDG_CONFIG_HOME;

      // Update the mock to return empty values
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'localConfigPath') return '';
        if (key === 'configServer') return '';
        // Return other defaults
        const defaults: Record<string, any> = {
          'runInterval': 300,
          'autoAnalyzeOnSave': true,
          'archetype': 'node-fullstack'
        };
        return defaults[key] ?? defaultValue;
      });

      // Force config reload
      (configManager as any).loadConfiguration();

      const resolvedPath = configManager.getResolvedLocalConfigPath();
      expect(resolvedPath).toBe(tempDir);
    } finally {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('should fallback when environment variable points to non-existent path', () => {
    // Set environment variable to non-existent path
    process.env.XFI_CONFIG_PATH = '/non/existent/path';
    delete process.env.XDG_CONFIG_HOME;

    // Update the mock to return empty values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '';
      if (key === 'configServer') return '';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    const expectedPath = path.join('/mock/extension/path', 'dist', 'demoConfig');
    expect(resolvedPath).toBe(expectedPath);
  });

  it('should fallback when XDG_CONFIG_HOME points to non-existent path', () => {
    // Set XDG_CONFIG_HOME to non-existent path
    process.env.XDG_CONFIG_HOME = '/non/existent/path';
    delete process.env.XFI_CONFIG_PATH;

    // Update the mock to return empty values
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'localConfigPath') return '';
      if (key === 'configServer') return '';
      // Return other defaults
      const defaults: Record<string, any> = {
        'runInterval': 300,
        'autoAnalyzeOnSave': true,
        'archetype': 'node-fullstack'
      };
      return defaults[key] ?? defaultValue;
    });

    // Force config reload
    (configManager as any).loadConfiguration();

    const resolvedPath = configManager.getResolvedLocalConfigPath();
    const expectedPath = path.join('/mock/extension/path', 'dist', 'demoConfig');
    expect(resolvedPath).toBe(expectedPath);
  });
}); 