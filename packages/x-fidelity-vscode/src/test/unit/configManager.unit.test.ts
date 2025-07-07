// Jest unit test for ConfigManager
import { ConfigManager } from '../../configuration/configManager';
import { mockExtensionContext, workspace, resetMockConfigStore } from '../mocks/vscode.mock';

// Mock @x-fidelity/core since we're unit testing
jest.mock('@x-fidelity/core', () => ({
  ConfigManager: {
    getConfig: jest.fn().mockResolvedValue({
      archetype: { name: 'test-archetype' },
      rules: [],
      exemptions: []
    })
  }
}));

describe('ConfigManager Unit Tests', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockConfigStore();
    configManager = ConfigManager.getInstance(mockExtensionContext);
  });

  afterEach(() => {
    ConfigManager.resetInstance();
  });

  test('should create singleton instance', () => {
    const instance1 = ConfigManager.getInstance(mockExtensionContext);
    const instance2 = ConfigManager.getInstance(mockExtensionContext);
    
    expect(instance1).toBe(instance2);
  });

  test('should have default configuration', () => {
    const config = configManager.getConfig();
    
    expect(config).toBeDefined();
    expect(config.archetype).toBe('node-fullstack');
    expect(config.runInterval).toBe(0); // DISABLED for performance
    expect(config.autoAnalyzeOnSave).toBe(false);
  });

  test('should call workspace.getConfiguration with correct parameters', async () => {
    const newConfig = {
      archetype: 'java-microservice',
      runInterval: 600000,
      autoAnalyzeOnSave: true
    };

    await configManager.updateConfig(newConfig);
    
    // Verify that workspace.getConfiguration was called
    expect(workspace.getConfiguration).toHaveBeenCalledWith('xfidelity');
    
    // Verify that update was called for each config key (with ConfigurationTarget.Workspace = 2)
    const mockConfigObject = (workspace.getConfiguration as jest.Mock).mock.results[0].value;
    expect(mockConfigObject.update).toHaveBeenCalledWith('archetype', 'java-microservice', 2);
    expect(mockConfigObject.update).toHaveBeenCalledWith('runInterval', 600000, 2);
    expect(mockConfigObject.update).toHaveBeenCalledWith('autoAnalyzeOnSave', true, 2);
  });

  test('should have configuration change event emitter', () => {
    expect(configManager.onConfigurationChanged).toBeDefined();
    expect(typeof configManager.onConfigurationChanged.fire).toBe('function');
  });
}); 