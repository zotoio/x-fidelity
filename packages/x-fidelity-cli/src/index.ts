#!/usr/bin/env node

// Set max listeners early to prevent warnings when multiple workers are created
process.setMaxListeners(20);

import { 
    analyzeCodebase, 
    sendTelemetry, 
    validateArchetypeConfig,
    ExecutionContext,
    LoggerProvider
} from '@x-fidelity/core';

import { PinoLogger } from './utils/pinoLogger';
import { LogLevel } from '@x-fidelity/types';
import path from 'path';
import fs from 'fs/promises';

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

// Create CLI logger instance and inject it
const logger = new PinoLogger({
    level: (process.env.XFI_LOG_LEVEL as LogLevel) || 'info',
    enableConsole: true,
    enableColors: true
});

// Set the logger provider to use CLI's pino logger immediately
LoggerProvider.setLogger(logger);

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
}

const executionLogPrefix = '';

import json from 'prettyjson';

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

logger.debug('Startup options', { options });

// Main function
export async function main() {
    try { 
        if (options.examine && process.env.NODE_ENV !== 'test') {
            validateArchetypeConfig();
        } else {
            // Display banner at the start
            if (process.env.NODE_ENV !== 'test') {
                displayBanner();
            }
            
            if (options.mode === 'server') {
                await startServer({ 
                    customPort: options.port?.toString(), 
                    executionLogPrefix 
                });
            } else {
                const repoPath = path.resolve(options.dir || '.');
                const logFilePath = path.join(repoPath, '.xfiResults', 'x-fidelity.log');
                
                // Start execution context with consistent ID
                const executionId = ExecutionContext.startExecution({
                    component: 'CLI',
                    operation: 'client-analyze',
                    archetype: options.archetype || 'node-fullstack',
                    repoPath,
                    metadata: {
                        configServer: options.configServer,
                        localConfigPath: options.localConfigPath
                    }
                });
                
                // Create logger with file output for analysis
                const analysisLogger = new PinoLogger({
                    level: (process.env.XFI_LOG_LEVEL as LogLevel) || 'info',
                    enableConsole: true,
                    enableColors: true,
                    enableFile: true,
                    filePath: logFilePath
                });

                // Update the logger provider to use CLI's pino logger with file output
                LoggerProvider.setLogger(analysisLogger);

                logger.info('🚀 Starting codebase analysis');

                const resultMetadata: ResultMetadata = await analyzeCodebase({
                    repoPath,
                    archetype: options.archetype || 'node-fullstack',
                    configServer: options.configServer,
                    localConfigPath: options.localConfigPath,
                    executionLogPrefix: executionId, // Use execution ID as prefix
                    logger: analysisLogger
                });

                logger.info(`PERFORMANCE: Rule executions took ${resultMetadata.XFI_RESULT.durationSeconds} seconds`);

                const reportGenerationStartTime = new Date().getTime();

                let resultString = JSON.stringify(resultMetadata);
                let prettyResult = json.render(resultMetadata.XFI_RESULT);

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
                const outputLogger = LoggerProvider.getLogger();

                // if results are found, there were issues found in the codebase
                if (resultMetadata.XFI_RESULT.totalIssues > 0) {
                    outputLogger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
                    
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
                    
                    outputLogger.debug(JSON.stringify(issueSummary, null, 2));

                    if (resultMetadata.XFI_RESULT.errorCount > 0) {
                        outputLogger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        outputLogger.info(resultString);
                        outputLogger.error(`\n${prettyResult}\n\n`);
                        outputLogger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        
                        // Flush logger before exit
                        if (analysisLogger.flush) {
                            await analysisLogger.flush();
                        }
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(1);
                    }

                    if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                        outputLogger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        outputLogger.info(resultString);
                        outputLogger.error(`\n${prettyResult}\n\n`);
                        outputLogger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        
                        // Flush logger before exit
                        if (analysisLogger.flush) {
                            await analysisLogger.flush();
                        }
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(1);
                    } else {
                        outputLogger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                        outputLogger.info(resultString);
                        outputLogger.warn(`\n${prettyResult}\n\n`);
                        outputLogger.warn(outcomeMessage('Please review the warnings above.'));
                        
                        // Flush logger before exit
                        if (analysisLogger.flush) {
                            await analysisLogger.flush();
                        }
                        
                        // Add a delay to ensure all async logging operations complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        process.exit(0);
                    }
                } else {
                    outputLogger.info(outcomeMessage('HIGH FIDELITY APPROVED! No issues were found in the codebase.'));
                    outputLogger.info(resultString);
                    outputLogger.info(`\n${prettyResult}\n\n`);
                    outputLogger.info(outcomeMessage('HIGH FIDELITY APPROVED! No issues were found in the codebase.'));
                    
                    // Flush logger before exit
                    if (analysisLogger.flush) {
                        await analysisLogger.flush();
                    }
                    
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
            const currentLogger = LoggerProvider.getLogger();
            if (currentLogger.flush) {
                await currentLogger.flush();
            }
        } catch (flushError) {
            // Ignore flush errors during error handling
        }
        
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
