/**
 * Enhanced Developer Experience Manager
 * Provides interactive configuration guides, debugging tools, and developer onboarding
 */

import { ILogger } from '@x-fidelity/types';
import { standardErrorHandler } from './standardErrorHandler';
import {
  DeveloperExperienceConfig,
  OnboardingStep,
  OnboardingTask,
  OnboardingResource,
  ConfigurationStep,
  ConfigurationCategory,
  ConfigurationValidation,
  ConfigurationHint,
  ConfigurationExample,
  DeveloperDebugContext,
  DeveloperPerformanceMetrics,
  PerformancePhase,
  MemoryUsage,
  FileProcessingStats,
  RuleExecutionTrace,
  DeveloperFactResult,
  OperatorResult,
  PluginDebugInfo,
  EnvironmentInfo,
  RuleDevelopmentContext,
  RuleTestCase,
  RuleValidationResult,
  InteractiveTutorial,
  TutorialStep,
  DeveloperInsight,
  DeveloperExperienceEvent,
  DeveloperExperienceEventType
} from '@x-fidelity/types';

// Types are now imported from @x-fidelity/types

export class DeveloperExperienceManager {
  private logger: ILogger;
  private config: DeveloperExperienceConfig;
  private debugContext?: DeveloperDebugContext;
  private performanceProfiler: PerformanceProfiler;
  private configurationWizard: ConfigurationWizard;
  private onboardingManager: OnboardingManager;
  private rulePlayground: RulePlayground;
  private insightEngine: InsightEngine;
  private eventEmitter: DeveloperExperienceEventEmitter;

  constructor(
    logger: ILogger,
    config: Partial<DeveloperExperienceConfig> = {}
  ) {
    this.logger = logger;
    this.config = {
      enableConfigurationWizard: true,
      showConfigurationHints: true,
      validateConfigurationOnChange: true,
      enableAdvancedDebugging: true,
      showPerformanceMetrics: true,
      enableRuleDebugging: true,
      showAnalysisTimeline: true,
      enableOnboardingWizard: true,
      showWelcomeGuide: true,
      enableInteractiveTutorials: true,
      enableRuleDevelopmentMode: false,
      showRuleTestingTools: false,
      enableRulePlayground: false,
      enableAdvancedIDEFeatures: true,
      showInlineRuleDocumentation: true,
      enableQuickFixes: true,
      showCodeLens: true,
      ...config
    };

    this.performanceProfiler = new PerformanceProfiler(logger);
    this.configurationWizard = new ConfigurationWizard(logger, this.config);
    this.onboardingManager = new OnboardingManager(logger, this.config);
    this.rulePlayground = new RulePlayground(logger, this.config);
    this.insightEngine = new InsightEngine(logger);
    this.eventEmitter = new DeveloperExperienceEventEmitter(logger);

    this.logger.info('Developer Experience Manager initialized', {
      config: this.config
    });
  }

  // Configuration Wizard
  async startConfigurationWizard(context?: Record<string, any>): Promise<ConfigurationStep[]> {
    if (!this.config.enableConfigurationWizard) {
      throw new Error('Configuration wizard is disabled');
    }

    this.emitEvent('configuration-wizard-started', { context });
    return this.configurationWizard.start(context);
  }

  async getConfigurationSteps(): Promise<ConfigurationStep[]> {
    return this.configurationWizard.getSteps();
  }

  async validateConfigurationStep(stepId: string, value: any): Promise<{ valid: boolean; errors: string[]; hints: ConfigurationHint[] }> {
    return this.configurationWizard.validateStep(stepId, value);
  }

  async getConfigurationHints(stepId: string, context?: Record<string, any>): Promise<ConfigurationHint[]> {
    return this.configurationWizard.getHints(stepId, context);
  }

  async getConfigurationExamples(stepId: string): Promise<ConfigurationExample[]> {
    return this.configurationWizard.getExamples(stepId);
  }

  // Onboarding
  async startOnboarding(): Promise<OnboardingStep[]> {
    if (!this.config.enableOnboardingWizard) {
      throw new Error('Onboarding wizard is disabled');
    }

    this.emitEvent('onboarding-started', {});
    return this.onboardingManager.start();
  }

  async getOnboardingSteps(): Promise<OnboardingStep[]> {
    return this.onboardingManager.getSteps();
  }

  async completeOnboardingTask(stepId: string, taskId: string): Promise<boolean> {
    const completed = await this.onboardingManager.completeTask(stepId, taskId);
    if (completed) {
      this.emitEvent('onboarding-step-completed', { stepId, taskId });
    }
    return completed;
  }

  async getOnboardingProgress(): Promise<{ totalSteps: number; completedSteps: number; currentStep?: OnboardingStep }> {
    return this.onboardingManager.getProgress();
  }

  // Interactive Tutorials
  async getAvailableTutorials(): Promise<InteractiveTutorial[]> {
    if (!this.config.enableInteractiveTutorials) {
      return [];
    }

    return [
      {
        id: 'getting-started',
        title: 'Getting Started with X-Fidelity',
        description: 'Learn the basics of X-Fidelity configuration and usage',
        category: 'getting-started',
        difficulty: 'beginner',
        estimatedTime: 15,
        steps: await this.createGettingStartedTutorial()
      },
      {
        id: 'rule-configuration',
        title: 'Configuring Rules and Archetypes',
        description: 'Master rule configuration and archetype customization',
        category: 'configuration',
        difficulty: 'intermediate',
        estimatedTime: 25,
        steps: await this.createRuleConfigurationTutorial()
      },
      {
        id: 'plugin-development',
        title: 'Developing Custom Plugins',
        description: 'Create and deploy custom X-Fidelity plugins',
        category: 'plugins',
        difficulty: 'advanced',
        estimatedTime: 45,
        steps: await this.createPluginDevelopmentTutorial()
      }
    ];
  }

  async startTutorial(tutorialId: string): Promise<InteractiveTutorial> {
    this.emitEvent('tutorial-started', { tutorialId });
    const tutorials = await this.getAvailableTutorials();
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${tutorialId}`);
    }
    return tutorial;
  }

  // Performance Profiling
  async startPerformanceProfiling(analysisId: string): Promise<void> {
    if (!this.config.showPerformanceMetrics) {
      return;
    }

    await this.performanceProfiler.start(analysisId);
  }

  async recordPerformancePhase(name: string, duration: number, details?: Record<string, any>): Promise<void> {
    await this.performanceProfiler.recordPhase(name, duration, details);
  }

  async getPerformanceMetrics(): Promise<DeveloperPerformanceMetrics | null> {
    return this.performanceProfiler.getMetrics();
  }

  async generatePerformanceReport(): Promise<string> {
    return this.performanceProfiler.generateReport();
  }

  // Rule Development & Testing
  async startRuleDevelopment(ruleId: string): Promise<RuleDevelopmentContext> {
    if (!this.config.enableRuleDevelopmentMode) {
      throw new Error('Rule development mode is disabled');
    }

    this.emitEvent('rule-development-started', { ruleId });
    return this.rulePlayground.startDevelopment(ruleId);
  }

  async testRule(ruleId: string, testInput: any): Promise<{ success: boolean; result: any; trace: RuleExecutionTrace }> {
    this.emitEvent('rule-test-executed', { ruleId, testInput });
    return this.rulePlayground.testRule(ruleId, testInput);
  }

  async validateRule(ruleContent: any): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return this.rulePlayground.validateRule(ruleContent);
  }

  // Debug Context Management
  async startDebugSession(analysisId: string, workspaceRoot: string, archetype: string): Promise<void> {
    if (!this.config.enableAdvancedDebugging) {
      return;
    }

    this.debugContext = {
      analysisId,
      timestamp: Date.now(),
      workspaceRoot,
      archetype,
      performanceMetrics: await this.performanceProfiler.getMetrics() || this.createEmptyPerformanceMetrics(),
      ruleExecutionTrace: [],
      pluginStatus: [],
      configurationSnapshot: {},
      environment: await this.collectEnvironmentInfo()
    };

    this.emitEvent('debug-session-started', { analysisId });
    this.logger.debug('Debug session started', { analysisId, workspaceRoot, archetype });
  }

  async recordRuleExecution(trace: RuleExecutionTrace): Promise<void> {
    if (!this.debugContext) return;
    this.debugContext.ruleExecutionTrace.push(trace);
  }

  async updatePluginStatus(plugins: PluginDebugInfo[]): Promise<void> {
    if (!this.debugContext) return;
    this.debugContext.pluginStatus = plugins;
  }

  async getDebugContext(): Promise<DeveloperDebugContext | null> {
    return this.debugContext || null;
  }

  async exportDebugReport(): Promise<string> {
    if (!this.debugContext) {
      throw new Error('No active debug session');
    }

    const report = {
      session: this.debugContext,
      insights: await this.insightEngine.generateInsights(this.debugContext),
      recommendations: await this.generateRecommendations()
    };

    return JSON.stringify(report, null, 2);
  }

  // Developer Insights
  async generateInsights(): Promise<DeveloperInsight[]> {
    const context = this.debugContext;
    const performanceMetrics = await this.performanceProfiler.getMetrics();
    
    return this.insightEngine.generateInsights(context, performanceMetrics);
  }

  // Event Handling
  private emitEvent(type: DeveloperExperienceEventType, data: any): void {
    this.eventEmitter.emit(type, data);
  }

  onEvent(type: DeveloperExperienceEventType, handler: (event: DeveloperExperienceEvent) => void): void {
    this.eventEmitter.on(type, handler);
  }

  // Helper Methods
  private async createGettingStartedTutorial() {
    return [
      {
        id: 'welcome',
        title: 'Welcome to X-Fidelity',
        description: 'Introduction to X-Fidelity and its capabilities',
        type: 'explanation' as const,
        content: `# Welcome to X-Fidelity!\n\nX-Fidelity is a powerful tool for maintaining code quality and architectural consistency...`
      },
      {
        id: 'first-analysis',
        title: 'Run Your First Analysis',
        description: 'Execute your first X-Fidelity analysis',
        type: 'action' as const,
        content: `Let's run your first analysis to see X-Fidelity in action.`,
        action: {
          type: 'command' as const,
          details: { command: 'xfidelity.runAnalysis' }
        }
      }
    ];
  }

  private async createRuleConfigurationTutorial() {
    return [
      {
        id: 'understanding-rules',
        title: 'Understanding Rules',
        description: 'Learn how X-Fidelity rules work',
        type: 'explanation' as const,
        content: `# Understanding X-Fidelity Rules\n\nRules are the core of X-Fidelity's analysis engine...`
      }
    ];
  }

  private async createPluginDevelopmentTutorial() {
    return [
      {
        id: 'plugin-basics',
        title: 'Plugin Development Basics',
        description: 'Learn the fundamentals of plugin development',
        type: 'explanation' as const,
        content: `# X-Fidelity Plugin Development\n\nPlugins extend X-Fidelity's capabilities...`
      }
    ];
  }

  private createEmptyPerformanceMetrics(): DeveloperPerformanceMetrics {
    return {
      totalDuration: 0,
      phases: [],
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        peak: 0
      },
      fileProcessingStats: {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        errorFiles: 0,
        averageProcessingTime: 0,
        largestFile: {
          path: '',
          size: 0,
          processingTime: 0
        }
      }
    };
  }

  private async collectEnvironmentInfo(): Promise<EnvironmentInfo> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      vscodeVersion: process.env.VSCODE_VERSION,
      extensionVersion: process.env.EXTENSION_VERSION,
      workspaceType: 'single' // This would be determined based on workspace
    };
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (this.debugContext) {
      const { performanceMetrics, ruleExecutionTrace } = this.debugContext;
      
      // Performance recommendations
      if (performanceMetrics.totalDuration > 30000) {
        recommendations.push('Consider optimizing analysis performance - current duration exceeds 30 seconds');
      }
      
      // Rule execution recommendations
      const slowRules = ruleExecutionTrace.filter(trace => trace.duration > 5000);
      if (slowRules.length > 0) {
        recommendations.push(`Optimize slow rules: ${slowRules.map(r => r.ruleName).join(', ')}`);
      }
    }
    
    return recommendations;
  }
}

// Supporting Classes

class PerformanceProfiler {
  private logger: ILogger;
  private startTime?: number;
  private phases: PerformancePhase[] = [];
  private analysisId?: string;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async start(analysisId: string): Promise<void> {
    this.analysisId = analysisId;
    this.startTime = Date.now();
    this.phases = [];
    this.logger.debug('Performance profiling started', { analysisId });
  }

  async recordPhase(name: string, duration: number, details?: Record<string, any>): Promise<void> {
    const now = Date.now();
    const phase: PerformancePhase = {
      name,
      duration,
      startTime: now - duration,
      endTime: now,
      memoryDelta: 0,
      details
    };
    
    this.phases.push(phase);
    this.logger.debug('Performance phase recorded', { name, duration });
  }

  async getMetrics(): Promise<DeveloperPerformanceMetrics | null> {
    if (!this.startTime) return null;

    const memoryUsage = process.memoryUsage();
    
    return {
      totalDuration: Date.now() - this.startTime,
      phases: this.phases,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
        peak: memoryUsage.heapUsed // Simplified
      },
      fileProcessingStats: {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        errorFiles: 0,
        averageProcessingTime: 0,
        largestFile: {
          path: '',
          size: 0,
          processingTime: 0
        }
      }
    };
  }

  async generateReport(): Promise<string> {
    const metrics = await this.getMetrics();
    if (!metrics) return 'No performance data available';

    const report = [
      '# Performance Analysis Report',
      `**Total Duration:** ${metrics.totalDuration}ms`,
      `**Memory Usage:** ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
      '',
      '## Phase Breakdown',
      ...metrics.phases.map(phase => 
        `- **${phase.name}:** ${phase.duration}ms`
      )
    ];

    return report.join('\n');
  }
}

class ConfigurationWizard {
  private logger: ILogger;
  private config: DeveloperExperienceConfig;

  constructor(logger: ILogger, config: DeveloperExperienceConfig) {
    this.logger = logger;
    this.config = config;
  }

  async start(context?: Record<string, any>): Promise<ConfigurationStep[]> {
    this.logger.info('Configuration wizard started', { context });
    return this.getSteps();
  }

  async getSteps(): Promise<ConfigurationStep[]> {
    return [
      {
        id: 'archetype',
        title: 'Select Project Archetype',
        description: 'Choose the archetype that best matches your project',
        category: 'archetype',
        required: true,
        validation: {
          type: 'enum',
          validator: ['node-fullstack', 'java-microservice', 'python-service'],
          message: 'Please select a valid archetype',
          severity: 'error'
        },
        hints: [
          {
            type: 'tip',
            message: 'Choose the archetype that most closely matches your technology stack'
          }
        ],
        examples: [
          {
            title: 'Node.js Full-Stack',
            description: 'For Node.js applications with both frontend and backend',
            value: 'node-fullstack',
            useCase: 'Express.js with React/Vue frontend'
          }
        ]
      },
      {
        id: 'rules',
        title: 'Configure Rules',
        description: 'Select and configure the rules for your project',
        category: 'rules',
        required: false,
        dependencies: ['archetype']
      }
    ];
  }

  async validateStep(stepId: string, value: any): Promise<{ valid: boolean; errors: string[]; hints: ConfigurationHint[] }> {
    const steps = await this.getSteps();
    const step = steps.find(s => s.id === stepId);
    
    if (!step) {
      return { valid: false, errors: ['Step not found'], hints: [] };
    }

    const errors: string[] = [];
    const hints: ConfigurationHint[] = step.hints || [];

    if (step.validation) {
      const { validation } = step;
      
      if (validation.type === 'enum' && Array.isArray(validation.validator)) {
        if (!validation.validator.includes(value)) {
          errors.push(validation.message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      hints
    };
  }

  async getHints(stepId: string, context?: Record<string, any>): Promise<ConfigurationHint[]> {
    const steps = await this.getSteps();
    const step = steps.find(s => s.id === stepId);
    return step?.hints || [];
  }

  async getExamples(stepId: string): Promise<ConfigurationExample[]> {
    const steps = await this.getSteps();
    const step = steps.find(s => s.id === stepId);
    return step?.examples || [];
  }
}

class OnboardingManager {
  private logger: ILogger;
  private config: DeveloperExperienceConfig;
  private progress: Map<string, boolean> = new Map();

  constructor(logger: ILogger, config: DeveloperExperienceConfig) {
    this.logger = logger;
    this.config = config;
  }

  async start(): Promise<OnboardingStep[]> {
    this.logger.info('Onboarding started');
    return this.getSteps();
  }

  async getSteps(): Promise<OnboardingStep[]> {
    return [
      {
        id: 'welcome',
        title: 'Welcome to X-Fidelity',
        description: 'Get familiar with X-Fidelity basics',
        type: 'tutorial',
        estimatedTime: 5,
        tasks: [
          {
            id: 'read-overview',
            title: 'Read Overview',
            description: 'Understand what X-Fidelity does',
            type: 'action'
          }
        ]
      },
      {
        id: 'configuration',
        title: 'Configure Your Project',
        description: 'Set up X-Fidelity for your project',
        type: 'configuration',
        estimatedTime: 10,
        tasks: [
          {
            id: 'select-archetype',
            title: 'Select Archetype',
            description: 'Choose the right archetype for your project',
            type: 'configuration'
          }
        ]
      }
    ];
  }

  async completeTask(stepId: string, taskId: string): Promise<boolean> {
    const key = `${stepId}:${taskId}`;
    this.progress.set(key, true);
    this.logger.debug('Task completed', { stepId, taskId });
    return true;
  }

  async getProgress(): Promise<{ totalSteps: number; completedSteps: number; currentStep?: OnboardingStep }> {
    const steps = await this.getSteps();
    const totalTasks = steps.reduce((sum, step) => sum + step.tasks.length, 0);
    const completedTasks = Array.from(this.progress.values()).filter(Boolean).length;
    
    return {
      totalSteps: totalTasks,
      completedSteps: completedTasks,
      currentStep: steps.find(step => 
        step.tasks.some(task => !this.progress.get(`${step.id}:${task.id}`))
      )
    };
  }
}

class RulePlayground {
  private logger: ILogger;
  private config: DeveloperExperienceConfig;

  constructor(logger: ILogger, config: DeveloperExperienceConfig) {
    this.logger = logger;
    this.config = config;
  }

  async startDevelopment(ruleId: string): Promise<RuleDevelopmentContext> {
    this.logger.info('Rule development started', { ruleId });
    
    return {
      ruleId,
      ruleName: `Rule ${ruleId}`,
      ruleContent: {},
      testCases: [],
      executionHistory: [],
      validationResults: []
    };
  }

  async testRule(ruleId: string, testInput: any): Promise<{ success: boolean; result: any; trace: RuleExecutionTrace }> {
    const startTime = Date.now();
    const endTime = Date.now();
    
    const trace: RuleExecutionTrace = {
      ruleId,
      ruleName: `Rule ${ruleId}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      success: true,
      factResults: [],
      operatorResults: [],
      finalResult: true
    };

    return {
      success: true,
      result: testInput,
      trace
    };
  }

  async validateRule(ruleContent: any): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    // Basic validation logic
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ruleContent.name) {
      errors.push('Rule name is required');
    }

    if (!ruleContent.conditions) {
      errors.push('Rule conditions are required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

class InsightEngine {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async generateInsights(context?: DeveloperDebugContext, performanceMetrics?: DeveloperPerformanceMetrics | null): Promise<DeveloperInsight[]> {
    const insights: DeveloperInsight[] = [];

    // Performance insights
    if (performanceMetrics && performanceMetrics.totalDuration > 30000) {
      insights.push({
        type: 'performance',
        severity: 'high',
        title: 'Slow Analysis Performance',
        description: `Analysis took ${performanceMetrics.totalDuration}ms, which is longer than recommended`,
        impact: 'Reduced developer productivity due to slow feedback',
        recommendation: 'Consider optimizing rules or excluding large files',
        automatable: false
      });
    }

    // Rule insights
    if (context && context.ruleExecutionTrace.length > 0) {
      const failedRules = context.ruleExecutionTrace.filter(trace => !trace.success);
      if (failedRules.length > 0) {
        insights.push({
          type: 'maintenance',
          severity: 'medium',
          title: 'Rule Execution Failures',
          description: `${failedRules.length} rules failed during execution`,
          impact: 'Incomplete analysis results',
          recommendation: 'Review and fix failing rules',
          automatable: false,
          relatedRules: failedRules.map(r => r.ruleId)
        });
      }
    }

    return insights;
  }
}

class DeveloperExperienceEventEmitter {
  private logger: ILogger;
  private handlers: Map<DeveloperExperienceEventType, ((event: DeveloperExperienceEvent) => void)[]> = new Map();

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  emit(type: DeveloperExperienceEventType, data: any): void {
    const event: DeveloperExperienceEvent = {
      type,
      timestamp: Date.now(),
      data,
      correlationId: this.generateCorrelationId()
    };

    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Error in event handler', { type, error });
      }
    });

    this.logger.debug('Developer experience event emitted', { type, data });
  }

  on(type: DeveloperExperienceEventType, handler: (event: DeveloperExperienceEvent) => void): void {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  private generateCorrelationId(): string {
    return `dx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 