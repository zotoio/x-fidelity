#!/usr/bin/env node

// Set max listeners early to prevent warnings when multiple workers are created
//process.setMaxListeners(20);

import { 
    analyzeCodebase, 
    sendTelemetry, 
    validateArchetypeConfig,
    ExecutionContext,
    LoggerProvider } from '@x-fidelity/core';

//import { PinoLogger } from './utils/pinoLogger';
import { LogLevel, ILogger } from '@x-fidelity/types';
import path from 'path';
import fs from 'fs/promises';
import { version as cliVersion } from '../package.json';  // Import CLI version

import { startServer } from '@x-fidelity/server';

import type {
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    ErrorLevel
} from '@x-fidelity/types';

import { initCLI, options } from './cli';
import { version } from '../package.json';

// Initialize universal logging FIRST before any other operations
LoggerProvider.initializeForPlugins();

export * from '@x-fidelity/core';
export * from '@x-fidelity/types';

// ASCII Art Banner Function
function displayBanner(): void {
    // Calculate exact spacing for version text to ensure perfect alignment
    const borderWidth = 34; // Total width including border characters │ │
    const contentWidth = borderWidth - 2; // Subtract 1 for each │ border character
    const versionText = `v${version}`;
    const padding = Math.max(0, contentWidth - versionText.length);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    const versionLine = `│${' '.repeat(leftPadding)}${versionText}${' '.repeat(rightPadding)}│`;
    
    const banner = `
╭────────────────────────────────╮
│                                │
│   ██╗  ██╗      ███████╗██╗    │
│   ╚██╗██╔╝      ██╔════╝██║    │
│    ╚███╔╝ █████╗█████╗  ██║    │
│    ██╔██╗ ╚════╝██╔══╝  ██║    │
│   ██╔╝ ██╗      ██║     ██║    │
│   ╚═╝  ╚═╝      ╚═╝     ╚═╝    │
${versionLine}
╰────────────────────────────────╯
`;
    
    // Use console.log instead of logger to ensure banner always shows
    console.log(banner);
}

if (require.main === module) {
    initCLI();
    
    // After CLI parsing, logger will be updated during main() execution
    // The LoggerProvider is already initialized with a default logger
}

const executionLogPrefix = '';
const repoPath = path.resolve(options.dir || '.');

// 🎯 READ CORRELATION ID FROM ENVIRONMENT (SET BY VSCODE)
const correlationId = process.env.XFI_CORRELATION_ID //|| LoggerProvider.generateLogPrefix();
const isVSCodeSpawned = process.env.XFI_VSCODE_MODE === 'true';

// Start execution context with consistent ID
// If VSCode provided a correlation ID, use it; otherwise generate new one
const executionId = correlationId || ExecutionContext.startExecution({
    component: 'CLI',
    operation: `${options.mode}-analyze`,
    archetype: options.archetype || 'node-fullstack',
    repoPath,
    metadata: {
        configServer: options.configServer,
        localConfigPath: options.localConfigPath,
        correlationId,
        spawnedBy: isVSCodeSpawned ? 'VSCode' : 'direct',
        parentCorrelationId: correlationId // Track original correlation ID if provided
    }
});

// 🎯 OVERRIDE EXECUTION ID IF CORRELATION ID PROVIDED BY VSCODE
if (correlationId) {
    // Use the provided correlation ID directly for consistency
    ExecutionContext['currentExecutionId'] = correlationId;
    const currentContext = ExecutionContext.getCurrentContext();
    if (currentContext) {
        ExecutionContext['currentContext'] = {
            ...currentContext,
            executionId: correlationId,
            metadata: {
                ...currentContext.metadata,
                correlationId,
                spawnedBy: 'VSCode',
                inheritedCorrelationId: true
            }
        };
    }
}

import json from 'prettyjson';

// Import the proxy logger that handles mode detection gracefully
import { logger as coreLogger } from '@x-fidelity/core';

// Module-level logger fallback - will be replaced in main() with proper mode-aware logger
let logger: ILogger = coreLogger;

// Function to handle errors and send telemetry
const handleError = async (error: Error) => {
    await sendTelemetry({
        eventType: 'execution failure',
        metadata: {
            archetype: options.archetype,
            repoPath: options.dir,
            telemetryData: undefined,
            errorMessage: error.message,
            errorStack: error.stack,
            options: {
                ...options,
                port: options.port?.toString()
            }
        },
        timestamp: new Date().toISOString()
    });
    logger.error('Execution failure', error);
};

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;


// Main function
export async function main() {
    try { 
        // 🎯 ENHANCED LOG LEVEL INITIALIZATION AND PROPAGATION
        const logLevel = (process.env.XFI_LOG_LEVEL as LogLevel) || 'info';
        
        // Initialize proper logger for CLI execution with current mode and options
        const logFilePath = path.join(repoPath, '.xfiResults', 'x-fidelity.log');
        const fileLoggingOptions = options.enableFileLogging === true ? {
            enableFileLogging: true,
            filePath: logFilePath
        } : undefined;
        
        // Get the current execution mode safely
        const currentMode = LoggerProvider.getCurrentExecutionMode();
        
        // 🎯 PROPAGATE LOG LEVEL TO ALL PLUGINS AND PACKAGES
        LoggerProvider.setLoggerForMode(currentMode, logLevel, fileLoggingOptions);
        logger = LoggerProvider.getLogger();
        
        // 🎯 LOG THE INITIALIZATION FOR VISIBILITY WITH CORRELATION INFO
        const currentCorrelationId = ExecutionContext.getCurrentExecutionId();
        const contextInfo = ExecutionContext.getCurrentContext();
        
        logger.info(`📊 CLI initialized with log level: ${logLevel.toUpperCase()} (mode: ${currentMode})`, {
            correlationId: currentCorrelationId,
            spawnedBy: contextInfo?.metadata?.spawnedBy,
            inheritedCorrelationId: contextInfo?.metadata?.inheritedCorrelationId
        });
        logger.info(`🔌 All plugins and packages will use log level: ${logLevel.toUpperCase()}`, {
            correlationId: currentCorrelationId
        });
        
        // 🎯 LOG CORRELATION ID INHERITANCE IF FROM VSCODE
        if (correlationId && isVSCodeSpawned) {
            logger.info(`🔗 Using correlation ID from VSCode: ${correlationId}`, {
                correlationId: currentCorrelationId,
                spawnedBy: 'VSCode',
                originalCorrelationId: correlationId
            });
        }
        
        if (options.examine && process.env.NODE_ENV !== 'test') {
            validateArchetypeConfig();
        } else {
            // Display banner at the start
            if (process.env.NODE_ENV !== 'test') {
                displayBanner();
                console.log('Startup options', { options });
            }
            
            if (options.mode === 'server') {
                await startServer({ 
                    customPort: options.port?.toString(), 
                    executionLogPrefix 
                });
            } else {
            
                const resultMetadata: ResultMetadata = await analyzeCodebase({
                    repoPath,
                    archetype: options.archetype || 'node-fullstack',
                    configServer: options.configServer,
                    localConfigPath: options.localConfigPath,
                    executionLogPrefix: executionId, // Use execution ID as prefix
                    logger: logger,
                    version: cliVersion // Pass CLI version
                });

                logger.info(`PERFORMANCE: Rule executions took ${resultMetadata.XFI_RESULT.durationSeconds} seconds`);

                const reportGenerationStartTime = new Date().getTime();

                let prettyResult = json.render(resultMetadata.XFI_RESULT);
                let resultString = JSON.stringify(resultMetadata);
                
                const reportGenerationdurationSeconds = ((new Date().getTime()) - reportGenerationStartTime) / 1000;
                logger.info(`PERFORMANCE: Report generation took ${reportGenerationdurationSeconds} seconds`);

                // Handle structured output mode (completely additive - no impact on existing behavior)
                if (options.outputFormat === 'json') {
                    try {
                        const outputPath = options.outputFile || path.join(repoPath, '.xfiResults', 'structured-output.json');
                        
                        // Ensure directory exists
                        await fs.mkdir(path.dirname(outputPath), { recursive: true });
                        
                        // Write structured JSON output
                        await fs.writeFile(outputPath, JSON.stringify(resultMetadata, null, 2));
                        
                        // If no output file specified, also write to stdout for programmatic use
                        if (!options.outputFile) {
                            console.log('STRUCTURED_OUTPUT_START');
                            console.log(JSON.stringify(resultMetadata));
                            console.log('STRUCTURED_OUTPUT_END');
                        }
                        
                        logger.debug(`Structured output written to: ${outputPath}`);
                    } catch (structuredOutputError) {
                        // Don't fail the entire CLI if structured output fails - just warn
                        logger.warn('Failed to write structured output:', structuredOutputError);
                    }
                }

                // Get the logger with execution ID prefixing for final output
                // if results are found, there were issues found in the codebase
                if (resultMetadata.XFI_RESULT.totalIssues > 0) {
                    logger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
                    
                    // Create a more detailed summary of issues
                    const issueSummary = {
                        issueSummary: {
                            totalIssues: resultMetadata.XFI_RESULT.totalIssues,
                            warningCount: resultMetadata.XFI_RESULT.warningCount,
                            fatalityCount: resultMetadata.XFI_RESULT.fatalityCount,
                            errorCount: resultMetadata.XFI_RESULT.errorCount,
                            exemptCount: resultMetadata.XFI_RESULT.exemptCount,
                            topIssues: resultMetadata.XFI_RESULT.issueDetails
                                .slice(0, 5)
                                .map((detail: IssueDetail) => ({
                                    filePath: detail.filePath,
                                    errors: detail.errors.map((err: RuleFailure) => ({
                                        rule: err.ruleFailure,
                                        level: err.level || 'error' as ErrorLevel,
                                        message: err.details?.message || ''
                                    }))
                                }))
                        },
                    };
                    
                    logger.debug(JSON.stringify(issueSummary, null, 2));

                    if (resultMetadata.XFI_RESULT.errorCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        logger.info(resultString);
                        logger.error(`\n${prettyResult}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(1);
                    }

                    if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        logger.info(resultString);
                        logger.error(`\n${prettyResult}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(1);
                    } else {
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                        logger.info(resultString);
                        logger.warn(`\n${prettyResult}\n\n`);
                        logger.warn(outcomeMessage('Please review the warnings above.'));
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(0);
                    }
                } else {
                    logger.info(outcomeMessage('HIGH FIDELITY codebase detected! No issues were found in the codebase.'));
                    logger.info(resultString);
                    logger.info(`\n${prettyResult}\n\n`);
                    logger.info(outcomeMessage('HIGH FIDELITY codebase detected! No issues were found in the codebase.'));
                    
                    // Add a delay to ensure all async logging operations complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    process.exit(0);
                }
            }
        }
    } catch (error) {
        await handleError(error as Error);
        
        // Try to flush logger before exit if available
        try {
            if (logger && 'flush' in logger && typeof logger.flush === 'function') {
                await logger.flush();
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (flushError) {
            // Ignore flush errors during error handling
        }
        
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
