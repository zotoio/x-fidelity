/**
 * Developer Experience Types and Interfaces
 * Supports interactive configuration guides, debugging tools, and developer onboarding
 */

export interface DeveloperExperienceConfig {
  // Interactive Configuration
  enableConfigurationWizard: boolean;
  showConfigurationHints: boolean;
  validateConfigurationOnChange: boolean;
  
  // Debugging & Development Tools
  enableAdvancedDebugging: boolean;
  showPerformanceMetrics: boolean;
  enableRuleDebugging: boolean;
  showAnalysisTimeline: boolean;
  
  // Developer Onboarding
  enableOnboardingWizard: boolean;
  showWelcomeGuide: boolean;
  enableInteractiveTutorials: boolean;
  
  // Rule Development
  enableRuleDevelopmentMode: boolean;
  showRuleTestingTools: boolean;
  enableRulePlayground: boolean;
  
  // IDE Integration
  enableAdvancedIDEFeatures: boolean;
  showInlineRuleDocumentation: boolean;
  enableQuickFixes: boolean;
  showCodeLens: boolean;
}

export interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  category: ConfigurationCategory;
  required: boolean;
  dependencies?: string[];
  validation?: ConfigurationValidation;
  hints?: ConfigurationHint[];
  examples?: ConfigurationExample[];
}

export type ConfigurationCategory = 
  | 'archetype'
  | 'rules'
  | 'plugins'
  | 'performance'
  | 'output'
  | 'advanced';

export interface ConfigurationValidation {
  type: 'regex' | 'function' | 'schema' | 'enum';
  validator: string | ((value: any) => boolean) | string[];
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConfigurationHint {
  type: 'tip' | 'warning' | 'best-practice' | 'performance';
  message: string;
  learnMoreUrl?: string;
  conditions?: Record<string, any>;
}

export interface ConfigurationExample {
  title: string;
  description: string;
  value: any;
  useCase: string;
  tags?: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'setup' | 'configuration' | 'validation';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  tasks: OnboardingTask[];
  resources?: OnboardingResource[];
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'verification' | 'configuration';
  action?: string; // Command or action to execute
  verification?: (context: any) => Promise<boolean>;
  hints?: string[];
  completed?: boolean;
}

export interface OnboardingResource {
  type: 'documentation' | 'video' | 'example' | 'tool';
  title: string;
  url: string;
  description: string;
  duration?: number; // minutes for videos
}

export interface DeveloperDebugContext {
  // Analysis Context
  analysisId: string;
  timestamp: number;
  workspaceRoot: string;
  archetype: string;
  
  // Performance Metrics
  performanceMetrics: DeveloperPerformanceMetrics;
  
  // Rule Execution
  ruleExecutionTrace: RuleExecutionTrace[];
  
  // Plugin Information
  pluginStatus: PluginDebugInfo[];
  
  // Configuration State
  configurationSnapshot: Record<string, any>;
  
  // Environment Information
  environment: EnvironmentInfo;
}

export interface DeveloperPerformanceMetrics {
  totalDuration: number;
  phases: PerformancePhase[];
  memoryUsage: MemoryUsage;
  fileProcessingStats: FileProcessingStats;
}

export interface PerformancePhase {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryDelta: number;
  details?: Record<string, any>;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  peak: number;
}

export interface FileProcessingStats {
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  averageProcessingTime: number;
  largestFile: {
    path: string;
    size: number;
    processingTime: number;
  };
}

export interface RuleExecutionTrace {
  ruleId: string;
  ruleName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  factResults: DeveloperFactResult[];
  operatorResults: OperatorResult[];
  finalResult: boolean;
  metadata?: Record<string, any>;
}

export interface DeveloperFactResult {
  factName: string;
  duration: number;
  success: boolean;
  result: any;
  error?: string;
  cacheHit?: boolean;
}

export interface OperatorResult {
  operatorName: string;
  duration: number;
  success: boolean;
  result: boolean;
  error?: string;
  inputs: {
    factValue: any;
    expectedValue: any;
  };
}

export interface PluginDebugInfo {
  name: string;
  version: string;
  loaded: boolean;
  loadTime: number;
  error?: string;
  facts: string[];
  operators: string[];
  capabilities: string[];
}

export interface EnvironmentInfo {
  platform: string;
  nodeVersion: string;
  vscodeVersion?: string;
  extensionVersion?: string;
  workspaceType: 'single' | 'multi' | 'none';
  gitRepository?: {
    url: string;
    branch: string;
    commit: string;
  };
}

export interface RuleDevelopmentContext {
  ruleId: string;
  ruleName: string;
  ruleContent: any;
  testCases: RuleTestCase[];
  executionHistory: RuleExecutionTrace[];
  validationResults: RuleValidationResult[];
}

export interface RuleTestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedResult: boolean;
  actualResult?: boolean;
  passed?: boolean;
  error?: string;
  executionTime?: number;
}

export interface RuleValidationResult {
  type: 'syntax' | 'logic' | 'performance' | 'best-practice';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line: number;
    column: number;
    path?: string;
  };
  suggestion?: string;
  fixable?: boolean;
}

export interface InteractiveTutorial {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'configuration' | 'rules' | 'plugins' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  steps: TutorialStep[];
  resources?: OnboardingResource[];
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  type: 'explanation' | 'action' | 'verification' | 'practice';
  content: string; // Markdown content
  action?: {
    type: 'command' | 'configuration' | 'file-creation' | 'navigation';
    details: Record<string, any>;
  };
  verification?: {
    type: 'automatic' | 'manual' | 'interactive';
    validator?: (context: any) => Promise<boolean>;
    instructions?: string;
  };
  hints?: string[];
  nextSteps?: string[];
}

export interface DeveloperInsight {
  type: 'performance' | 'best-practice' | 'optimization' | 'maintenance';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  automatable: boolean;
  learnMoreUrl?: string;
  relatedRules?: string[];
}

export interface CodeLensProvider {
  ruleId: string;
  ruleName: string;
  line: number;
  column: number;
  title: string;
  command: string;
  arguments?: any[];
  tooltip?: string;
}

export interface QuickFixProvider {
  ruleId: string;
  issueId: string;
  title: string;
  description: string;
  kind: 'quickfix' | 'refactor' | 'source' | 'organize';
  edits: QuickFixEdit[];
  command?: string;
  arguments?: any[];
}

export interface QuickFixEdit {
  type: 'replace' | 'insert' | 'delete';
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

/**
 * Developer Experience Events
 */
export interface DeveloperExperienceEvent {
  type: DeveloperExperienceEventType;
  timestamp: number;
  data: any;
  correlationId?: string;
}

export type DeveloperExperienceEventType =
  | 'onboarding-started'
  | 'onboarding-completed'
  | 'onboarding-step-completed'
  | 'configuration-wizard-started'
  | 'configuration-wizard-completed'
  | 'tutorial-started'
  | 'tutorial-completed'
  | 'rule-development-started'
  | 'rule-test-executed'
  | 'performance-analysis-completed'
  | 'debug-session-started'
  | 'quick-fix-applied'
  | 'insight-generated';

/**
 * Developer Experience Metrics
 */
export interface DeveloperExperienceMetrics {
  onboardingMetrics: OnboardingMetrics;
  configurationMetrics: ConfigurationMetrics;
  debuggingMetrics: DebuggingMetrics;
  ruleDevelopmentMetrics: RuleDevelopmentMetrics;
}

export interface OnboardingMetrics {
  totalUsers: number;
  completionRate: number;
  averageCompletionTime: number;
  dropOffPoints: { stepId: string; dropOffRate: number }[];
  mostHelpfulSteps: { stepId: string; helpfulnessScore: number }[];
}

export interface ConfigurationMetrics {
  wizardUsageRate: number;
  configurationErrors: { type: string; count: number }[];
  mostCommonConfigurations: { archetype: string; usage: number }[];
  validationFailures: { rule: string; count: number }[];
}

export interface DebuggingMetrics {
  debugSessionCount: number;
  averageSessionDuration: number;
  mostDebugged: { ruleId: string; count: number }[];
  performanceIssues: { type: string; count: number }[];
}

export interface RuleDevelopmentMetrics {
  rulesCreated: number;
  averageTestCases: number;
  testSuccessRate: number;
  validationErrors: { type: string; count: number }[];
} 