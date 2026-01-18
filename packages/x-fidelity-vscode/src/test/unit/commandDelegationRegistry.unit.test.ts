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

  describe('AI provider presets', () => {
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

    it('should use auto-detect preset', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'auto-detect';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt to use best AI provider (fallback to showing modal)
      expect(mockWindow.showInformationMessage).toHaveBeenCalled();
    });

    it('should use cursor preset', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'cursor';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt to use Cursor AI
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'cursor.composer.chat',
        expect.any(Object)
      );
    });

    it('should use github-copilot preset', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'github-copilot';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt to use GitHub Copilot
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'github.copilot.chat.open',
        expect.any(Object)
      );
    });

    it('should use amazon-q preset', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'amazon-q';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt to use Amazon Q
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'aws.amazonq.explainCode',
        expect.any(Object)
      );
    });
  });

  describe('AI provider fallbacks', () => {
    const mockIssueContext = {
      ruleId: 'test-rule',
      message: 'Test issue',
      file: '/path/to/file.ts',
      line: 10,
      column: 5,
      severity: 'error',
      category: 'test',
      fixable: true
    };

    it('should fallback from Cursor to modal on error', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'cursor';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      mockCommands.executeCommand.mockRejectedValue(new Error('Cursor not available'));

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should show fallback modal
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity Issue Explanation'),
        expect.any(Object),
        'Configure Providers',
        'OK'
      );
    });

    it('should fallback from Copilot to panel on primary error', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'github-copilot';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      // First call fails, second call (panel) succeeds
      mockCommands.executeCommand
        .mockRejectedValueOnce(new Error('Primary command failed'))
        .mockResolvedValueOnce(undefined);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt alternative Copilot command
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'workbench.panel.chat.view.copilot.open'
      );
    });

    it('should fallback from Amazon Q to chat on primary error', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'amazon-q';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      // First call fails, second call (chat) succeeds
      mockCommands.executeCommand
        .mockRejectedValueOnce(new Error('Primary command failed'))
        .mockResolvedValueOnce(undefined);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      // Should attempt alternative Amazon Q command
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'aws.amazonq.chat.open'
      );
    });
  });

  describe('enhanced issue context in prompts', () => {
    it('should include global check indicator in prompt', async () => {
      const globalIssueContext = {
        ruleId: 'global-rule',
        message: 'Global repository issue',
        file: 'REPO_GLOBAL_CHECK',
        line: 1,
        column: 1,
        severity: 'warning',
        category: 'global',
        fixable: false,
        isGlobalCheck: true
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(globalIssueContext);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('Repository-wide');
    });

    it('should include end line and column in prompt when available', async () => {
      const issueWithRange = {
        ruleId: 'test-rule',
        message: 'Test issue',
        file: '/path/to/file.ts',
        line: 10,
        column: 5,
        endLine: 15,
        endColumn: 20,
        severity: 'error',
        category: 'test',
        fixable: false
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithRange);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('Lines 10-15');
    });

    it('should include code snippet in prompt when available', async () => {
      const issueWithSnippet = {
        ruleId: 'test-rule',
        message: 'Test issue',
        file: '/path/to/file.ts',
        line: 10,
        column: 5,
        severity: 'error',
        category: 'test',
        fixable: false,
        codeSnippet: 'const badCode = "example";'
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithSnippet);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('const badCode = "example";');
    });

    it('should include recommendations in prompt when available', async () => {
      const issueWithRecommendations = {
        ruleId: 'test-rule',
        message: 'Test issue',
        file: '/path/to/file.ts',
        line: 10,
        column: 5,
        severity: 'error',
        category: 'test',
        fixable: false,
        recommendations: ['Use a different approach', 'Consider refactoring']
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithRecommendations);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('Use a different approach');
      expect(clipboardCall[0]).toContain('Consider refactoring');
    });
  });

  describe('enhanced details formatting', () => {
    it('should format dependency enhanced details', async () => {
      const issueWithDependencyDetails = {
        ruleId: 'dependency-check',
        message: 'Outdated dependencies',
        file: 'package.json',
        line: 1,
        column: 1,
        severity: 'warning',
        category: 'dependencies',
        fixable: true,
        enhancedDetails: {
          type: 'dependency' as const,
          summary: '2 outdated dependencies',
          actionable: true,
          items: [
            { label: 'react', currentValue: '16.0.0', expectedValue: '18.0.0', itemSeverity: 'high' as const },
            { label: 'lodash', currentValue: '4.0.0', expectedValue: '4.17.0', itemSeverity: 'medium' as const }
          ]
        }
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithDependencyDetails);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('react');
      expect(clipboardCall[0]).toContain('16.0.0');
      expect(clipboardCall[0]).toContain('18.0.0');
    });

    it('should format complexity enhanced details', async () => {
      const issueWithComplexityDetails = {
        ruleId: 'complexity-check',
        message: 'Complex functions',
        file: '/path/to/file.ts',
        line: 10,
        column: 1,
        severity: 'warning',
        category: 'complexity',
        fixable: false,
        enhancedDetails: {
          type: 'complexity' as const,
          summary: '1 complex function',
          actionable: true,
          items: [
            { label: 'processData', line: 10, itemSeverity: 'high' as const, metrics: { cyclomatic: 25, cognitive: 45 } }
          ]
        }
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(issueWithComplexityDetails);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('processData');
      expect(clipboardCall[0]).toContain('Refactor');
    });

    it('should format sensitive data enhanced details', async () => {
      const issueWithSensitiveDetails = {
        ruleId: 'sensitive-data',
        message: 'Sensitive data found',
        file: '/path/to/file.ts',
        line: 15,
        column: 1,
        severity: 'error',
        category: 'security',
        fixable: false,
        enhancedDetails: {
          type: 'sensitive-data' as const,
          summary: '1 sensitive pattern',
          actionable: true,
          items: [
            { label: 'API_KEY pattern', line: 15, description: 'Potential API key exposure' }
          ]
        }
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(issueWithSensitiveDetails);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('API_KEY pattern');
    });

    it('should format validation enhanced details', async () => {
      const issueWithValidationDetails = {
        ruleId: 'validation-check',
        message: 'Validation failed',
        file: '/path/to/file.ts',
        line: 20,
        column: 1,
        severity: 'error',
        category: 'validation',
        fixable: false,
        enhancedDetails: {
          type: 'validation' as const,
          summary: '1 validation issue',
          actionable: true,
          items: [
            { label: 'email', currentValue: 'invalid', expectedValue: 'valid email format' }
          ]
        }
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithValidationDetails);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('email');
    });

    it('should format generic enhanced details', async () => {
      const issueWithGenericDetails = {
        ruleId: 'generic-check',
        message: 'Generic issue',
        file: '/path/to/file.ts',
        line: 25,
        column: 1,
        severity: 'info',
        category: 'general',
        fixable: false,
        enhancedDetails: {
          type: 'generic' as const,
          summary: '2 details',
          actionable: false,
          items: [
            { label: 'item1', description: 'First item' },
            { label: 'item2', description: 'Second item' }
          ]
        }
      };

      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'aiIntegrationPreset') {return 'built-in';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(issueWithGenericDetails);

      const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0];
      expect(clipboardCall[0]).toContain('item1');
      expect(clipboardCall[0]).toContain('item2');
    });
  });

  describe('fix issue with AI providers', () => {
    const mockIssueContext = {
      ruleId: 'test-rule',
      message: 'Test issue',
      file: '/path/to/file.ts',
      line: 10,
      column: 5,
      severity: 'error',
      category: 'test',
      fixable: true
    };

    it('should use Cursor for fix when preset is cursor', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'cursor';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'cursor.composer.edit',
        expect.any(Object)
      );
    });

    it('should use Copilot for fix when preset is github-copilot', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'github-copilot';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'github.copilot.generate',
        expect.any(Object)
      );
    });

    it('should use Amazon Q for fix when preset is amazon-q', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'amazon-q';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'aws.amazonq.fixCode',
        expect.any(Object)
      );
    });
  });

  describe('fix issue group with AI providers', () => {
    const mockGroupContext = {
      groupKey: 'test-group',
      issues: [
        {
          ruleId: 'test-rule',
          message: 'Test issue',
          file: '/path/to/file.ts',
          line: 10,
          column: 5,
          severity: 'error',
          category: 'test',
          fixable: true
        }
      ],
      groupType: 'rule' as const
    };

    it('should use Cursor for group fix', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'cursor';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'cursor.composer.chat',
        expect.any(Object)
      );
    });

    it('should use Copilot for group fix', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'github-copilot';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'workbench.panel.chat.view.copilot.open'
      );
    });

    it('should use Amazon Q for group fix', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'enableCommandDelegation') {return true;}
          if (key === 'aiIntegrationPreset') {return 'amazon-q';}
          return undefined;
        }),
        update: jest.fn()
      };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssueGroup(mockGroupContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'aws.amazonq.chat.open'
      );
    });
  });

  describe('dispose', () => {
    it('should dispose all disposables', () => {
      registry = new CommandDelegationRegistry(mockContext);
      
      expect(() => registry.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      registry = new CommandDelegationRegistry(mockContext);
      
      registry.dispose();
      expect(() => registry.dispose()).not.toThrow();
    });
  });

  describe('extension change watching', () => {
    it('should rediscover providers when extensions change', () => {
      const newExtension = {
        id: 'new.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueExplainer': {
              id: 'new-explainer',
              displayName: 'New Explainer',
              command: 'new.explainIssue'
            }
          }
        }
      };

      registry = new CommandDelegationRegistry(mockContext);
      
      // Initially no explainers
      expect(registry.getAvailableExplainers()).toHaveLength(0);
      
      // Add extension and trigger change
      mockExtensions.all = [newExtension];
      const calls = mockExtensions.onDidChange.mock.calls;
      if (calls.length > 0 && calls[0] && calls[0][0]) {
        const changeCallback = calls[0][0] as () => void;
        changeCallback();
        
        // Should have discovered new explainer
        expect(registry.getAvailableExplainers()).toHaveLength(1);
      }
    });
  });
}); 