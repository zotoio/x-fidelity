import * as vscode from 'vscode';
import * as path from 'path';
// Import necessary functions from the x-fidelity package
import { analyzeCodebase } from 'x-fidelity/dist/core/engine/analyzer';
import { options as cliOptions } from 'x-fidelity/dist/core/cli';
import { ResultMetadata } from 'x-fidelity/dist/types/typeDefs';

// Create our own logger to avoid pino-pretty transport issues
const logger = {
    info: (msg: any, context?: string) => {
        const message = context ? `${context}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}` : 
                                  (typeof msg === 'object' ? JSON.stringify(msg) : msg);
        console.log(message);
        return logger;
    },
    error: (err: any, msg?: string) => {
        console.error(msg || '', err);
        return logger;
    },
    warn: (msg: any, context?: string) => {
        const message = context ? `${context}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}` : 
                                  (typeof msg === 'object' ? JSON.stringify(msg) : msg);
        console.warn(message);
        return logger;
    },
    debug: (msg: any, context?: string) => {
        const message = context ? `${context}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}` : 
                                  (typeof msg === 'object' ? JSON.stringify(msg) : msg);
        console.debug(message);
        return logger;
    },
    trace: (msg: any, context?: string) => {
        const message = context ? `${context}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}` : 
                                  (typeof msg === 'object' ? JSON.stringify(msg) : msg);
        console.trace(message);
        return logger;
    }
};

// Simple implementations to replace the x-fidelity logger functions
function setLogLevel(level: string) {
    // No-op for our simple logger
}

function setLogPrefix(prefix: string) {
    // No-op for our simple logger
}

function generateLogPrefix() {
    return `vscode-ext-${Date.now()}`;
}

let diagnosticCollection: vscode.DiagnosticCollection;
let analysisInterval: NodeJS.Timeout | undefined;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

const XFIDELITY_COMMAND_ID = 'xfidelity.runAnalysis';

export function activate(context: vscode.ExtensionContext) {
    // Create Output Channel
    outputChannel = vscode.window.createOutputChannel('X-Fidelity');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('Initializing X-Fidelity extension...');

    // Create Diagnostic Collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('xfidelity');
    context.subscriptions.push(diagnosticCollection);

    // Create Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = XFIDELITY_COMMAND_ID;
    statusBarItem.text = `$(zap) X-Fidelity`;
    statusBarItem.tooltip = 'Click to run X-Fidelity analysis';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    // Initial log setup
    setLogLevel(process.env.XFI_LOG_LEVEL || 'info'); // Or read from config
    setLogPrefix(generateLogPrefix());
    logger.info('X-Fidelity VS Code extension activating.');
    outputChannel.appendLine('X-Fidelity extension activating.');
    
    // Monkey patch the x-fidelity logger to use our custom logger
    try {
        // This is a workaround to replace the x-fidelity logger with our custom logger
        // to avoid pino-pretty transport issues
        const xfidelity = require('x-fidelity');
        if (xfidelity && xfidelity.logger) {
            Object.keys(logger).forEach(key => {
                if (typeof logger[key] === 'function') {
                    xfidelity.logger[key] = logger[key];
                }
            });
        }
    } catch (err) {
        outputChannel.appendLine(`Warning: Could not patch x-fidelity logger: ${err}`);
    }

    // Register command for manual analysis
    let disposable = vscode.commands.registerCommand(XFIDELITY_COMMAND_ID, () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "X-Fidelity: Running Analysis",
            cancellable: false
        }, (progress) => {
            progress.report({ increment: 0, message: "Starting..." });
            return runAnalysis(progress).catch(err => {
                vscode.window.showErrorMessage(`X-Fidelity analysis failed: ${err.message}`);
                logger.error(err, 'Manual analysis failed');
            });
        });
    });
    context.subscriptions.push(disposable);

    // Setup periodic analysis
    setupPeriodicAnalysis();

    // Re-setup periodic analysis and potentially trigger a run if configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        const affectsRunInterval = e.affectsConfiguration('xfidelity.runInterval');
        const affectsOtherSettings = e.affectsConfiguration('xfidelity.archetype') ||
                                    e.affectsConfiguration('xfidelity.configServer') ||
                                    e.affectsConfiguration('xfidelity.localConfigPath');

        if (affectsRunInterval || affectsOtherSettings) {
            logger.info('X-Fidelity configuration changed.');
            outputChannel.appendLine('X-Fidelity configuration changed.');

            if (affectsRunInterval) {
                logger.info('Resetting periodic analysis due to interval change.');
                outputChannel.appendLine('Resetting periodic analysis interval.');
                setupPeriodicAnalysis(); // Resets the timer
            }

            if (affectsOtherSettings) {
                // Optionally trigger an immediate analysis run if relevant settings changed
                logger.info('Triggering analysis due to relevant configuration change.');
                outputChannel.appendLine('Triggering analysis due to relevant configuration change.');
                vscode.commands.executeCommand(XFIDELITY_COMMAND_ID);
            }
        }
    }));

    logger.info('X-Fidelity VS Code extension activated.');
    outputChannel.appendLine('X-Fidelity extension activated.');
}

// Export for testing
export function setupPeriodicAnalysis() {
    // Clear existing interval if it exists
    if (analysisInterval) {
        clearInterval(analysisInterval);
        analysisInterval = undefined;
        logger.info('Cleared existing analysis interval.');
    }

    const config = vscode.workspace.getConfiguration('xfidelity');
    const intervalSeconds = config.get<number>('runInterval', 300);

    if (intervalSeconds > 0) {
        const intervalMilliseconds = intervalSeconds * 1000;
        logger.info(`Setting up periodic analysis to run every ${intervalSeconds} seconds.`);
        outputChannel.appendLine(`Setting up periodic analysis interval: ${intervalSeconds} seconds.`);
        analysisInterval = setInterval(() => {
            logger.info('Running periodic X-Fidelity analysis...');
            outputChannel.appendLine('Running periodic X-Fidelity analysis...');
            // Run analysis without progress indicator for background task
            runAnalysis().catch(err => {
                // Log error but don't show error message for background runs unless configured
                logger.error(err, 'Periodic analysis failed');
                outputChannel.appendLine(`Periodic analysis failed: ${err.message}`);
            });
        }, intervalMilliseconds);
    } else {
        logger.info('Periodic analysis disabled (interval set to 0).');
        outputChannel.appendLine('Periodic analysis disabled (interval set to 0).');
    }
}

// Export for testing
export async function runAnalysis(progress?: vscode.Progress<{ message?: string; increment?: number }>) {
    outputChannel.appendLine('Starting analysis run...');
    statusBarItem.text = `$(sync~spin) X-Fidelity`;
    statusBarItem.tooltip = 'Analysis is running...';
    diagnosticCollection.clear();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('X-Fidelity: No workspace folder open.');
        return;
    }
    // For now, analyze the first workspace folder. Multi-root support could be added later.
    const workspacePath = workspaceFolders[0].uri.fsPath;
    outputChannel.appendLine(`Analyzing workspace: ${workspacePath}`);

    progress?.report({ increment: 10, message: "Loading configuration..." });

    const config = vscode.workspace.getConfiguration('xfidelity');
    const archetype = config.get<string>('archetype', 'node-fullstack');
    const configServer = config.get<string>('configServer', '');
    let localConfigPath = config.get<string>('localConfigPath', '');

    // Resolve localConfigPath relative to workspace root if provided
    if (localConfigPath) {
        localConfigPath = path.resolve(workspacePath, localConfigPath);
    }

    // --- Critical Section: Managing CLI Options ---
    // The core `analyzeCodebase` relies on the global `options` object from `cli.ts`.
    // We need to carefully set these options for the analysis run.
    // This is fragile and might require refactoring `analyzeCodebase` later
    // to accept options directly.
    const originalOptions = { ...cliOptions }; // Backup original options
    logger.debug('Original CLI options backed up:', originalOptions);
    outputChannel.appendLine('Preparing analysis engine...');
    try {
        // --- Set CLI options for this run ---
        logger.info('Temporarily setting CLI options for VS Code run...');
        cliOptions.dir = workspacePath;
        cliOptions.archetype = archetype;
        cliOptions.configServer = configServer;
        cliOptions.localConfigPath = localConfigPath;
        cliOptions.openaiEnabled = false; // TODO: Make configurable?
        cliOptions.telemetryCollector = ''; // TODO: Make configurable?
        cliOptions.mode = 'client'; // Force client mode
        logger.debug('CLI options set for analysis:', cliOptions);
        // --- End Setting CLI options ---

        logger.info(`Starting analysis for workspace: ${workspacePath} with archetype: ${archetype}`);
        outputChannel.appendLine(`Starting analysis with archetype: ${archetype}`);
        progress?.report({ increment: 30, message: "Analyzing codebase..." });

        const results: ResultMetadata = await analyzeCodebase({
            repoPath: workspacePath,
            archetype: archetype,
            configServer: configServer,
            localConfigPath: localConfigPath,
            executionLogPrefix: generateLogPrefix() // Generate a new log prefix for this analysis
        });

        logger.info(`Analysis complete. Found ${results.XFI_RESULT.totalIssues} issues.`);
        outputChannel.appendLine(`Analysis complete. Found ${results.XFI_RESULT.totalIssues} issues.`);
        progress?.report({ increment: 50, message: "Processing results..." });

        displayDiagnostics(results, workspacePath);

        progress?.report({ increment: 100, message: "Analysis finished." });
        // Add a small delay before resolving the progress to ensure the "finished" message is seen
        await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
        logger.error(error, 'Analysis failed during execution');
        
        if (error instanceof Error) {
            outputChannel.appendLine(`ERROR during analysis: ${error.message}\n${error.stack}`);
            vscode.window.showErrorMessage(`X-Fidelity analysis failed: ${error.message}`);
            // Ensure status bar is reset even on error
            statusBarItem.text = `$(error) X-Fidelity`;
            statusBarItem.tooltip = `Analysis failed: ${error.message}`;
        } else {
            const errorMessage = String(error);
            outputChannel.appendLine(`ERROR during analysis: ${errorMessage}`);
            vscode.window.showErrorMessage(`X-Fidelity analysis failed: ${errorMessage}`);
            statusBarItem.text = `$(error) X-Fidelity`;
            statusBarItem.tooltip = `Analysis failed: ${errorMessage}`;
        }
        // Rethrow or handle as needed
        throw error; // Rethrow so the progress indicator catches it
    } finally {
        // Restore original options
        Object.assign(cliOptions, originalOptions);
        logger.info('Restored original CLI options.');
        logger.debug('Original CLI options restored:', cliOptions);
        // Reset status bar after completion (success or handled error)
        statusBarItem.text = `$(zap) X-Fidelity`;
        statusBarItem.tooltip = 'Click to run X-Fidelity analysis';
    }
}

// Export for testing
export function displayDiagnostics(results: ResultMetadata, workspacePath: string) {
    diagnosticCollection.clear();
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();
    let globalIssuesCount = 0;

    outputChannel.appendLine('Processing analysis results for diagnostics...');

    results.XFI_RESULT.issueDetails.forEach(issueDetail => {
        // Handle global checks separately
        if (issueDetail.filePath === 'REPO_GLOBAL_CHECK') {
            globalIssuesCount += issueDetail.errors.length;
            logger.info(`Global issues found: ${issueDetail.errors.length}`);
            outputChannel.appendLine(`--- Global Repository Issues (${issueDetail.errors.length}) ---`);
            issueDetail.errors.forEach(error => {
                const severity = mapSeverity(error.level);
                const severityText = vscode.DiagnosticSeverity[severity].toUpperCase();
                const message = `${severityText}: ${error.ruleFailure} - ${error.details?.message || 'No details'}`;
                logger.warn(`Global Rule Failure: ${message}`);
                outputChannel.appendLine(message);
                if (error.details?.details) {
                    // Log additional details if present
                    try {
                        outputChannel.appendLine(`  Details: ${JSON.stringify(error.details.details, null, 2)}`);
                    } catch (e) {
                        outputChannel.appendLine(`  Details: (Could not stringify)`);
                    }
                }
            });
            outputChannel.appendLine(`--- End Global Issues ---`);
            return; // Skip creating file-specific diagnostics for global checks
        }

        // Ensure filePath is valid before creating URI
        if (!issueDetail.filePath || typeof issueDetail.filePath !== 'string') {
            logger.warn('Skipping issue detail with invalid filePath:', issueDetail);
            return;
        }

        const fileUri = vscode.Uri.file(issueDetail.filePath);
        let fileDiagnostics = diagnosticsMap.get(fileUri.toString());
        if (!fileDiagnostics) {
            fileDiagnostics = [];
            diagnosticsMap.set(fileUri.toString(), fileDiagnostics);
        }

        issueDetail.errors.forEach(error => {
            // --- Precise Range Detection ---
            // TODO: Refine range detection based on the actual structure of `error.details`.
            // The core engine needs to provide reliable line/column info for rules.
            // Example possibilities:
            // - error.details?.lineNumber, error.details?.columnNumber
            // - error.details?.location?.start?.line, error.details?.location?.start?.column
            // - error.details?.details?.[0]?.lineNumber (as currently used)
            let line = 0;
            let startChar = 0;
            let endChar = 100; // Default to highlighting a large part of the line

            // Attempt to extract line number
            if (typeof error.details?.details?.[0]?.lineNumber === 'number') {
                line = Math.max(0, error.details.details[0].lineNumber - 1); // VS Code lines are 0-indexed
            } else if (typeof error.details?.lineNumber === 'number') {
                 line = Math.max(0, error.details.lineNumber - 1);
            }
            // TODO: Add logic here to extract startChar and endChar if available from error details

            const range = new vscode.Range(line, startChar, line, endChar);
            // --- End Precise Range Detection ---

            const severity = mapSeverity(error.level);

            const diagnostic = new vscode.Diagnostic(
                range,
                `${error.ruleFailure}: ${error.details?.message || 'No message'}`,
                severity
            );
            diagnostic.source = 'X-Fidelity';
            // Add more details if needed, e.g., diagnostic.code = error.ruleFailure;

            fileDiagnostics.push(diagnostic);
        });
    });

    // Update the diagnostic collection
    diagnosticsMap.forEach((diags, uriString) => {
        diagnosticCollection.set(vscode.Uri.parse(uriString), diags);
    });

    outputChannel.appendLine(`Diagnostics updated. ${results.XFI_RESULT.issueDetails.length - globalIssuesCount} file-specific issues found. ${globalIssuesCount} global issues logged.`);
    logger.info('Diagnostics displayed.');
}

// Export for testing
export function mapSeverity(level: 'warning' | 'error' | 'fatality' | 'exempt' | undefined): vscode.DiagnosticSeverity {
    switch (level) {
        case 'fatality':
        case 'error':
            return vscode.DiagnosticSeverity.Error;
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'exempt':
            return vscode.DiagnosticSeverity.Information; // Or Hint
        default:
            return vscode.DiagnosticSeverity.Information;
    }
}

export function deactivate(): Promise<void> {
    logger.info('Deactivating X-Fidelity VS Code extension.');
    outputChannel.appendLine('Deactivating X-Fidelity extension...');
    if (analysisInterval) {
        clearInterval(analysisInterval);
    }
    diagnosticCollection.dispose();
    outputChannel.dispose();
    statusBarItem.dispose();
    // Other cleanup tasks if needed
    logger.info('X-Fidelity extension deactivated.');
    return Promise.resolve();
}
