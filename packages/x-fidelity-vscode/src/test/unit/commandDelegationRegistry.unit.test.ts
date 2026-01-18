// Mock vscode module first
const mockExtensions = {
  all: [] as any[],
  onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
  getExtension: jest.fn()
};

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      append: jest.fn(),
      appendLine: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn()
    }))
  },
  commands: {
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'xfidelity.debugMode') {return false;}
        if (key === 'logLevel') {return 'info';}
        return undefined;
      }),
      update: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
    workspaceFolders: []
  },
  env: {
    appName: 'Visual Studio Code',
    clipboard: {
      writeText: jest.fn()
    }
  },
  extensions: mockExtensions,
  ConfigurationTarget: {
    Global: 1
  }
}));

import * as vscode from 'vscode';
import { CommandDelegationRegistry } from '../../core/commandDelegationRegistry';

// Get references to the mocked objects
const mockWindow = vscode.window as jest.Mocked<typeof vscode.window>;
const mockCommands = vscode.commands as jest.Mocked<typeof vscode.commands>;
const mockWorkspace = vscode.workspace as jest.Mocked<typeof vscode.workspace>;
// mockExtensions is already declared above

// Mock context
const mockContext = {
  subscriptions: []
} as any;

describe('CommandDelegationRegistry', () => {
  let registry: CommandDelegationRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtensions.all = [];
    registry = new CommandDelegationRegistry(mockContext);
  });

  afterEach(() => {
    registry.dispose();
  });

  describe('provider discovery', () => {
    it('should discover issue explainer providers', () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueExplainer': {
              id: 'test-explainer',
              displayName: 'Test Explainer',
              command: 'test.explainIssue'
            }
          }
        }
      };

      mockExtensions.all = [mockExtension];
      registry = new CommandDelegationRegistry(mockContext);

      const explainers = registry.getAvailableExplainers();
      expect(explainers).toHaveLength(1);
      expect(explainers[0].id).toBe('test-explainer');
      expect(explainers[0].extensionId).toBe('test.extension');
    });

    it('should discover issue fixer providers', () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'test-fixer',
              displayName: 'Test Fixer',
              command: 'test.fixIssue',
              supportsBatch: true
            }
          }
        }
      };

      mockExtensions.all = [mockExtension];
      registry = new CommandDelegationRegistry(mockContext);

      const fixers = registry.getAvailableFixers();
      expect(fixers).toHaveLength(1);
      expect(fixers[0].id).toBe('test-fixer');
      expect(fixers[0].supportsBatch).toBe(true);
    });

    it('should handle extensions without contribution points', () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {}
        }
      };

      mockExtensions.all = [mockExtension];
      registry = new CommandDelegationRegistry(mockContext);

      expect(registry.getAvailableExplainers()).toHaveLength(0);
      expect(registry.getAvailableFixers()).toHaveLength(0);
    });
  });

  describe('explainIssue delegation', () => {
    const mockIssueContext = {
      ruleId: 'test-rule',
      message: 'Test issue',
      file: 'test.js',
      line: 10,
      column: 5,
      severity: 'error',
      category: 'test',
      fixable: true
    };

    it('should use built-in implementation when delegation is disabled', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return false;}
        return 'built-in';
      });

      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Issue Explanation'),
        expect.any(Object),
        'Configure Providers',
        'OK'
      );
    });

    it('should use built-in implementation when configured provider is "built-in"', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        // Use 'built-in' preset which triggers default implementation with fallback UI
        if (key === 'aiIntegrationPreset') {return 'built-in';}
        if (key === 'commandProviders.explainIssue') {return 'built-in';}
        return undefined;
      });

      await registry.delegateExplainIssue(mockIssueContext);

      // With built-in preset in non-AI environment, it shows the fallback modal
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Issue Explanation'),
        expect.any(Object),
        'Configure Providers',
        'OK'
      );
    });

    it('should delegate to external command when configured', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        // Must set preset to 'custom' to use commandProviders values
        if (key === 'aiIntegrationPreset') {return 'custom';}
        if (key === 'commandProviders.explainIssue') {return 'github.copilot.interactiveEditor.explain';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'github.copilot.interactiveEditor.explain',
        mockIssueContext
      );
    });

    it('should fall back to built-in when external command fails', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        // Must set preset to 'custom' to use commandProviders values
        if (key === 'aiIntegrationPreset') {return 'custom';}
        if (key === 'commandProviders.explainIssue') {return 'nonexistent.command';}
        return undefined;
      });

      mockCommands.executeCommand.mockRejectedValue(new Error('Command not found'));

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'nonexistent.command',
        mockIssueContext
      );
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Issue Explanation'),
        expect.any(Object),
        'Configure Providers',
        'OK'
      );
    });
  });

  describe('fixIssue delegation', () => {
    const mockIssueContext = {
      ruleId: 'test-rule',
      message: 'Test issue',
      file: 'test.js',
      line: 10,
      column: 5,
      severity: 'error',
      category: 'test',
      fixable: true
    };

    it('should handle non-fixable issues appropriately', async () => {
      const nonFixableContext = { ...mockIssueContext, fixable: false };
      
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        if (key === 'commandProviders.fixIssue') {return 'built-in';}
        return undefined;
      });

      await registry.delegateFixIssue(nonFixableContext);

      // With the enhanced AI fallback, even non-fixable issues get AI assistance
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Issue Fix'),
        expect.any(Object),
        'Configure Providers',
        expect.any(String),
        'OK'
      );
    });

    it('should delegate to external command when configured', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        // Must set preset to 'custom' to use commandProviders values
        if (key === 'aiIntegrationPreset') {return 'custom';}
        if (key === 'commandProviders.fixIssue') {return 'github.copilot.interactiveEditor.generateDocs';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'github.copilot.interactiveEditor.generateDocs',
        mockIssueContext
      );
    });
  });

  describe('fixIssueGroup delegation', () => {
    const mockGroupContext = {
      groupKey: 'test-group',
      issues: [
        {
          ruleId: 'test-rule-1',
          message: 'Test issue 1',
          file: 'test1.js',
          line: 10,
          column: 5,
          severity: 'error',
          category: 'test',
          fixable: true
        },
        {
          ruleId: 'test-rule-2',
          message: 'Test issue 2',
          file: 'test2.js',
          line: 15,
          column: 3,
          severity: 'warning',
          category: 'test',
          fixable: true
        }
      ],
      groupType: 'rule' as const
    };

    it('should require batch support for group operations', async () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'test-fixer',
              displayName: 'Test Fixer',
              command: 'test.fixIssue',
              supportsBatch: false // No batch support
            }
          }
        },
        isActive: true
      };

      mockExtensions.all = [mockExtension];
      mockExtensions.getExtension.mockReturnValue(mockExtension as any);
      
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        if (key === 'commandProviders.fixIssueGroup') {return 'test.extension';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      // Should fall back to built-in because provider doesn't support batch
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Batch Fix'),
        { modal: true },
        'Configure Providers',
        'OK'
      );
    });

    it('should delegate to external command for batch operations', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        // Must set preset to 'custom' to use commandProviders values
        if (key === 'aiIntegrationPreset') {return 'custom';}
        if (key === 'commandProviders.fixIssueGroup') {return 'workbench.action.terminal.sendSequence';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.terminal.sendSequence',
        mockGroupContext
      );
    });
  });

  describe('configuration UI', () => {
    it('should show configuration options', async () => {
      const mockConfig = { 
        get: jest.fn((key: string) => {
          if (key === 'commandProviders') {
            return {
              explainIssue: 'built-in',
              fixIssue: 'built-in',
              fixIssueGroup: 'built-in'
            };
          }
          return undefined;
        }), 
        update: jest.fn() 
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockWindow.showQuickPick.mockResolvedValueOnce({
        label: '$(question) Configure Issue Explainer',
        detail: 'explainIssue'
      });

      mockWindow.showQuickPick.mockResolvedValueOnce({
        label: '$(home) Built-in Implementation',
        detail: 'built-in'
      });

      await registry.showConfigurationUI();

      expect(mockWindow.showQuickPick).toHaveBeenCalledTimes(2);
      expect(mockConfig.update).toHaveBeenCalledWith(
        'commandProviders',
        {
          explainIssue: 'built-in',
          fixIssue: 'built-in',
          fixIssueGroup: 'built-in'
        },
        vscode.ConfigurationTarget.Global
      );
    });

    it('should filter batch fixers for group operations', async () => {
      const mockBatchExtension = {
        id: 'batch.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'batch-fixer',
              displayName: 'Batch Fixer',
              command: 'batch.fixIssues',
              supportsBatch: true
            }
          }
        }
      };

      const mockSingleExtension = {
        id: 'single.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'single-fixer',
              displayName: 'Single Fixer',
              command: 'single.fixIssue',
              supportsBatch: false
            }
          }
        }
      };

      mockExtensions.all = [mockBatchExtension, mockSingleExtension];
      registry = new CommandDelegationRegistry(mockContext);

      mockWindow.showQuickPick.mockResolvedValue({
        label: '$(wrench) Configure Batch Fixer',
        detail: 'fixIssueGroup'
      });

      await registry.showConfigurationUI();

      // Should only show built-in and batch-capable fixer
      const secondCall = mockWindow.showQuickPick.mock.calls[1];
      expect(secondCall[0]).toHaveLength(2); // Built-in + batch fixer only
      expect(secondCall[0][1].label).toContain('Batch Fixer');
    });
  });

  describe('prompt prefixes', () => {
    const mockIssueContext = {
      ruleId: 'test-rule',
      message: 'Test issue message',
      file: '/path/to/file.ts',
      line: 10,
      column: 5,
      severity: 'warning',
      category: 'test-category',
      fixable: true
    };

    const mockGroupContext = {
      groupKey: 'test-group',
      issues: [mockIssueContext],
      groupType: 'rule' as const
    };

    it('should use empty prefix when no prefix configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          if (key === 'promptPrefixes') {return undefined;}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // The clipboard should contain the prompt without a prefix
      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^Please explain this code quality issue:/);
    });

    it('should prepend explainIssue prefix when configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          if (key === 'promptPrefixes') {
            return {
              explainIssue: '/explain @codebase',
              fixIssue: '',
              fixIssueGroup: ''
            };
          }
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // The clipboard should contain the prefix at the start
      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^\/explain @codebase\n\nPlease explain this code quality issue:/);
    });

    it('should prepend fixIssue prefix when configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          if (key === 'promptPrefixes') {
            return {
              explainIssue: '',
              fixIssue: '/fix @workspace',
              fixIssueGroup: ''
            };
          }
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      // The clipboard should contain the prefix at the start
      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^\/fix @workspace\n\nPlease fix this code quality issue:/);
    });

    it('should prepend fixIssueGroup prefix when configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          if (key === 'promptPrefixes') {
            return {
              explainIssue: '',
              fixIssue: '',
              fixIssueGroup: '/agent fix-all'
            };
          }
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      // The clipboard should contain the prefix at the start
      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^\/agent fix-all\n\nPlease fix the following 1 code quality issues:/);
    });

    it('should handle partially configured prefixes', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          if (key === 'promptPrefixes') {
            // Only explainIssue is configured
            return {
              explainIssue: '@docs'
            };
          }
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      
      // explainIssue should use the configured prefix
      await registry.delegateExplainIssue(mockIssueContext);
      let clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^@docs\n\nPlease explain this code quality issue:/);

      // fixIssue should work without prefix since it's not configured
      jest.clearAllMocks();
      await registry.delegateFixIssue(mockIssueContext);
      clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toMatch(/^Please fix this code quality issue:/);
    });
  });
}); 