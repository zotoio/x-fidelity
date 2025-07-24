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
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() }))
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
        expect.stringContaining('Rule: test-rule'),
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
        if (key === 'commandProviders.explainIssue') {return 'built-in';}
        return undefined;
      });

      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Rule: test-rule'),
        expect.any(Object),
        'Configure Providers',
        'OK'
      );
    });

    it('should delegate to external extension when configured', async () => {
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
        },
        isActive: true
      };

      mockExtensions.all = [mockExtension];
      mockExtensions.getExtension.mockReturnValue(mockExtension as any);
      
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        if (key === 'commandProviders.explainIssue') {return 'test.extension';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'test.explainIssue',
        mockIssueContext
      );
    });

    it('should fall back to built-in when external extension fails', async () => {
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
        },
        isActive: true
      };

      mockExtensions.all = [mockExtension];
      mockExtensions.getExtension.mockReturnValue(mockExtension as any);
      mockCommands.executeCommand.mockRejectedValue(new Error('Command failed'));
      
      const mockConfig = { get: jest.fn(), update: jest.fn() };
      mockWorkspace.getConfiguration.mockReturnValue(mockConfig as any);
      
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enableCommandDelegation') {return true;}
        if (key === 'commandProviders.explainIssue') {return 'test.extension';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateExplainIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalled();
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Rule: test-rule'),
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

      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        'Rule test-rule does not have an automated fix available.'
      );
    });

    it('should delegate to external fixer when configured', async () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'test-fixer',
              displayName: 'Test Fixer',
              command: 'test.fixIssue',
              supportsBatch: false
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
        if (key === 'commandProviders.fixIssue') {return 'test.extension';}
        return undefined;
      });

      registry = new CommandDelegationRegistry(mockContext);
      await registry.delegateFixIssue(mockIssueContext);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'test.fixIssue',
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
        expect.stringContaining('Default batch fix implementation'),
        'Configure Providers',
        'OK'
      );
    });

    it('should delegate to batch-capable fixer', async () => {
      const mockExtension = {
        id: 'test.extension',
        packageJSON: {
          contributes: {
            'xfidelity.issueFixer': {
              id: 'test-fixer',
              displayName: 'Test Batch Fixer',
              command: 'test.fixIssueGroup',
              supportsBatch: true
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

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'test.fixIssueGroup',
        mockGroupContext
      );
    });
  });

  describe('configuration UI', () => {
    it('should show configuration options', async () => {
      const mockConfig = { get: jest.fn(), update: jest.fn() };
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
        'commandProviders.explainIssue',
        'built-in',
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
}); 