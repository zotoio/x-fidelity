import { DeveloperExperienceManager } from './developerExperienceManager';
import { ILogger, DeveloperExperienceConfig, InteractiveTutorial } from '@x-fidelity/types';

// Mock logger
const mockLogger: ILogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
  setLevel: jest.fn(),
  getLevel: jest.fn().mockReturnValue('info'),
  isLevelEnabled: jest.fn().mockReturnValue(true),
  dispose: jest.fn()
};

describe('DeveloperExperienceManager', () => {
  let devManager: DeveloperExperienceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    devManager = new DeveloperExperienceManager(mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new DeveloperExperienceManager(mockLogger);
      expect(manager).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Developer Experience Manager initialized', {
        config: expect.objectContaining({
          enableConfigurationWizard: true,
          showConfigurationHints: true,
          enableAdvancedDebugging: true
        })
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<DeveloperExperienceConfig> = {
        enableConfigurationWizard: false,
        showPerformanceMetrics: false,
        enableRuleDevelopmentMode: true
      };

      const manager = new DeveloperExperienceManager(mockLogger, customConfig);
      expect(manager).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Developer Experience Manager initialized', {
        config: expect.objectContaining({
          enableConfigurationWizard: false,
          showPerformanceMetrics: false,
          enableRuleDevelopmentMode: true
        })
      });
    });
  });

  describe('Configuration Wizard', () => {
    it('should start configuration wizard successfully', async () => {
      const context = { archetype: 'node-fullstack' };
      const steps = await devManager.startConfigurationWizard(context);

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('category');
    });

    it('should throw error when configuration wizard is disabled', async () => {
      const disabledManager = new DeveloperExperienceManager(mockLogger, {
        enableConfigurationWizard: false
      });

      await expect(disabledManager.startConfigurationWizard()).rejects.toThrow(
        'Configuration wizard is disabled'
      );
    });

    it('should get configuration steps', async () => {
      const steps = await devManager.getConfigurationSteps();

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      
      const basicStep = steps.find(step => step.id === 'basic-setup');
      expect(basicStep).toBeDefined();
      expect(basicStep?.category).toBe('archetype');
    });

    it('should validate configuration step', async () => {
      const result = await devManager.validateConfigurationStep('basic-setup', {
        archetype: 'node-fullstack'
      });

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('hints');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.hints)).toBe(true);
    });

    it('should get configuration hints for step', async () => {
      const hints = await devManager.getConfigurationHints('basic-setup', {
        archetype: 'node-fullstack'
      });

      expect(Array.isArray(hints)).toBe(true);
      if (hints.length > 0) {
        expect(hints[0]).toHaveProperty('type');
        expect(hints[0]).toHaveProperty('message');
      }
    });

    it('should get configuration examples for step', async () => {
      const examples = await devManager.getConfigurationExamples('basic-setup');

      expect(Array.isArray(examples)).toBe(true);
      if (examples.length > 0) {
        expect(examples[0]).toHaveProperty('title');
        expect(examples[0]).toHaveProperty('description');
        expect(examples[0]).toHaveProperty('value');
        expect(examples[0]).toHaveProperty('useCase');
      }
    });
  });

  describe('Onboarding', () => {
    it('should start onboarding successfully', async () => {
      const steps = await devManager.startOnboarding();

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('tasks');
    });

    it('should throw error when onboarding wizard is disabled', async () => {
      const disabledManager = new DeveloperExperienceManager(mockLogger, {
        enableOnboardingWizard: false
      });

      await expect(disabledManager.startOnboarding()).rejects.toThrow(
        'Onboarding wizard is disabled'
      );
    });

    it('should get onboarding steps', async () => {
      const steps = await devManager.getOnboardingSteps();

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      
      const installStep = steps.find(step => step.id === 'installation');
      expect(installStep).toBeDefined();
      expect(installStep?.tasks.length).toBeGreaterThan(0);
    });

    it('should complete onboarding task', async () => {
      const completed = await devManager.completeOnboardingTask('installation', 'install-cli');

      expect(typeof completed).toBe('boolean');
    });

    it('should get onboarding progress', async () => {
      // Complete a task first
      await devManager.completeOnboardingTask('installation', 'install-cli');

      const progress = await devManager.getOnboardingProgress();

      expect(progress).toHaveProperty('totalSteps');
      expect(progress).toHaveProperty('completedSteps');
      expect(typeof progress.totalSteps).toBe('number');
      expect(typeof progress.completedSteps).toBe('number');
      expect(progress.totalSteps).toBeGreaterThan(0);
    });
  });

  describe('Interactive Tutorials', () => {
    it('should get available tutorials when enabled', async () => {
      const tutorials = await devManager.getAvailableTutorials();

      expect(Array.isArray(tutorials)).toBe(true);
      expect(tutorials.length).toBeGreaterThan(0);
      
      const gettingStarted = tutorials.find(t => t.id === 'getting-started');
      expect(gettingStarted).toBeDefined();
      expect(gettingStarted?.title).toBe('Getting Started with X-Fidelity');
      expect(gettingStarted?.difficulty).toBe('beginner');
    });

    it('should return empty tutorials when disabled', async () => {
      const disabledManager = new DeveloperExperienceManager(mockLogger, {
        enableInteractiveTutorials: false
      });

      const tutorials = await disabledManager.getAvailableTutorials();
      expect(tutorials).toEqual([]);
    });

    it('should start tutorial successfully', async () => {
      const tutorial = await devManager.startTutorial('getting-started');

      expect(tutorial).toBeDefined();
      expect(tutorial.id).toBe('getting-started');
      expect(tutorial.title).toBe('Getting Started with X-Fidelity');
      expect(Array.isArray(tutorial.steps)).toBe(true);
    });

    it('should throw error for non-existent tutorial', async () => {
      await expect(devManager.startTutorial('non-existent-tutorial')).rejects.toThrow(
        'Tutorial not found: non-existent-tutorial'
      );
    });
  });

  describe('Performance Profiling', () => {
    it('should start performance profiling', async () => {
      const analysisId = 'test-analysis-123';
      await devManager.startPerformanceProfiling(analysisId);

      // Should not throw and should handle the profiling start
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should record performance phase', async () => {
      await devManager.startPerformanceProfiling('test-analysis');
      await devManager.recordPerformancePhase('parsing', 150, { filesProcessed: 10 });

      // Should not throw and should handle the phase recording
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should skip profiling when disabled', async () => {
      const disabledManager = new DeveloperExperienceManager(mockLogger, {
        showPerformanceMetrics: false
      });

      await disabledManager.startPerformanceProfiling('test-analysis');
      
      // Should not start profiling when disabled
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Performance profiling started')
      );
    });

    it('should generate performance report', async () => {
      await devManager.startPerformanceProfiling('test-analysis');
      await devManager.recordPerformancePhase('parsing', 150);
      
      const report = await devManager.generatePerformanceReport();

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('Rule Development', () => {
    it('should start rule development', async () => {
      // Use a manager with rule development enabled
      const ruleDevManager = new DeveloperExperienceManager(mockLogger, {
        enableRuleDevelopmentMode: true
      });
      
      const ruleId = 'test-rule';
      const context = await ruleDevManager.startRuleDevelopment(ruleId);

      expect(context).toBeDefined();
      expect(context.ruleId).toBe(ruleId);
      expect(context.ruleName).toBe(`Rule ${ruleId}`);
      expect(Array.isArray(context.testCases)).toBe(true);
    });

    it('should test rule with valid input', async () => {
      // Use a manager with rule development enabled
      const ruleDevManager = new DeveloperExperienceManager(mockLogger, {
        enableRuleDevelopmentMode: true
      });
      
      const ruleId = 'test-rule';
      await ruleDevManager.startRuleDevelopment(ruleId);
      
      const testInput = { testData: 'sample' };
      const result = await ruleDevManager.testRule(ruleId, testInput);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('trace');
      expect(typeof result.success).toBe('boolean');
    });

    it('should validate rule content', async () => {
      const ruleContent = {
        name: 'test-rule',
        facts: ['testFact'],
        condition: 'testFact > 0'
      };

      const validation = await devManager.validateRule(ruleContent);

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Debug Session', () => {
    it('should start debug session', async () => {
      const analysisId = 'debug-session-123';
      const workspaceRoot = '/test/workspace';
      const archetype = 'node-fullstack';

      await devManager.startDebugSession(analysisId, workspaceRoot, archetype);

      const debugContext = await devManager.getDebugContext();
      expect(debugContext).toBeDefined();
      expect(debugContext?.analysisId).toBe(analysisId);
      expect(debugContext?.workspaceRoot).toBe(workspaceRoot);
      expect(debugContext?.archetype).toBe(archetype);
    });

    it('should record rule execution', async () => {
      await devManager.startDebugSession('test', '/workspace', 'node-fullstack');

      const trace = {
        ruleId: 'test-rule',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        facts: [],
        result: { success: true },
        performance: {
          memoryUsage: { heapUsed: 1000000, heapTotal: 2000000 },
          cpuUsage: 50
        }
      };

      await devManager.recordRuleExecution(trace);

      const debugContext = await devManager.getDebugContext();
      expect(debugContext?.ruleExecutionTrace).toContain(trace);
    });

    it('should update plugin status', async () => {
      await devManager.startDebugSession('test', '/workspace', 'node-fullstack');

      const plugins = [
        {
          name: 'test-plugin',
          version: '1.0.0',
          loaded: true,
          error: null,
          loadTime: 50
        }
      ];

      await devManager.updatePluginStatus(plugins);

      const debugContext = await devManager.getDebugContext();
      expect(debugContext?.pluginStatus).toEqual(plugins);
    });

    it('should export debug report', async () => {
      await devManager.startDebugSession('test', '/workspace', 'node-fullstack');
      
      const report = await devManager.exportDebugReport();

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      
      // Parse JSON to verify structure
      const parsedReport = JSON.parse(report);
      expect(parsedReport).toHaveProperty('session');
      expect(parsedReport).toHaveProperty('insights');
      expect(parsedReport).toHaveProperty('recommendations');
    });

    it('should handle null debug context', async () => {
      const debugContext = await devManager.getDebugContext();
      expect(debugContext).toBeNull();

      // Should throw error when no debug session is active
      await expect(devManager.exportDebugReport()).rejects.toThrow('No active debug session');
    });
  });

  describe('Insights Generation', () => {
    it('should generate insights', async () => {
      await devManager.startDebugSession('test', '/workspace', 'node-fullstack');
      await devManager.startPerformanceProfiling('test');
      
      const insights = await devManager.generateInsights();

      expect(Array.isArray(insights)).toBe(true);
      if (insights.length > 0) {
        expect(insights[0]).toHaveProperty('type');
        expect(insights[0]).toHaveProperty('title');
        expect(insights[0]).toHaveProperty('description');
        expect(insights[0]).toHaveProperty('severity');
      }
    });
  });

  describe('Event System', () => {
    it('should emit and handle events', () => {
      const eventHandler = jest.fn();
      devManager.onEvent('configuration-wizard-started', eventHandler);

      // Trigger an event by starting the configuration wizard
      devManager.startConfigurationWizard();

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'configuration-wizard-started',
          timestamp: expect.any(Number),
          correlationId: expect.any(String)
        })
      );
    });

    it('should handle multiple event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      devManager.onEvent('tutorial-started', handler1);
      devManager.onEvent('tutorial-started', handler2);

      devManager.startTutorial('getting-started');

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in tutorial start', async () => {
      // Try to start a tutorial that doesn't exist
      await expect(devManager.startTutorial('invalid-tutorial')).rejects.toThrow();
      
      // But the manager should still be functional
      const tutorials = await devManager.getAvailableTutorials();
      expect(Array.isArray(tutorials)).toBe(true);
    });

    it('should handle configuration validation errors', async () => {
      const result = await devManager.validateConfigurationStep('invalid-step', {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full onboarding workflow', async () => {
      // Start onboarding
      const steps = await devManager.startOnboarding();
      expect(steps.length).toBeGreaterThan(0);

      // Complete first task
      const firstStep = steps[0];
      const firstTask = firstStep.tasks[0];
      const completed = await devManager.completeOnboardingTask(firstStep.id, firstTask.id);
      expect(completed).toBe(true);

      // Check progress
      const progress = await devManager.getOnboardingProgress();
      expect(progress.completedSteps).toBeGreaterThan(0);
    });

    it('should complete configuration wizard workflow', async () => {
      // Start wizard
      const steps = await devManager.startConfigurationWizard({ archetype: 'node-fullstack' });
      expect(steps.length).toBeGreaterThan(0);

      // Validate a step
      const firstStep = steps[0];
      const validation = await devManager.validateConfigurationStep(firstStep.id, {
        archetype: 'node-fullstack'
      });
      expect(validation).toHaveProperty('valid');

      // Get hints and examples
      const hints = await devManager.getConfigurationHints(firstStep.id);
      const examples = await devManager.getConfigurationExamples(firstStep.id);
      expect(Array.isArray(hints)).toBe(true);
      expect(Array.isArray(examples)).toBe(true);
    });
  });
}); 