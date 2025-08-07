import * as vscode from 'vscode';
import { createComponentLogger } from '../utils/globalLogger';

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

interface IssueContext {
  ruleId: string;
  message: string;
  file: string;
  line: number;
  column: number;
  severity: string;
  category: string;
  fixable: boolean;
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
   * Delegate explain issue command
   */
  async delegateExplainIssue(issueContext: IssueContext): Promise<void> {
    if (!this.isCommandDelegationEnabled()) {
      await this.defaultExplainIssue(issueContext);
      return;
    }

    const config = vscode.workspace.getConfiguration('xfidelity');
    const commandName = config.get<string>(
      'commandProviders.explainIssue',
      'built-in'
    );

    if (commandName === 'built-in') {
      await this.defaultExplainIssue(issueContext);
      return;
    }

    // Try to execute the configured command directly
    try {
      logger.debug(`Delegating explainIssue to command: ${commandName}`);
      await vscode.commands.executeCommand(commandName, issueContext);
      logger.debug(
        `Successfully delegated explainIssue to command: ${commandName}`
      );
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${commandName}': ${error}. Falling back to built-in.`
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

    const config = vscode.workspace.getConfiguration('xfidelity');
    const commandName = config.get<string>(
      'commandProviders.fixIssue',
      'built-in'
    );

    if (commandName === 'built-in') {
      await this.defaultFixIssue(issueContext);
      return;
    }

    // Try to execute the configured command directly
    try {
      logger.debug(`Delegating fixIssue to command: ${commandName}`);
      await vscode.commands.executeCommand(commandName, issueContext);
      logger.debug(
        `Successfully delegated fixIssue to command: ${commandName}`
      );
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${commandName}': ${error}. Falling back to built-in.`
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

    const config = vscode.workspace.getConfiguration('xfidelity');
    const commandName = config.get<string>(
      'commandProviders.fixIssueGroup',
      'built-in'
    );

    if (commandName === 'built-in') {
      await this.defaultFixIssueGroup(groupContext);
      return;
    }

    // Try to execute the configured command directly
    try {
      logger.debug(`Delegating fixIssueGroup to command: ${commandName}`);
      await vscode.commands.executeCommand(commandName, groupContext);
      logger.debug(
        `Successfully delegated fixIssueGroup to command: ${commandName}`
      );
    } catch (error) {
      logger.error(
        `Command delegation failed for command '${commandName}': ${error}. Falling back to built-in.`
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
      await config.update(
        `commandProviders.${commandType}`,
        selected.detail,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(
        `${commandType} provider set to: ${selected.label.replace('$(extensions) ', '').replace('$(home) ', '')}`
      );
    }
  }

  // Default implementations (stubs)
  private async defaultExplainIssue(context: IssueContext): Promise<void> {
    const message =
      `**Rule: ${context.ruleId}**\n\n` +
      `${context.message}\n\n` +
      `**Severity:** ${context.severity}\n` +
      `**Category:** ${context.category}\n` +
      `**Location:** ${context.file}:${context.line}:${context.column}\n\n` +
      `*Install an extension that provides issue explanation capabilities for enhanced explanations.*`;

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

  private async defaultFixIssue(context: IssueContext): Promise<void> {
    if (!context.fixable) {
      await vscode.window.showInformationMessage(
        `Rule ${context.ruleId} does not have an automated fix available.`
      );
      return;
    }

    const selection = await vscode.window.showInformationMessage(
      `Default fix implementation for ${context.ruleId}. Install an extension that provides automated fixing capabilities for enhanced fixes.`,
      'Configure Providers',
      'OK'
    );

    if (selection === 'Configure Providers') {
      await this.showConfigurationUI();
    }
  }

  private async defaultFixIssueGroup(
    context: IssueGroupContext
  ): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      `Default batch fix implementation for ${context.issues.length} issues. Install an extension that provides batch fixing capabilities for automated group fixes.`,
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
