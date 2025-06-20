/**
 * Interactive Configuration Wizard Panel
 * Provides step-by-step guidance for configuring X-Fidelity
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../../configuration/configManager';
import { VSCodeLogger } from '../../utils/vscodeLogger';

const logger = new VSCodeLogger('ConfigurationWizard');

// Local interfaces for the wizard
interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  category: 'archetype' | 'rules' | 'plugins' | 'performance' | 'output' | 'advanced';
  required: boolean;
  dependencies?: string[];
  validation?: ConfigurationValidation;
  hints?: ConfigurationHint[];
  examples?: ConfigurationExample[];
}

interface ConfigurationValidation {
  type: 'regex' | 'function' | 'schema' | 'enum';
  validator: string | ((value: any) => boolean) | string[];
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ConfigurationHint {
  type: 'tip' | 'warning' | 'best-practice' | 'performance';
  message: string;
  learnMoreUrl?: string;
  conditions?: Record<string, any>;
}

interface ConfigurationExample {
  title: string;
  description: string;
  value: any;
  useCase: string;
  tags?: string[];
}

export class ConfigurationWizardPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private currentStepIndex = 0;
  private configurationSteps: ConfigurationStep[] = [];
  private stepValues: Record<string, any> = {};

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager
  ) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'xfidelity.configurationWizard',
      'X-Fidelity Configuration Wizard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.disposables
    );

    await this.initializeWizard();
    await this.updateContent();
  }

  private async initializeWizard(): Promise<void> {
    try {
      this.configurationSteps = this.getConfigurationSteps();
      this.currentStepIndex = 0;
      this.stepValues = {};
      
      // Pre-populate with current configuration
      const currentConfig = this.configManager.getConfig();
      this.stepValues['archetype'] = currentConfig.archetype;
      
      logger.info('Configuration wizard initialized', { 
        totalSteps: this.configurationSteps.length,
        currentStep: this.currentStepIndex 
      });
    } catch (error) {
      logger.error('Failed to initialize configuration wizard', { error });
      await vscode.window.showErrorMessage('Failed to initialize configuration wizard');
    }
  }

  private getConfigurationSteps(): ConfigurationStep[] {
    return [
      {
        id: 'archetype',
        title: 'Select Project Archetype',
        description: 'Choose the archetype that best matches your project',
        category: 'archetype',
        required: true,
        validation: {
          type: 'enum',
          validator: ['node-fullstack', 'react-spa', 'java-microservice', 'python-service', 'dotnet-service'],
          message: 'Please select a valid archetype',
          severity: 'error'
        },
        hints: [
          {
            type: 'tip',
            message: 'Choose the archetype that most closely matches your technology stack'
          },
          {
            type: 'best-practice',
            message: 'The archetype determines which rules and checks will be applied to your project'
          }
        ],
        examples: [
          {
            title: 'Node.js Full-Stack',
            description: 'For Node.js applications with both frontend and backend',
            value: 'node-fullstack',
            useCase: 'Express.js with React/Vue frontend'
          },
          {
            title: 'React SPA',
            description: 'For single-page applications built with React',
            value: 'react-spa',
            useCase: 'Client-side React applications'
          },
          {
            title: 'Java Microservice',
            description: 'For Java-based microservices',
            value: 'java-microservice',
            useCase: 'Spring Boot microservices'
          }
        ]
      },
      {
        id: 'rules',
        title: 'Configure Rules',
        description: 'Select and configure the rules for your project',
        category: 'rules',
        required: false,
        dependencies: ['archetype'],
        hints: [
          {
            type: 'tip',
            message: 'Start with basic rules and add more as needed'
          },
          {
            type: 'performance',
            message: 'Too many rules can slow down analysis - choose what\'s most important'
          }
        ]
      },
      {
        id: 'performance',
        title: 'Performance Settings',
        description: 'Optimize X-Fidelity for your project size and requirements',
        category: 'performance',
        required: false,
        hints: [
          {
            type: 'performance',
            message: 'Adjust these settings based on your project size and analysis frequency needs'
          }
        ]
      }
    ];
  }

  private async updateContent(): Promise<void> {
    if (!this.panel) return;

    const currentStep = this.configurationSteps[this.currentStepIndex];
    const hints = currentStep?.hints || [];
    const examples = currentStep?.examples || [];

    this.panel.webview.html = this.generateHTML(currentStep, hints, examples);
  }

  private generateHTML(currentStep?: ConfigurationStep, hints: ConfigurationHint[] = [], examples: ConfigurationExample[] = []): string {
    const progress = this.configurationSteps.length > 0 ? 
      Math.round((this.currentStepIndex / this.configurationSteps.length) * 100) : 0;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>X-Fidelity Configuration Wizard</title>
        ${this.getStyles()}
    </head>
    <body>
        <div class="wizard-container">
            <header class="wizard-header">
                <h1>🧙‍♂️ X-Fidelity Configuration Wizard</h1>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">Step ${this.currentStepIndex + 1} of ${this.configurationSteps.length}</span>
                </div>
            </header>

            ${currentStep ? this.generateStepContent(currentStep, hints, examples) : this.generateWelcomeContent()}

            <div class="wizard-navigation">
                <button id="prevBtn" onclick="previousStep()" ${this.currentStepIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <button id="nextBtn" onclick="nextStep()" ${this.currentStepIndex === this.configurationSteps.length - 1 ? 'style="display: none;"' : ''}>
                    Next →
                </button>
                <button id="finishBtn" onclick="finishWizard()" ${this.currentStepIndex === this.configurationSteps.length - 1 ? '' : 'style="display: none;"'}>
                    🎉 Finish Configuration
                </button>
            </div>
        </div>

        ${this.getJavaScript()}
    </body>
    </html>`;
  }

  private generateWelcomeContent(): string {
    return `
    <div class="step-content welcome-content">
        <div class="welcome-icon">🚀</div>
        <h2>Welcome to X-Fidelity!</h2>
        <p class="welcome-description">
            This wizard will guide you through configuring X-Fidelity for your project. 
            We'll help you select the right archetype, configure rules, and optimize settings 
            for your specific needs.
        </p>
        
        <div class="welcome-features">
            <div class="feature">
                <span class="feature-icon">🎯</span>
                <div class="feature-content">
                    <h3>Smart Archetype Detection</h3>
                    <p>We'll analyze your project and suggest the best archetype</p>
                </div>
            </div>
            <div class="feature">
                <span class="feature-icon">⚙️</span>
                <div class="feature-content">
                    <h3>Intelligent Rule Configuration</h3>
                    <p>Get personalized rule recommendations based on your stack</p>
                </div>
            </div>
            <div class="feature">
                <span class="feature-icon">🔧</span>
                <div class="feature-content">
                    <h3>Performance Optimization</h3>
                    <p>Optimize settings for your project size and requirements</p>
                </div>
            </div>
        </div>

        <div class="welcome-time">
            <span class="time-icon">⏱️</span>
            <span>Estimated time: 5-10 minutes</span>
        </div>
    </div>`;
  }

  private generateStepContent(step: ConfigurationStep, hints: ConfigurationHint[], examples: ConfigurationExample[]): string {
    const currentValue = this.stepValues[step.id] || '';
    
    return `
    <div class="step-content">
        <div class="step-header">
            <h2>${step.title}</h2>
            <p class="step-description">${step.description}</p>
            ${step.required ? '<span class="required-badge">Required</span>' : ''}
        </div>

        <div class="step-body">
            ${this.generateStepInput(step, currentValue)}
            
            ${hints.length > 0 ? this.generateHintsSection(hints) : ''}
            
            ${examples.length > 0 ? this.generateExamplesSection(examples) : ''}
        </div>

        <div class="validation-feedback" id="validationFeedback"></div>
    </div>`;
  }

  private generateStepInput(step: ConfigurationStep, currentValue: any): string {
    switch (step.id) {
      case 'archetype':
        return `
        <div class="input-section">
            <label for="archetypeSelect">Select Project Archetype:</label>
            <select id="archetypeSelect" onchange="handleInputChange('${step.id}', this.value)">
                <option value="">Choose an archetype...</option>
                <option value="node-fullstack" ${currentValue === 'node-fullstack' ? 'selected' : ''}>Node.js Full-Stack</option>
                <option value="react-spa" ${currentValue === 'react-spa' ? 'selected' : ''}>React SPA</option>
                <option value="java-microservice" ${currentValue === 'java-microservice' ? 'selected' : ''}>Java Microservice</option>
                <option value="python-service" ${currentValue === 'python-service' ? 'selected' : ''}>Python Service</option>
                <option value="dotnet-service" ${currentValue === 'dotnet-service' ? 'selected' : ''}.NET Service</option>
            </select>
        </div>`;

      case 'rules':
        return `
        <div class="input-section">
            <label>Configure Rules:</label>
            <div class="rules-configuration">
                <div class="rule-category">
                    <h4>Code Quality Rules</h4>
                    <label class="checkbox-label">
                        <input type="checkbox" value="sensitiveLogging" onchange="handleRuleChange(this)"> 
                        Sensitive Data Logging Detection
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="outdatedFramework" onchange="handleRuleChange(this)"> 
                        Outdated Framework Detection
                    </label>
                </div>
                
                <div class="rule-category">
                    <h4>Architecture Rules</h4>
                    <label class="checkbox-label">
                        <input type="checkbox" value="standardStructure" onchange="handleRuleChange(this)"> 
                        Standard Project Structure
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="dependencyValidation" onchange="handleRuleChange(this)"> 
                        Dependency Validation
                    </label>
                </div>
            </div>
        </div>`;

      case 'performance':
        return `
        <div class="input-section">
            <label>Performance Settings:</label>
            <div class="performance-settings">
                <div class="setting-group">
                    <label for="runInterval">Analysis Interval (seconds):</label>
                    <input type="number" id="runInterval" value="300" min="0" max="3600"
                           onchange="handleInputChange('runInterval', this.value)">
                    <small>Set to 0 to disable automatic analysis</small>
                </div>
                
                <div class="setting-group">
                    <label for="maxFileSize">Maximum File Size (MB):</label>
                    <input type="number" id="maxFileSize" value="1" min="0.1" max="10" step="0.1"
                           onchange="handleInputChange('maxFileSize', this.value)">
                    <small>Files larger than this will be skipped</small>
                </div>
                
                <div class="setting-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="autoAnalyzeOnSave" checked
                               onchange="handleInputChange('autoAnalyzeOnSave', this.checked)">
                        Auto-analyze on file save
                    </label>
                </div>
            </div>
        </div>`;

      default:
        return `
        <div class="input-section">
            <label for="stepInput">${step.title}:</label>
            <input type="text" id="stepInput" value="${currentValue}" 
                   onchange="handleInputChange('${step.id}', this.value)"
                   placeholder="Enter ${step.title.toLowerCase()}...">
        </div>`;
    }
  }

  private generateHintsSection(hints: ConfigurationHint[]): string {
    return `
    <div class="hints-section">
        <h4>💡 Helpful Tips</h4>
        <div class="hints-list">
            ${hints.map(hint => `
                <div class="hint hint-${hint.type}">
                    <span class="hint-icon">${this.getHintIcon(hint.type)}</span>
                    <div class="hint-content">
                        <p>${hint.message}</p>
                        ${hint.learnMoreUrl ? `<a href="${hint.learnMoreUrl}" class="learn-more-link">Learn more →</a>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
  }

  private generateExamplesSection(examples: ConfigurationExample[]): string {
    return `
    <div class="examples-section">
        <h4>📋 Examples</h4>
        <div class="examples-list">
            ${examples.map(example => `
                <div class="example-card" onclick="useExample('${example.value}')">
                    <h5>${example.title}</h5>
                    <p class="example-description">${example.description}</p>
                    <p class="example-use-case"><strong>Use case:</strong> ${example.useCase}</p>
                    <div class="example-value">
                        <code>${typeof example.value === 'string' ? example.value : JSON.stringify(example.value)}</code>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
  }

  private getHintIcon(type: string): string {
    switch (type) {
      case 'tip': return '💡';
      case 'warning': return '⚠️';
      case 'best-practice': return '⭐';
      case 'performance': return '⚡';
      default: return 'ℹ️';
    }
  }

  private getStyles(): string {
    return `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }

        .wizard-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .wizard-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .wizard-header h1 {
            font-size: 2rem;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }

        .progress-container {
            display: flex;
            align-items: center;
            gap: 15px;
            justify-content: center;
        }

        .progress-bar {
            width: 300px;
            height: 8px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
        }

        .step-content {
            flex: 1;
            margin-bottom: 30px;
        }

        .welcome-content {
            text-align: center;
        }

        .welcome-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        .welcome-content h2 {
            font-size: 2rem;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }

        .welcome-description {
            font-size: 1.1rem;
            margin-bottom: 40px;
            color: var(--vscode-descriptionForeground);
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .welcome-features {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 40px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .feature {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 20px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
        }

        .feature-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .feature-content h3 {
            margin-bottom: 5px;
            color: var(--vscode-textLink-foreground);
        }

        .welcome-time {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
        }

        .step-header {
            margin-bottom: 30px;
        }

        .step-header h2 {
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }

        .step-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }

        .required-badge {
            background: var(--vscode-errorForeground);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }

        .input-section {
            margin-bottom: 30px;
        }

        .input-section label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }

        .input-section select,
        .input-section input[type="text"],
        .input-section input[type="number"] {
            width: 100%;
            padding: 10px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 1rem;
        }

        .input-section select:focus,
        .input-section input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .rules-configuration {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .rule-category h4 {
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .checkbox-label:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .performance-settings {
            display: grid;
            gap: 20px;
        }

        .setting-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .setting-group small {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9rem;
        }

        .hints-section,
        .examples-section {
            margin-top: 30px;
        }

        .hints-section h4,
        .examples-section h4 {
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
        }

        .hint {
            display: flex;
            gap: 10px;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid;
        }

        .hint-tip {
            background: var(--vscode-textCodeBlock-background);
            border-left-color: var(--vscode-textLink-foreground);
        }

        .hint-warning {
            background: rgba(255, 193, 7, 0.1);
            border-left-color: #ffc107;
        }

        .hint-best-practice {
            background: rgba(40, 167, 69, 0.1);
            border-left-color: #28a745;
        }

        .hint-performance {
            background: rgba(23, 162, 184, 0.1);
            border-left-color: #17a2b8;
        }

        .hint-icon {
            flex-shrink: 0;
        }

        .learn-more-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            font-size: 0.9rem;
        }

        .learn-more-link:hover {
            text-decoration: underline;
        }

        .examples-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
        }

        .example-card {
            padding: 20px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .example-card:hover {
            border-color: var(--vscode-textLink-foreground);
            background: var(--vscode-list-hoverBackground);
        }

        .example-card h5 {
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }

        .example-description {
            margin-bottom: 10px;
            color: var(--vscode-descriptionForeground);
        }

        .example-use-case {
            margin-bottom: 15px;
            font-size: 0.9rem;
        }

        .example-value {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
        }

        .validation-feedback {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            display: none;
        }

        .validation-feedback.error {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid #f44336;
            color: #f44336;
            display: block;
        }

        .validation-feedback.success {
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid #4caf50;
            color: #4caf50;
            display: block;
        }

        .wizard-navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-top: 1px solid var(--vscode-widget-border);
        }

        .wizard-navigation button {
            padding: 12px 24px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-color 0.2s;
        }

        .wizard-navigation button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .wizard-navigation button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        #finishBtn {
            background: var(--vscode-textLink-foreground);
            color: white;
        }

        @media (max-width: 768px) {
            .rules-configuration {
                grid-template-columns: 1fr;
            }
            
            .wizard-navigation {
                flex-direction: column;
                gap: 15px;
            }
            
            .wizard-navigation button {
                width: 100%;
            }
        }
    </style>`;
  }

  private getJavaScript(): string {
    return `
    <script>
        const vscode = acquireVsCodeApi();
        
        function handleInputChange(stepId, value) {
            vscode.postMessage({
                command: 'updateStepValue',
                stepId: stepId,
                value: value
            });
            
            // Validate the input
            vscode.postMessage({
                command: 'validateStep',
                stepId: stepId,
                value: value
            });
        }
        
        function handleRuleChange(checkbox) {
            const selectedRules = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            
            vscode.postMessage({
                command: 'updateStepValue',
                stepId: 'rules',
                value: selectedRules
            });
        }
        
        function useExample(value) {
            const currentStepInput = document.getElementById('archetypeSelect') || document.getElementById('stepInput');
            if (currentStepInput) {
                currentStepInput.value = value;
                handleInputChange('archetype', value);
            }
        }
        
        function nextStep() {
            vscode.postMessage({ command: 'nextStep' });
        }
        
        function previousStep() {
            vscode.postMessage({ command: 'previousStep' });
        }
        
        function finishWizard() {
            vscode.postMessage({ command: 'finishWizard' });
        }
        
        // Handle validation feedback
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'validationResult') {
                const feedback = document.getElementById('validationFeedback');
                if (message.valid) {
                    feedback.className = 'validation-feedback success';
                    feedback.textContent = '✅ Valid configuration';
                } else {
                    feedback.className = 'validation-feedback error';
                    feedback.textContent = '❌ ' + message.errors.join(', ');
                }
            }
        });
    </script>`;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'updateStepValue':
        this.stepValues[message.stepId] = message.value;
        logger.debug('Step value updated', { stepId: message.stepId, value: message.value });
        break;

      case 'validateStep':
        await this.validateCurrentStep(message.stepId, message.value);
        break;

      case 'nextStep':
        await this.goToNextStep();
        break;

      case 'previousStep':
        await this.goToPreviousStep();
        break;

      case 'finishWizard':
        await this.finishWizard();
        break;
    }
  }

  private async validateCurrentStep(stepId: string, value: any): Promise<void> {
    try {
      const step = this.configurationSteps.find(s => s.id === stepId);
      if (!step || !step.validation) {
        return;
      }

      const { validation } = step;
      let valid = true;
      const errors: string[] = [];

      if (validation.type === 'enum' && Array.isArray(validation.validator)) {
        if (!validation.validator.includes(value)) {
          valid = false;
          errors.push(validation.message);
        }
      }
      
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'validationResult',
          valid,
          errors,
          hints: step.hints || []
        });
      }
    } catch (error) {
      logger.error('Validation failed', { stepId, error });
    }
  }

  private async goToNextStep(): Promise<void> {
    if (this.currentStepIndex < this.configurationSteps.length - 1) {
      this.currentStepIndex++;
      await this.updateContent();
      logger.debug('Moved to next step', { stepIndex: this.currentStepIndex });
    }
  }

  private async goToPreviousStep(): Promise<void> {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      await this.updateContent();
      logger.debug('Moved to previous step', { stepIndex: this.currentStepIndex });
    }
  }

  private async finishWizard(): Promise<void> {
    try {
      // Apply the configuration
      const configUpdates: any = {};
      
      if (this.stepValues.archetype) {
        configUpdates.archetype = this.stepValues.archetype;
      }

      if (this.stepValues.runInterval !== undefined) {
        configUpdates.runInterval = parseInt(this.stepValues.runInterval);
      }

      if (this.stepValues.maxFileSize !== undefined) {
        configUpdates.maxFileSize = parseFloat(this.stepValues.maxFileSize) * 1024 * 1024; // Convert MB to bytes
      }

      if (this.stepValues.autoAnalyzeOnSave !== undefined) {
        configUpdates.autoAnalyzeOnSave = this.stepValues.autoAnalyzeOnSave;
      }
      
      if (this.stepValues.rules && Array.isArray(this.stepValues.rules)) {
        // Handle rule configuration
        logger.info('Rules configured', { rules: this.stepValues.rules });
      }

      await this.configManager.updateConfig(configUpdates);
      
      // Show completion message
      await vscode.window.showInformationMessage(
        '🎉 Configuration completed successfully! X-Fidelity is now configured for your project.',
        'Run Analysis'
      ).then(selection => {
        if (selection === 'Run Analysis') {
          vscode.commands.executeCommand('xfidelity.runAnalysis');
        }
      });

      // Close the wizard
      this.panel?.dispose();
      
      logger.info('Configuration wizard completed', { 
        finalConfig: this.stepValues,
        appliedUpdates: configUpdates 
      });

    } catch (error) {
      logger.error('Failed to finish wizard', { error });
      await vscode.window.showErrorMessage('Failed to apply configuration changes');
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.panel?.dispose();
  }
} 