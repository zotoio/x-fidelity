import * as vscode from 'vscode';
import { logger, setLogLevel } from '@x-fidelity/core';
import type { ResultMetadata } from '@x-fidelity/core';
import { analyzeCodebase } from '@x-fidelity/core';

interface CLIOptions {
    dir: string;
    archetype: string;
    configServer?: string;
    localConfigPath?: string;
    mode?: string;
    port?: number;
    examine?: boolean;
    openaiEnabled?: boolean;
    telemetryCollector?: string;
    notificationProvider?: any;
}

type ErrorLevel = 'fatal' | 'error' | 'warning' | 'exempt';

// Store the original CLI options
let originalOptions: CLIOptions | null = null;

// Create output channel for logging
let outputChannel: vscode.OutputChannel;

// Create status bar item
let statusBarItem: vscode.StatusBarItem;

// Store the diagnostic collection
let diagnosticCollection: vscode.DiagnosticCollection;

// Store the analysis interval
let analysisInterval: NodeJS.Timeout | null = null;

// Store the last analysis time
let lastAnalysisTime: number = 0;

// Store whether we're currently analyzing
let isAnalyzing: boolean = false;

// Store whether we're in debug mode
let isDebugMode: boolean = false;

// Store the notification provider
let notificationProvider: any = null;

// Store the current workspace folder
let currentWorkspaceFolder: string | undefined;

// Store the current configuration
let currentConfig: vscode.WorkspaceConfiguration;

// Store the current CLI options
let cliOptions: CLIOptions = {
    dir: '.',
    archetype: 'node-fullstack',
    configServer: '',
    localConfigPath: '',
    mode: 'cli',
    port: undefined,
    examine: false,
    openaiEnabled: false,
    telemetryCollector: '',
    notificationProvider: null
};

// Initialize the extension
export function activate(context: vscode.ExtensionContext) {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('X-Fidelity');
    context.subscriptions.push(outputChannel);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(sync) X-Fidelity';
    statusBarItem.tooltip = 'Click to run X-Fidelity analysis';
    statusBarItem.command = 'xfidelity.runAnalysis';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('x-fidelity');
    context.subscriptions.push(diagnosticCollection);

    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        void vscode.window.showErrorMessage('No workspace folder found. Please open a folder to use X-Fidelity.');
        return;
    }
    currentWorkspaceFolder = workspaceFolders[0].uri.fsPath;

    // Get configuration
    currentConfig = vscode.workspace.getConfiguration('xfidelity');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('xfidelity.runAnalysis', () => {
            void runAnalysis();
        })
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('xfidelity')) {
                updateConfiguration();
            }
        })
    );

    // Initialize configuration
    updateConfiguration();

    // Start periodic analysis if enabled
    startPeriodicAnalysis();
}

// Update configuration
function updateConfiguration() {
    currentConfig = vscode.workspace.getConfiguration('xfidelity');
    
    // Update debug mode
    const newDebugMode = currentConfig.get<boolean>('debug', false);
    if (newDebugMode !== isDebugMode) {
        isDebugMode = newDebugMode;
        setLogLevel(isDebugMode ? 'debug' : 'info');
    }

    // Update CLI options
    cliOptions.archetype = currentConfig.get<string>('archetype', 'node-fullstack');
    cliOptions.configServer = currentConfig.get<string>('configServer', '');
    cliOptions.localConfigPath = currentConfig.get<string>('localConfigPath', '');

    // Update analysis interval
    const runInterval = currentConfig.get<number>('runInterval', 300);
    if (runInterval !== currentConfig.get<number>('runInterval')) {
        startPeriodicAnalysis();
    }
}

// Start periodic analysis
function startPeriodicAnalysis() {
    // Clear existing interval
    if (analysisInterval) {
        clearInterval(analysisInterval);
        analysisInterval = null;
    }

    // Get run interval
    const runInterval = currentConfig.get<number>('runInterval', 300);

    // Start new interval if enabled
    if (runInterval > 0) {
        analysisInterval = setInterval(() => {
            // Only run if enough time has passed and we're not currently analyzing
            const now = Date.now();
            if (!isAnalyzing && (now - lastAnalysisTime) >= (runInterval * 1000)) {
                void runAnalysis();
            }
        }, 10000); // Check every 10 seconds
    }
}

// Run analysis
async function runAnalysis() {
    try {
        if (isAnalyzing) {
            void vscode.window.showInformationMessage('Analysis is already in progress...');
            return;
        }

        isAnalyzing = true;
        statusBarItem.text = '$(sync~spin) X-Fidelity: Analyzing...';

        // Backup original CLI options
        if (!originalOptions) {
            originalOptions = { ...cliOptions };
            logger.debug('Original CLI options backed up:', JSON.stringify(originalOptions));
        }

        // Update CLI options for this analysis
        cliOptions.dir = currentWorkspaceFolder || '.';
        cliOptions.openaiEnabled = currentConfig.get<boolean>('openaiEnabled', false);
        cliOptions.telemetryCollector = currentConfig.get<string>('telemetryCollector', '');
        cliOptions.mode = 'cli';
        cliOptions.notificationProvider = notificationProvider; // Set our custom notification provider

        logger.debug('CLI options set for analysis:', JSON.stringify(cliOptions));

        // Run analysis
        const result: ResultMetadata = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: 'Running X-Fidelity analysis...',
            cancellable: false
        }, async () => {
            return await analyzeCodebase({
                repoPath: cliOptions.dir,
                archetype: cliOptions.archetype,
                configServer: cliOptions.configServer,
                localConfigPath: cliOptions.localConfigPath,
                executionLogPrefix: `vscode-ext-${Date.now()}`
            });
        });

        // Update last analysis time
        lastAnalysisTime = Date.now();

        // Clear existing diagnostics
        diagnosticCollection.clear();

        // Process results
        if (result.XFI_RESULT.totalIssues > 0) {
            // Group issues by file
            const issuesByFile = new Map<string, vscode.Diagnostic[]>();

            result.XFI_RESULT.issueDetails.forEach(detail => {
                const diagnostics: vscode.Diagnostic[] = detail.errors.map(error => {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(0, 0, 0, 0), // TODO: Add proper line/column information
                        error.details?.message || error.ruleFailure,
                        (error.level as ErrorLevel) === 'fatal' ? vscode.DiagnosticSeverity.Error :
                        (error.level as ErrorLevel) === 'warning' ? vscode.DiagnosticSeverity.Warning :
                        vscode.DiagnosticSeverity.Information
                    );
                    diagnostic.source = 'X-Fidelity';
                    return diagnostic;
                });

                issuesByFile.set(detail.filePath, diagnostics);
            });

            // Set diagnostics
            issuesByFile.forEach((diagnostics, filePath) => {
                diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
            });

            // Show summary
            const message = `Found ${result.XFI_RESULT.totalIssues} issues (${result.XFI_RESULT.fatalityCount} fatal, ${result.XFI_RESULT.warningCount} warnings)`;
            if (result.XFI_RESULT.fatalityCount > 0) {
                void vscode.window.showErrorMessage(message);
            } else {
                void vscode.window.showWarningMessage(message);
            }

            statusBarItem.text = '$(alert) X-Fidelity: Issues found';
        } else {
            void vscode.window.showInformationMessage('No issues found!');
            statusBarItem.text = '$(check) X-Fidelity: No issues';
        }

        // Restore original CLI options
        if (originalOptions) {
            cliOptions = { ...originalOptions };
            logger.debug('Original CLI options restored:', JSON.stringify(cliOptions));
        }

    } catch (error: any) {
        void vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        statusBarItem.text = '$(error) X-Fidelity: Error';
        logger.error('Analysis failed:', error);
    } finally {
        isAnalyzing = false;
    }
}

// Deactivate extension
export function deactivate() {
    if (analysisInterval) {
        clearInterval(analysisInterval);
    }
}
