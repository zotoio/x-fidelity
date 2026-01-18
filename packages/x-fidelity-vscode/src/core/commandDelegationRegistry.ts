import * as vscode from 'vscode';
import { createComponentLogger } from '../utils/globalLogger';
import { getBestAIProvider, getIDEName } from '../utils/ideDetection';
import type { EnhancedIssueDetails, EnhancedIssueItem } from '../types/issues';

const logger = createComponentLogger('CommandDelegationRegistry');

interface CommandProvider {
  id: string;
  displayName: string;
  command: string;
  extensionId: string;
  supportedLanguages?: string[];
  supportedRuleTypes?: string[];
  supportsBatch?: boolean;
}

export interface IssueContext {
  // Basic identification
  ruleId: string;
  message: string;
  file: string;

  // Location information (1-based line/column numbers)
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;

  // Issue metadata
  severity: string;
  category: string;
  fixable: boolean;
  exempted?: boolean;
  issueId?: string;

  // Context and documentation
  codeSnippet?: string;
  documentation?: string;
  ruleDocUrl?: string;

  // Enhanced highlighting details
  highlighting?: {
    /** The actual text that was matched/flagged */
    matchedText?: string;
    /** The pattern that triggered this issue (regex, rule condition, etc.) */
    pattern?: string;
    /** Context around the match for clarity */
    matchContext?: string;
    /** Source of the location information (e.g., 'complexity-metrics', 'dependency-manifest-location') */
    locationSource?: string;
    /** Confidence level of the location extraction */
    confidence?: 'high' | 'medium' | 'low';
    /** Additional matches if multiple occurrences were found */
    additionalMatches?: Array<{
      line: number;
      column: number;
      matchedText?: string;
    }>;
  };

  // Rule recommendations and descriptions
  recommendations?: string[];
  ruleDescription?: string;

  // Dependency-specific details (for dependency version issues)
  dependencyInfo?: {
    /** The dependency section (dependencies, devDependencies, peerDependencies) */
    section?: string;
    /** Current installed version */
    currentVersion?: string;
    /** Required/minimum version */
    requiredVersion?: string;
    /** Full line content from manifest file */
    lineContent?: string;
  };

  // Fix suggestions
  suggestedFix?: {
    description: string;
    edits: Array<{
      range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
      newText: string;
    }>;
  } | null;

  // Original data for advanced providers
  originalData?: any;

  // Workspace context
  workspaceRoot?: string;

  // Related issues
  relatedIssues?: Array<{
    file: string;
    line: number;
    message: string;
  }>;

  // Unified enhanced details structure for all issue types
  // This provides consistent access to issue-specific data across all commands
  enhancedDetails?: EnhancedIssueDetails;

  // Flag indicating this is a global/repository-wide issue
  isGlobalCheck?: boolean;
}

interface IssueGroupContext {
  groupKey: string;
  issues: IssueContext[];
  groupType: 'severity' | 'rule' | 'file' | 'category';
}

export class CommandDelegationRegistry {
  private explainers = new Map<string, CommandProvider>();
  private fixers = new Map<string, CommandProvider>();
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.discoverProviders();
    this.watchForExtensionChanges();
  }

  /**
   * Discover command providers from other extensions
   */
  private discoverProviders(): void {
    logger.debug('Discovering command providers from extensions...');

    // Clear existing providers
    this.explainers.clear();
    this.fixers.clear();

    // Scan all extensions for X-Fidelity extension point contributions
    for (const extension of vscode.extensions.all) {
      if (extension.packageJSON?.contributes) {
        this.processExtensionContributions(extension);
      }
    }

    logger.info(
      `Discovered ${this.explainers.size} issue explainers and ${this.fixers.size} issue fixers`
    );
  }

  private processExtensionContributions(
    extension: vscode.Extension<any>
  ): void {
    const contributions = extension.packageJSON.contributes;

    // Check for issue explainer contributions
    if (contributions['xfidelity.issueExplainer']) {
      const explainers = Array.isArray(
        contributions['xfidelity.issueExplainer']
      )
        ? contributions['xfidelity.issueExplainer']
        : [contributions['xfidelity.issueExplainer']];

      for (const explainer of explainers) {
        this.explainers.set(extension.id, {
          ...explainer,
          extensionId: extension.id
        });
        logger.info(
          `Discovered issue explainer: ${explainer.displayName} from ${extension.id}`
        );
      }
    }

    // Check for issue fixer contributions
    if (contributions['xfidelity.issueFixer']) {
      const fixers = Array.isArray(contributions['xfidelity.issueFixer'])
        ? contributions['xfidelity.issueFixer']
        : [contributions['xfidelity.issueFixer']];

      for (const fixer of fixers) {
        this.fixers.set(extension.id, {
          ...fixer,
          extensionId: extension.id
        });
        logger.info(
          `Discovered issue fixer: ${fixer.displayName} from ${extension.id}`
        );
      }
    }
  }

  /**
   * Watch for extension installations/uninstallations
   */
  private watchForExtensionChanges(): void {
    const disposable = vscode.extensions.onDidChange(() => {
      logger.debug('Extensions changed, rediscovering command providers');
      this.discoverProviders();
    });

    this.disposables.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  /**
   * Check if command delegation is enabled
   */
  private isCommandDelegationEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('xfidelity');
    return config.get<boolean>('enableCommandDelegation', true);
  }

  /**
   * Get the effective command provider based on preset or custom config
   */
  private getEffectiveProvider(
    commandType: 'explainIssue' | 'fixIssue' | 'fixIssueGroup'
  ): string {
    const config = vscode.workspace.getConfiguration('xfidelity');
    const preset = config.get<string>('aiIntegrationPreset', 'auto-detect');

    // If custom mode, use manual command overrides
    if (preset === 'custom') {
      return config.get<string>(`commandProviders.${commandType}`, 'built-in');
    }

    // For presets, return the preset name which will be handled by default implementations
    // The preset is used by the default implementation methods to decide which AI to use
    return preset;
  }

  /**
   * Delegate explain issue command
   */
  async delegateExplainIssue(issueContext: IssueContext): Promise<void> {
    if (!this.isCommandDelegationEnabled()) {
      await this.defaultExplainIssue(issueContext);
      return;
    }

    const provider = this.getEffectiveProvider('explainIssue');

    // Check if provider is a preset (auto-detect, cursor, github-copilot, amazon-q, built-in)
    if (
      [
        'auto-detect',
        'cursor',
        'github-copilot',
        'amazon-q',
        'built-in'
      ].includes(provider)
    ) {
      await this.defaultExplainIssue(issueContext, provider);
      return;
    }

    // Otherwise, it's a custom command name - try to execute it
    try {
      logger.debug(`Delegating explainIssue to custom command: ${provider}`);
      await vscode.commands.executeCommand(provider, issueContext);
      logger.debug(
        `Successfully delegated explainIssue to command: ${provider}`
      );
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${provider}': ${error}. Falling back to built-in.`
      );
      await this.defaultExplainIssue(issueContext);
    }
  }

  /**
   * Delegate fix issue command
   */
  async delegateFixIssue(issueContext: IssueContext): Promise<void> {
    if (!this.isCommandDelegationEnabled()) {
      await this.defaultFixIssue(issueContext);
      return;
    }

    const provider = this.getEffectiveProvider('fixIssue');

    // Check if provider is a preset (auto-detect, cursor, github-copilot, amazon-q, built-in)
    if (
      [
        'auto-detect',
        'cursor',
        'github-copilot',
        'amazon-q',
        'built-in'
      ].includes(provider)
    ) {
      await this.defaultFixIssue(issueContext, provider);
      return;
    }

    // Otherwise, it's a custom command name - try to execute it
    try {
      logger.debug(`Delegating fixIssue to custom command: ${provider}`);
      await vscode.commands.executeCommand(provider, issueContext);
      logger.debug(`Successfully delegated fixIssue to command: ${provider}`);
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${provider}': ${error}. Falling back to built-in.`
      );
      await this.defaultFixIssue(issueContext);
    }
  }

  /**
   * Delegate fix issue group command
   */
  async delegateFixIssueGroup(groupContext: IssueGroupContext): Promise<void> {
    if (!this.isCommandDelegationEnabled()) {
      await this.defaultFixIssueGroup(groupContext);
      return;
    }

    const provider = this.getEffectiveProvider('fixIssueGroup');

    // Check if provider is a preset (auto-detect, cursor, github-copilot, amazon-q, built-in)
    if (
      [
        'auto-detect',
        'cursor',
        'github-copilot',
        'amazon-q',
        'built-in'
      ].includes(provider)
    ) {
      await this.defaultFixIssueGroup(groupContext, provider);
      return;
    }

    // Otherwise, it's a custom command name - try to execute it
    try {
      logger.debug(`Delegating fixIssueGroup to custom command: ${provider}`);
      await vscode.commands.executeCommand(provider, groupContext);
      logger.debug(
        `Successfully delegated fixIssueGroup to command: ${provider}`
      );
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${provider}': ${error}. Falling back to built-in.`
      );
      await this.defaultFixIssueGroup(groupContext);
    }
  }

  /**
   * Get available command providers for UI
   */
  getAvailableExplainers(): CommandProvider[] {
    return Array.from(this.explainers.values());
  }

  getAvailableFixers(): CommandProvider[] {
    return Array.from(this.fixers.values());
  }

  /**
   * Show configuration UI for command providers
   */
  async showConfigurationUI(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(question) Configure Issue Explainer',
        description: 'Choose which extension explains X-Fidelity issues',
        detail: 'explainIssue'
      },
      {
        label: '$(wrench) Configure Issue Fixer',
        description: 'Choose which extension fixes X-Fidelity issues',
        detail: 'fixIssue'
      },
      {
        label: '$(wrench) Configure Batch Fixer',
        description: 'Choose which extension handles batch fixes',
        detail: 'fixIssueGroup'
      }
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a command type to configure',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selected && selected.detail) {
      await this.configureCommandProvider(selected.detail);
    }
  }

  /**
   * Configure a specific command provider
   */
  private async configureCommandProvider(commandType: string): Promise<void> {
    const providers = commandType.includes('fix')
      ? this.getAvailableFixers()
      : this.getAvailableExplainers();

    const items: vscode.QuickPickItem[] = [
      {
        label: '$(home) Built-in Implementation',
        description: "Use X-Fidelity's default implementation",
        detail: 'built-in'
      }
    ];

    // Add discovered providers
    for (const provider of providers) {
      // For batch operations, only show providers that support batch
      if (commandType === 'fixIssueGroup' && !provider.supportsBatch) {
        continue;
      }

      items.push({
        label: `$(extensions) ${provider.displayName}`,
        description: `Extension: ${provider.extensionId}`,
        detail: provider.extensionId
      });
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a provider for ${commandType}`,
      matchOnDescription: true
    });

    if (selected && selected.detail) {
      const config = vscode.workspace.getConfiguration('xfidelity');

      // Get the current commandProviders object
      const currentProviders = config.get<Record<string, string>>(
        'commandProviders',
        {
          explainIssue: 'built-in',
          fixIssue: 'built-in',
          fixIssueGroup: 'built-in'
        }
      );

      // Update the specific property
      const updatedProviders = {
        ...currentProviders,
        [commandType]: selected.detail
      };

      // Write the entire object back
      await config.update(
        'commandProviders',
        updatedProviders,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(
        `${commandType} provider set to: ${selected.label.replace('$(extensions) ', '').replace('$(home) ', '')}`
      );
    }
  }

  // Default implementations using available AI providers
  private async defaultExplainIssue(
    context: IssueContext,
    preset?: string
  ): Promise<void> {
    const ideName = getIDEName();

    // Determine which AI provider to use based on preset
    let aiProvider: string;
    if (preset === 'auto-detect') {
      aiProvider = getBestAIProvider();
    } else if (preset === 'cursor') {
      aiProvider = 'cursor';
    } else if (preset === 'github-copilot') {
      aiProvider = 'copilot';
    } else if (preset === 'amazon-q') {
      aiProvider = 'amazon-q';
    } else {
      // 'built-in' or undefined - auto-detect
      aiProvider = getBestAIProvider();
    }

    // Try to use the selected AI provider
    if (aiProvider === 'cursor') {
      await this.explainWithCursor(context);
    } else if (aiProvider === 'copilot') {
      await this.explainWithCopilot(context);
    } else if (aiProvider === 'amazon-q') {
      await this.explainWithAmazonQ(context);
    } else {
      // Fallback: Show detailed message for user to copy
      await this.showExplainFallback(context, ideName);
    }
  }

  /**
   * Use Cursor AI to explain the issue
   */
  private async explainWithCursor(context: IssueContext): Promise<void> {
    try {
      // Cursor's AI chat command
      const prompt = this.buildExplanationPrompt(context);

      // Try to use Cursor's chat/composer
      await vscode.commands.executeCommand('cursor.composer.chat', {
        prompt: prompt
      });
    } catch (error) {
      logger.debug('Failed to use Cursor AI, trying alternative:', error);

      // Fallback to showing the prompt for user to copy
      await this.showExplainFallback(context, 'Cursor');
    }
  }

  /**
   * Use GitHub Copilot to explain the issue
   */
  private async explainWithCopilot(context: IssueContext): Promise<void> {
    try {
      const prompt = this.buildExplanationPrompt(context);

      // Try GitHub Copilot Chat
      await vscode.commands.executeCommand('github.copilot.chat.open', {
        prompt: prompt
      });
    } catch (error) {
      logger.debug('Failed to use GitHub Copilot, trying alternative:', error);

      // Try alternative Copilot command
      try {
        await vscode.commands.executeCommand(
          'workbench.panel.chat.view.copilot.open'
        );
        // Show the prompt for user to paste
        await vscode.env.clipboard.writeText(
          this.buildExplanationPrompt(context)
        );
        await vscode.window.showInformationMessage(
          'Copilot Chat opened. The explanation prompt has been copied to your clipboard - paste it in the chat.',
          'OK'
        );
      } catch {
        await this.showExplainFallback(context, 'GitHub Copilot');
      }
    }
  }

  /**
   * Use Amazon Q to explain the issue
   */
  private async explainWithAmazonQ(context: IssueContext): Promise<void> {
    try {
      const prompt = this.buildExplanationPrompt(context);

      // Try Amazon Q Chat command
      await vscode.commands.executeCommand('aws.amazonq.explainCode', {
        prompt: prompt
      });
    } catch (error) {
      logger.debug('Failed to use Amazon Q explain, trying chat:', error);

      // Try alternative Amazon Q chat command
      try {
        await vscode.commands.executeCommand('aws.amazonq.chat.open');
        // Copy the prompt for user to paste
        await vscode.env.clipboard.writeText(
          this.buildExplanationPrompt(context)
        );
        await vscode.window.showInformationMessage(
          'Amazon Q Chat opened. The explanation prompt has been copied to your clipboard - paste it in the chat.',
          'OK'
        );
      } catch {
        await this.showExplainFallback(context, 'Amazon Q');
      }
    }
  }

  /**
   * Build a comprehensive explanation prompt with enhanced details
   */
  private buildExplanationPrompt(context: IssueContext): string {
    let prompt = `Please explain this code quality issue:\n\n`;
    prompt += `**Rule:** ${context.ruleId}\n`;
    prompt += `**Message:** ${context.message}\n`;
    prompt += `**Severity:** ${context.severity}\n`;
    prompt += `**Category:** ${context.category}\n`;
    prompt += `**File:** ${context.file}:${context.line}:${context.column}\n`;

    // Add scope indicator for global issues
    if (context.isGlobalCheck) {
      prompt += `**Scope:** Repository-wide (affects entire codebase)\n`;
    }

    // Add end position if available for precise location
    if (context.endLine && context.endColumn) {
      prompt += `**Range:** Lines ${context.line}-${context.endLine}, Columns ${context.column}-${context.endColumn}\n`;
    }
    prompt += `\n`;

    // Add unified enhanced details if available
    if (context.enhancedDetails) {
      prompt += this.formatEnhancedDetailsForPrompt(
        context.enhancedDetails,
        'explain'
      );
    }

    // Legacy: Add highlighting details if available (fallback)
    if (context.highlighting && !context.enhancedDetails) {
      if (context.highlighting.matchedText) {
        prompt += `**Matched Text:** \`${context.highlighting.matchedText}\`\n`;
      }
      if (context.highlighting.pattern) {
        prompt += `**Pattern:** \`${context.highlighting.pattern}\`\n`;
      }
      if (context.highlighting.matchContext) {
        prompt += `**Match Context:** ${context.highlighting.matchContext}\n`;
      }
      if (
        context.highlighting.additionalMatches &&
        context.highlighting.additionalMatches.length > 0
      ) {
        prompt += `**Additional Occurrences:** ${context.highlighting.additionalMatches.length} more locations\n`;
      }
      prompt += `\n`;
    }

    // Legacy: Add dependency-specific information (fallback)
    if (context.dependencyInfo && !context.enhancedDetails) {
      prompt += `**Dependency Details:**\n`;
      if (context.dependencyInfo.section) {
        prompt += `- Section: ${context.dependencyInfo.section}\n`;
      }
      if (context.dependencyInfo.currentVersion) {
        prompt += `- Current Version: ${context.dependencyInfo.currentVersion}\n`;
      }
      if (context.dependencyInfo.requiredVersion) {
        prompt += `- Required Version: ${context.dependencyInfo.requiredVersion}\n`;
      }
      if (context.dependencyInfo.lineContent) {
        prompt += `- Manifest Line: \`${context.dependencyInfo.lineContent}\`\n`;
      }
      prompt += `\n`;
    }

    if (context.codeSnippet) {
      prompt += `**Code Context:**\n\`\`\`\n${context.codeSnippet}\n\`\`\`\n\n`;
    }

    if (context.ruleDescription) {
      prompt += `**Rule Description:** ${context.ruleDescription}\n\n`;
    }

    if (context.documentation) {
      prompt += `**Rule Documentation:**\n${context.documentation}\n\n`;
    }

    if (context.recommendations && context.recommendations.length > 0) {
      prompt += `**Recommendations:**\n`;
      context.recommendations.forEach((rec, i) => {
        prompt += `${i + 1}. ${rec}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Please provide:\n`;
    prompt += `1. An explanation of why this is an issue\n`;
    prompt += `2. The potential impact or risks\n`;
    prompt += `3. Best practices to address it\n`;
    prompt += `4. Example of how to fix it\n`;

    return prompt;
  }

  /**
   * Show fallback explanation message
   */
  private async showExplainFallback(
    context: IssueContext,
    ideName: string
  ): Promise<void> {
    const prompt = this.buildExplanationPrompt(context);

    // Copy to clipboard
    await vscode.env.clipboard.writeText(prompt);

    const message =
      `X-Fidelity Issue Explanation\n\n` +
      `A detailed explanation prompt has been copied to your clipboard.\n\n` +
      `**To get an AI explanation:**\n` +
      `1. Open your AI assistant (${ideName} AI, ChatGPT, etc.)\n` +
      `2. Paste the prompt from your clipboard\n` +
      `3. Get a detailed explanation and fix suggestions\n\n` +
      `**Or configure an AI provider:**\n` +
      `Click "Configure Providers" to set up automatic AI-powered explanations.`;

    const selection = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Configure Providers',
      'OK'
    );

    if (selection === 'Configure Providers') {
      await this.showConfigurationUI();
    }
  }

  private async defaultFixIssue(
    context: IssueContext,
    preset?: string
  ): Promise<void> {
    const ideName = getIDEName();

    // Determine which AI provider to use based on preset
    let aiProvider: string;
    if (preset === 'auto-detect') {
      aiProvider = getBestAIProvider();
    } else if (preset === 'cursor') {
      aiProvider = 'cursor';
    } else if (preset === 'github-copilot') {
      aiProvider = 'copilot';
    } else if (preset === 'amazon-q') {
      aiProvider = 'amazon-q';
    } else {
      // 'built-in' or undefined - auto-detect
      aiProvider = getBestAIProvider();
    }

    // Try to use the selected AI provider
    if (aiProvider === 'cursor') {
      await this.fixWithCursor(context);
    } else if (aiProvider === 'copilot') {
      await this.fixWithCopilot(context);
    } else if (aiProvider === 'amazon-q') {
      await this.fixWithAmazonQ(context);
    } else {
      // Fallback: Show detailed message for user to copy
      await this.showFixFallback(context, ideName);
    }
  }

  /**
   * Use Cursor AI to fix the issue
   */
  private async fixWithCursor(context: IssueContext): Promise<void> {
    try {
      const prompt = this.buildFixPrompt(context);

      // Try to use Cursor's composer for inline edits
      await vscode.commands.executeCommand('cursor.composer.edit', {
        prompt: prompt,
        location: {
          uri: vscode.Uri.file(context.file),
          range: new vscode.Range(
            context.line - 1,
            context.column - 1,
            (context.endLine || context.line) - 1,
            (context.endColumn || context.column) - 1
          )
        }
      });
    } catch (error) {
      logger.debug('Failed to use Cursor AI for fix, trying chat:', error);

      // Fallback to chat
      try {
        const prompt = this.buildFixPrompt(context);
        await vscode.commands.executeCommand('cursor.composer.chat', {
          prompt: prompt
        });
      } catch {
        await this.showFixFallback(context, 'Cursor');
      }
    }
  }

  /**
   * Use GitHub Copilot to fix the issue
   */
  private async fixWithCopilot(context: IssueContext): Promise<void> {
    try {
      const prompt = this.buildFixPrompt(context);

      // Try GitHub Copilot inline suggestion
      await vscode.commands.executeCommand('github.copilot.generate', {
        prompt: prompt,
        location: vscode.Uri.file(context.file)
      });
    } catch (error) {
      logger.debug('Failed to use GitHub Copilot for fix, trying chat:', error);

      // Fallback to Copilot chat
      try {
        await vscode.commands.executeCommand(
          'workbench.panel.chat.view.copilot.open'
        );
        await vscode.env.clipboard.writeText(this.buildFixPrompt(context));
        await vscode.window.showInformationMessage(
          'Copilot Chat opened. The fix prompt has been copied to your clipboard - paste it in the chat.',
          'OK'
        );
      } catch {
        await this.showFixFallback(context, 'GitHub Copilot');
      }
    }
  }

  /**
   * Use Amazon Q to fix the issue
   */
  private async fixWithAmazonQ(context: IssueContext): Promise<void> {
    try {
      const prompt = this.buildFixPrompt(context);

      // Try Amazon Q fix command
      await vscode.commands.executeCommand('aws.amazonq.fixCode', {
        prompt: prompt,
        location: vscode.Uri.file(context.file)
      });
    } catch (error) {
      logger.debug('Failed to use Amazon Q for fix, trying chat:', error);

      // Fallback to Amazon Q chat
      try {
        await vscode.commands.executeCommand('aws.amazonq.chat.open');
        await vscode.env.clipboard.writeText(this.buildFixPrompt(context));
        await vscode.window.showInformationMessage(
          'Amazon Q Chat opened. The fix prompt has been copied to your clipboard - paste it in the chat.',
          'OK'
        );
      } catch {
        await this.showFixFallback(context, 'Amazon Q');
      }
    }
  }

  /**
   * Build a comprehensive fix prompt with enhanced details
   */
  private buildFixPrompt(context: IssueContext): string {
    let prompt = `Please fix this code quality issue:\n\n`;
    prompt += `**Rule:** ${context.ruleId}\n`;
    prompt += `**Message:** ${context.message}\n`;
    prompt += `**Severity:** ${context.severity}\n`;
    prompt += `**File:** ${context.file}:${context.line}:${context.column}\n`;

    // Add scope indicator for global issues
    if (context.isGlobalCheck) {
      prompt += `**Scope:** Repository-wide (affects entire codebase)\n`;
    }

    // Add end position if available for precise location
    if (context.endLine && context.endColumn) {
      prompt += `**Range:** Lines ${context.line}-${context.endLine}, Columns ${context.column}-${context.endColumn}\n`;
    }
    prompt += `\n`;

    // Add unified enhanced details if available
    if (context.enhancedDetails) {
      prompt += this.formatEnhancedDetailsForPrompt(
        context.enhancedDetails,
        'fix'
      );
    }

    // Legacy: Add highlighting details to help AI understand what to fix (fallback)
    if (context.highlighting && !context.enhancedDetails) {
      if (context.highlighting.matchedText) {
        prompt += `**Problematic Code:** \`${context.highlighting.matchedText}\`\n`;
      }
      if (context.highlighting.pattern) {
        prompt += `**Violation Pattern:** \`${context.highlighting.pattern}\`\n`;
      }
      if (
        context.highlighting.additionalMatches &&
        context.highlighting.additionalMatches.length > 0
      ) {
        prompt += `**Note:** There are ${context.highlighting.additionalMatches.length} additional occurrences of this issue that may also need fixing:\n`;
        context.highlighting.additionalMatches.slice(0, 5).forEach(match => {
          prompt += `  - Line ${match.line}${match.matchedText ? `: \`${match.matchedText}\`` : ''}\n`;
        });
        if (context.highlighting.additionalMatches.length > 5) {
          prompt += `  - ... and ${context.highlighting.additionalMatches.length - 5} more\n`;
        }
      }
      prompt += `\n`;
    }

    // Legacy: Add dependency-specific information for dependency fixes (fallback)
    if (context.dependencyInfo && !context.enhancedDetails) {
      prompt += `**Dependency Fix Details:**\n`;
      if (context.dependencyInfo.section) {
        prompt += `- Update in: ${context.dependencyInfo.section}\n`;
      }
      if (
        context.dependencyInfo.currentVersion &&
        context.dependencyInfo.requiredVersion
      ) {
        prompt += `- Change version from: ${context.dependencyInfo.currentVersion} to: ${context.dependencyInfo.requiredVersion}\n`;
      }
      if (context.dependencyInfo.lineContent) {
        prompt += `- Current manifest line: \`${context.dependencyInfo.lineContent}\`\n`;
      }
      prompt += `\n`;
    }

    if (context.codeSnippet) {
      prompt += `**Current Code:**\n\`\`\`\n${context.codeSnippet}\n\`\`\`\n\n`;
    }

    if (context.suggestedFix) {
      prompt += `**Suggested Fix:**\n${context.suggestedFix.description}\n\n`;
    }

    if (context.recommendations && context.recommendations.length > 0) {
      prompt += `**Recommendations:**\n`;
      context.recommendations.forEach((rec, i) => {
        prompt += `${i + 1}. ${rec}\n`;
      });
      prompt += `\n`;
    }

    if (context.documentation) {
      prompt += `**Rule Documentation:**\n${context.documentation}\n\n`;
    }

    prompt += `Please provide:\n`;
    prompt += `1. The corrected code\n`;
    prompt += `2. Explanation of the changes\n`;
    prompt += `3. Any additional considerations\n`;

    return prompt;
  }

  /**
   * Show fallback fix message
   */
  private async showFixFallback(
    context: IssueContext,
    ideName: string
  ): Promise<void> {
    const prompt = this.buildFixPrompt(context);

    // Copy to clipboard
    await vscode.env.clipboard.writeText(prompt);

    const message =
      `X-Fidelity Issue Fix\n\n` +
      `A detailed fix prompt has been copied to your clipboard.\n\n` +
      `**To get an AI-generated fix:**\n` +
      `1. Open your AI assistant (${ideName} AI, ChatGPT, etc.)\n` +
      `2. Paste the prompt from your clipboard\n` +
      `3. Review and apply the suggested fix\n\n` +
      `**Or configure an AI provider:**\n` +
      `Click "Configure Providers" to set up automatic AI-powered fixes.`;

    const selection = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Configure Providers',
      'Open File',
      'OK'
    );

    if (selection === 'Configure Providers') {
      await this.showConfigurationUI();
    } else if (selection === 'Open File') {
      // Open the file at the issue location
      const document = await vscode.workspace.openTextDocument(context.file);
      const editor = await vscode.window.showTextDocument(document);
      const position = new vscode.Position(
        context.line - 1,
        context.column - 1
      );
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
    }
  }

  private async defaultFixIssueGroup(
    context: IssueGroupContext,
    preset?: string
  ): Promise<void> {
    const ideName = getIDEName();

    // Determine which AI provider to use based on preset
    let aiProvider: string;
    if (preset === 'auto-detect') {
      aiProvider = getBestAIProvider();
    } else if (preset === 'cursor') {
      aiProvider = 'cursor';
    } else if (preset === 'github-copilot') {
      aiProvider = 'copilot';
    } else if (preset === 'amazon-q') {
      aiProvider = 'amazon-q';
    } else {
      // 'built-in' or undefined - auto-detect
      aiProvider = getBestAIProvider();
    }

    // Try to use the selected AI provider
    if (aiProvider === 'cursor') {
      await this.fixGroupWithCursor(context);
    } else if (aiProvider === 'copilot') {
      await this.fixGroupWithCopilot(context);
    } else if (aiProvider === 'amazon-q') {
      await this.fixGroupWithAmazonQ(context);
    } else {
      // Fallback: Show detailed message for user to copy
      await this.showFixGroupFallback(context, ideName);
    }
  }

  /**
   * Use Cursor AI to fix a group of issues
   */
  private async fixGroupWithCursor(context: IssueGroupContext): Promise<void> {
    try {
      const prompt = this.buildBatchFixPrompt(context);

      // Try to use Cursor's composer chat for batch operations
      await vscode.commands.executeCommand('cursor.composer.chat', {
        prompt: prompt
      });
    } catch (error) {
      logger.debug('Failed to use Cursor AI for batch fix:', error);
      await this.showFixGroupFallback(context, 'Cursor');
    }
  }

  /**
   * Use GitHub Copilot to fix a group of issues
   */
  private async fixGroupWithCopilot(context: IssueGroupContext): Promise<void> {
    try {
      const prompt = this.buildBatchFixPrompt(context);

      // Try GitHub Copilot Chat for batch operations
      await vscode.commands.executeCommand(
        'workbench.panel.chat.view.copilot.open'
      );
      await vscode.env.clipboard.writeText(prompt);
      await vscode.window.showInformationMessage(
        `Copilot Chat opened. A prompt for fixing ${context.issues.length} issues has been copied to your clipboard - paste it in the chat.`,
        'OK'
      );
    } catch (error) {
      logger.debug('Failed to use GitHub Copilot for batch fix:', error);
      await this.showFixGroupFallback(context, 'GitHub Copilot');
    }
  }

  /**
   * Use Amazon Q to fix a group of issues
   */
  private async fixGroupWithAmazonQ(context: IssueGroupContext): Promise<void> {
    try {
      const prompt = this.buildBatchFixPrompt(context);

      // Try Amazon Q Chat for batch operations
      await vscode.commands.executeCommand('aws.amazonq.chat.open');
      await vscode.env.clipboard.writeText(prompt);
      await vscode.window.showInformationMessage(
        `Amazon Q Chat opened. A prompt for fixing ${context.issues.length} issues has been copied to your clipboard - paste it in the chat.`,
        'OK'
      );
    } catch (error) {
      logger.debug('Failed to use Amazon Q for batch fix:', error);
      await this.showFixGroupFallback(context, 'Amazon Q');
    }
  }

  /**
   * Build a comprehensive batch fix prompt with enhanced details
   */
  private buildBatchFixPrompt(context: IssueGroupContext): string {
    let prompt = `Please fix the following ${context.issues.length} code quality issues:\n\n`;
    prompt += `**Group Type:** ${context.groupType}\n`;
    prompt += `**Group Key:** ${context.groupKey}\n\n`;

    prompt += `**Issues to Fix:**\n\n`;

    context.issues.forEach((issue, index) => {
      prompt += `${index + 1}. **${issue.ruleId}** in ${issue.file}:${issue.line}\n`;
      prompt += `   Message: ${issue.message}\n`;
      prompt += `   Severity: ${issue.severity}\n`;

      // Include unified enhanced details if available
      if (issue.enhancedDetails) {
        const details = issue.enhancedDetails;
        prompt += `   Type: ${details.type} (${details.summary})\n`;

        // Show top items
        const topItems = details.items.slice(0, 3);
        topItems.forEach(item => {
          prompt += `   - ${item.label}`;
          if (item.currentValue && item.expectedValue) {
            prompt += `: ${item.currentValue} → ${item.expectedValue}`;
          } else if (item.description) {
            prompt += `: ${item.description}`;
          }
          prompt += `\n`;
        });

        if (details.items.length > 3) {
          prompt += `   - ... and ${details.items.length - 3} more\n`;
        }
      }

      // Legacy: Include highlighting details for precise fixes (fallback)
      if (issue.highlighting?.matchedText && !issue.enhancedDetails) {
        prompt += `   Problematic Code: \`${issue.highlighting.matchedText}\`\n`;
      }
      if (issue.highlighting?.pattern && !issue.enhancedDetails) {
        prompt += `   Pattern: \`${issue.highlighting.pattern}\`\n`;
      }

      // Legacy: Include dependency info for dependency issues (fallback)
      if (issue.dependencyInfo && !issue.enhancedDetails) {
        if (
          issue.dependencyInfo.currentVersion &&
          issue.dependencyInfo.requiredVersion
        ) {
          prompt += `   Version: ${issue.dependencyInfo.currentVersion} → ${issue.dependencyInfo.requiredVersion}\n`;
        }
      }

      if (issue.codeSnippet) {
        prompt += `   Code:\n   \`\`\`\n${issue.codeSnippet
          .split('\n')
          .map(l => '   ' + l)
          .join('\n')}\n   \`\`\`\n`;
      }

      // Include recommendations if available
      if (issue.recommendations && issue.recommendations.length > 0) {
        prompt += `   Recommendations: ${issue.recommendations.join('; ')}\n`;
      }

      prompt += `\n`;
    });

    prompt += `\nPlease provide:\n`;
    prompt += `1. Fixes for all issues\n`;
    prompt += `2. Explanation of changes for each\n`;
    prompt += `3. Any patterns or common solutions\n`;

    return prompt;
  }

  /**
   * Format enhanced issue details for AI prompts
   * Converts the unified structure to a prompt-friendly format based on issue type
   */
  private formatEnhancedDetailsForPrompt(
    details: EnhancedIssueDetails,
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const actionVerb = mode === 'fix' ? 'Fix' : 'Analysis';

    switch (details.type) {
      case 'dependency':
        result += `**${actionVerb} - Outdated Dependencies (${details.items.length}):**\n`;
        result += this.formatDependencyItemsForPrompt(details.items, mode);
        break;

      case 'complexity':
        result += `**${actionVerb} - Complex Functions (${details.items.length}):**\n`;
        result += this.formatComplexityItemsForPrompt(details.items, mode);
        break;

      case 'sensitive-data':
        result += `**${actionVerb} - Sensitive Data Patterns (${details.items.length}):**\n`;
        result += this.formatSensitiveDataItemsForPrompt(details.items, mode);
        break;

      case 'pattern-match':
        result += `**${actionVerb} - Code Pattern Violations (${details.items.length}):**\n`;
        result += this.formatPatternMatchItemsForPrompt(details.items, mode);
        break;

      case 'validation':
        result += `**${actionVerb} - Validation Failures (${details.items.length}):**\n`;
        result += this.formatValidationItemsForPrompt(details.items, mode);
        break;

      case 'generic':
      default:
        result += `**${actionVerb} Details (${details.items.length}):**\n`;
        result += this.formatGenericItemsForPrompt(details.items, mode);
        break;
    }

    result += `\n`;
    return result;
  }

  /**
   * Format dependency items for prompts
   */
  private formatDependencyItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      const severity =
        item.itemSeverity === 'high'
          ? '🔴'
          : item.itemSeverity === 'medium'
            ? '🟡'
            : '🟢';
      const fileInfo = item.file ? ` in \`${item.file}\`` : '';
      const lineInfo = item.line ? `:${item.line}` : '';

      result += `- ${severity} \`${item.label}\`: ${item.currentValue || 'unknown'} → ${item.expectedValue || 'unknown'}${fileInfo}${lineInfo}\n`;

      if (mode === 'fix' && item.metadata?.section) {
        result += `  Section: ${item.metadata.section}\n`;
      }
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more dependencies\n`;
    }

    if (mode === 'fix') {
      result += `\n**Action Required:** Update these dependencies to the required versions.\n`;
    }

    return result;
  }

  /**
   * Format complexity items for prompts
   */
  private formatComplexityItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      const severity =
        item.itemSeverity === 'high'
          ? '🔴'
          : item.itemSeverity === 'medium'
            ? '🟡'
            : '🟢';
      const lineInfo = item.line ? ` (line ${item.line})` : '';

      result += `- ${severity} \`${item.label}\`${lineInfo}\n`;

      if (item.metrics) {
        const metricsStr = Object.entries(item.metrics)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        result += `  Metrics: ${metricsStr}\n`;
      }
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more functions\n`;
    }

    if (mode === 'fix') {
      result += `\n**Action Required:** Refactor these functions to reduce complexity. Consider:\n`;
      result += `- Breaking into smaller functions\n`;
      result += `- Reducing nesting levels\n`;
      result += `- Simplifying conditional logic\n`;
    }

    return result;
  }

  /**
   * Format sensitive data items for prompts
   */
  private formatSensitiveDataItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      const lineInfo = item.line ? ` (line ${item.line})` : '';
      result += `- 🔒 \`${item.label}\`${lineInfo}`;
      if (item.description) {
        result += `: ${item.description}`;
      }
      result += `\n`;
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more patterns\n`;
    }

    if (mode === 'fix') {
      result += `\n**Action Required:** Remove or mask sensitive data. Consider:\n`;
      result += `- Using environment variables\n`;
      result += `- Masking in logs\n`;
      result += `- Moving to secure storage\n`;
    }

    return result;
  }

  /**
   * Format pattern match items for prompts
   */
  private formatPatternMatchItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      const lineInfo = item.line ? ` (line ${item.line})` : '';
      result += `- 🔍 \`${item.label}\`${lineInfo}`;
      if (item.description) {
        result += `: ${item.description}`;
      }
      result += `\n`;
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more patterns\n`;
    }

    if (mode === 'fix') {
      result += `\n**Action Required:** Replace direct usage with approved patterns or abstractions.\n`;
    }

    return result;
  }

  /**
   * Format validation items for prompts
   */
  private formatValidationItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      result += `- ✅ \`${item.label}\``;
      if (item.currentValue && item.expectedValue) {
        result += `: got \`${item.currentValue}\`, expected \`${item.expectedValue}\``;
      } else if (item.description) {
        result += `: ${item.description}`;
      }
      result += `\n`;
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more issues\n`;
    }

    if (mode === 'fix') {
      result += `\n**Action Required:** Update values to match expected format or requirements.\n`;
    }

    return result;
  }

  /**
   * Format generic items for prompts
   */
  private formatGenericItemsForPrompt(
    items: EnhancedIssueItem[],
    mode: 'explain' | 'fix'
  ): string {
    let result = '';
    const itemsToShow = items.slice(0, 10);

    itemsToShow.forEach(item => {
      const lineInfo = item.line ? ` (line ${item.line})` : '';
      result += `- \`${item.label}\`${lineInfo}`;
      if (item.description) {
        result += `: ${item.description}`;
      }
      result += `\n`;
    });

    if (items.length > 10) {
      result += `- ... and ${items.length - 10} more\n`;
    }

    return result;
  }

  /**
   * Show fallback batch fix message
   */
  private async showFixGroupFallback(
    context: IssueGroupContext,
    ideName: string
  ): Promise<void> {
    const prompt = this.buildBatchFixPrompt(context);

    // Copy to clipboard
    await vscode.env.clipboard.writeText(prompt);

    const message =
      `X-Fidelity Batch Fix\n\n` +
      `A prompt for fixing ${context.issues.length} issues has been copied to your clipboard.\n\n` +
      `**To get AI-generated fixes:**\n` +
      `1. Open your AI assistant (${ideName} AI, ChatGPT, etc.)\n` +
      `2. Paste the prompt from your clipboard\n` +
      `3. Review and apply the suggested fixes\n\n` +
      `**Or configure an AI provider:**\n` +
      `Click "Configure Providers" to set up automatic batch fixing.`;

    const selection = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Configure Providers',
      'OK'
    );

    if (selection === 'Configure Providers') {
      await this.showConfigurationUI();
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
