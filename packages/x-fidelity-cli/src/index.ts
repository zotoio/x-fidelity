#!/usr/bin/env node

import { 
    analyzeCodebase, 
    sendTelemetry, 
    validateArchetypeConfig,
    ExecutionContext,
    LoggerProvider 
} from '@x-fidelity/core';

import { PinoLogger } from './utils/pinoLogger';
import { LogLevel, ILogger, EXECUTION_MODES } from '@x-fidelity/types';
import path from 'path';
import fs from 'fs/promises';
import { version as cliVersion } from '../package.json';
import { startServer } from '@x-fidelity/server';
import { initCLI, options } from './cli';
import { version } from '../package.json';  
import { colorizeYamlString } from '@x-fidelity/core';

// Single point of logger initialization
async function initializeLogging(): Promise<ILogger> {
    // Disable auto-prefixing IMMEDIATELY for CLI mode
    LoggerProvider.setAutoPrefixing(false);
    
    // Initialize universal logging
    LoggerProvider.initializeForPlugins();
    
    // Get log level early
    const logLevel = (process.env.XFI_LOG_LEVEL as LogLevel) || 'info';
    
    // Register logger factory for CLI mode
    LoggerProvider.registerLoggerFactory(EXECUTION_MODES.CLI, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
        return new PinoLogger({
            level,
            enableConsole: true,
            enableColors: true,
            enableFile: options?.enableFileLogging || false,
            filePath: options?.filePath
        });
    });
    
    // Get current execution mode
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    
    // Set up file logging if needed
    const repoPath = path.resolve(options.dir || '.');
    const logFilePath = path.join(repoPath, '.xfiResults', 'x-fidelity.log');
    const fileLoggingOptions = options.enableFileLogging === true ? {
        enableFileLogging: true,
        filePath: logFilePath
    } : undefined;
    
    // Set logger for current mode
    LoggerProvider.setLoggerForMode(currentMode, logLevel, fileLoggingOptions);
    
    return LoggerProvider.getLogger();
}

// Single point of execution context initialization
function initializeExecutionContext(): string {
    const repoPath = path.resolve(options.dir || '.');
    const correlationId = process.env.XFI_CORRELATION_ID;
    const isVSCodeSpawned = process.env.XFI_VSCODE_MODE === 'true';
    
    let executionId: string;
    
    if (correlationId) {
        // Use provided correlation ID from VSCode
        executionId = correlationId;
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
    } else {
        // Generate new execution ID
        executionId = ExecutionContext.startExecution({
            component: 'CLI',
            operation: `${options.mode}-analyze`,
            archetype: options.archetype || 'node-fullstack',
            repoPath,
            metadata: {
                configServer: options.configServer,
                localConfigPath: options.localConfigPath,
                spawnedBy: isVSCodeSpawned ? 'VSCode' : 'direct'
            }
        });
    }
    
    return executionId;
}

// Graceful shutdown handler
async function gracefulShutdown(logger: ILogger, exitCode: number = 0, error?: Error): Promise<void> {
    try {
        // Flush logger if it supports flushing
        if (logger && 'flush' in logger && typeof logger.flush === 'function') {
            await logger?.flush();
        }

        // In test environment, exit immediately for proper test assertions
        if (process.env.NODE_ENV === 'test') {
            process.exit(exitCode);
            return;
        }

        // Small delay to ensure all async operations complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Flush stdout and stderr
        process.stdout.write('', () => {
            process.stderr.write('', () => {
            process.exit(exitCode);
            });
        });
    } catch (error) {
        // If graceful shutdown fails, force exit
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}

// Enhanced error handler with proper async handling
async function handleError(error: Error, logger: ILogger): Promise<void> {
    try {
        // Safely access options with fallbacks for test environments
        const safeOptions = options || {};
        await sendTelemetry({
            eventType: 'execution failure',
            metadata: {
                archetype: safeOptions.archetype || 'unknown',
                repoPath: safeOptions.dir || process.cwd(),
                telemetryData: undefined,
                errorMessage: error.message,
                errorStack: error.stack,
                options: {
                    ...safeOptions,
                    port: safeOptions.port?.toString()
                }
            },
            timestamp: new Date().toISOString()
        });
        
        logger.error('Execution failure', { message: error.message, stack: error.stack });
        
        // Ensure error is logged before shutdown
        await gracefulShutdown(logger, 1);
    } catch (telemetryError) {
        logger.error('Failed to send telemetry:', telemetryError);
        logger.error('Original error:', error);
        await gracefulShutdown(logger, 1);
    }
}

function displayBanner(): void {
    const borderWidth = 34;
    const contentWidth = borderWidth - 2;
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
    
    console.log(banner);
}

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;

// Main function with proper ordering.
export async function main(skipCLIInit = false): Promise<void> {
    let logger: ILogger;
    // Step 1: Initialize CLI if not already done
    if (require.main === module && !skipCLIInit) {
        initCLI();
        return; // Exit early - CLI will handle execution via action handlers
    }

    // Step 2: Initialize logging FIRST
    logger = await initializeLogging();

    try {
        // Step 3: Initialize execution context
        const executionId = initializeExecutionContext();
        
        // Step 4: Log initialization with correlation info
        const currentCorrelationId = ExecutionContext.getCurrentExecutionId();
        const contextInfo = ExecutionContext.getCurrentContext();
        const logLevel = (process.env.XFI_LOG_LEVEL as LogLevel) || 'info';
        const currentMode = LoggerProvider.getCurrentExecutionMode();
        
        logger.debug(`📊 CLI initialized with log level: ${logLevel.toUpperCase()} (mode: ${currentMode})`, {
            correlationId: currentCorrelationId,
            spawnedBy: contextInfo?.metadata?.spawnedBy,
            inheritedCorrelationId: contextInfo?.metadata?.inheritedCorrelationId
        });
        
        if (currentCorrelationId && process.env.XFI_VSCODE_MODE === 'true') {
            logger.info(`🔗 Using correlation ID from VSCode: ${currentCorrelationId}`, {
                correlationId: currentCorrelationId,
                spawnedBy: 'VSCode'
            });
        }
        
        // Step 5: Handle different execution modes
        if (options.examine && process.env.NODE_ENV !== 'test') {
            validateArchetypeConfig();
            await gracefulShutdown(logger, 0);
            return;
        }
        
        // Display banner.
        if (process.env.NODE_ENV !== 'test') {
            displayBanner();
            console.log('Startup options', { options });
        }
        
        if (options.mode === 'server') {
            await startServer({ 
                customPort: options.port?.toString(), 
                executionLogPrefix: executionId 
            });
            return; // Server mode doesn't exit
        }
        
        // Step 6: Analyze codebase
        const repoPath = path.resolve(options.dir || '.');
        const resultMetadata = await analyzeCodebase({
            repoPath,
            archetype: options.archetype || 'node-fullstack',
            configServer: options.configServer,
            localConfigPath: options.localConfigPath,
            executionLogPrefix: executionId,
            logger: logger,
            version: cliVersion
        });
        
        logger.info(`PERFORMANCE: Rule executions took ${resultMetadata.XFI_RESULT.durationSeconds} seconds`);
        
        // Step 7: Generate reports
        const reportGenerationStartTime = Date.now();
        await generateReports(resultMetadata, logger, repoPath);
        const reportDuration = (Date.now() - reportGenerationStartTime) / 1000;
        logger.info(`PERFORMANCE: Report generation took ${reportDuration} seconds`);
        
        // Step 8: Handle results and exit
        await handleResults(resultMetadata, logger);
        
    } catch (error) {
        // Ensure we have a logger for error handling
        if (!logger) {
            console.error('Failed to initialize logger:', error);
            process.exit(1);
        }
        await handleError(error as Error, logger);
    }
}

async function generateReports(resultMetadata: any, logger: ILogger, repoPath: string): Promise<void> {
    // Handle structured output mode
    if (options.outputFormat === 'json') {
        try {
            const outputPath = options.outputFile || path.join(repoPath, '.xfiResults', 'structured-output.json');
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            
            // Write structured JSON output
            await fs.writeFile(outputPath, JSON.stringify(resultMetadata, null, 2));
            
            // If no output file specified, also write to stdout
            if (!options.outputFile) {
                console.log('STRUCTURED_OUTPUT_START');
                console.log(JSON.stringify(resultMetadata));
                console.log('STRUCTURED_OUTPUT_END');
            }
            
            logger.debug(`Structured output written to: ${outputPath}`);
        } catch (structuredOutputError) {
            logger.warn('Failed to write structured output:', structuredOutputError);
        }
    }
}

async function handleResults(resultMetadata: any, logger: ILogger): Promise<void> {
    //const json = await import('prettyjson');
    let resultString = '';
    let prettyResult = '';

    try {
        const jsonToYaml = await import('json-to-pretty-yaml');
        const yamlResult = jsonToYaml.stringify(resultMetadata);
        
        //loadLanguages(['yaml']);
        resultString = JSON.stringify(resultMetadata);
        //prettyResult = Prism.highlight(yamlResult, Prism.languages.yaml, 'yaml');

        prettyResult = colorizeYamlString(yamlResult);
        //console.log(prettyResult);
        //const prettyResultString = Prism.highlight(resultString, Prism.languages.json, 'json');
        //const prettyResult = json?.default?.render?.(resultMetadata.XFI_RESULT);

        //const resultString = JSON.stringify(resultMetadata);
    } catch (error) {
        console.error('Failed to handle results:', error);
    }
    
    if (resultMetadata.XFI_RESULT.totalIssues > 0) {
        logger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
        
        // Create detailed summary
        const issueSummary = {
            issueSummary: {
                totalIssues: resultMetadata.XFI_RESULT.totalIssues,
                warningCount: resultMetadata.XFI_RESULT.warningCount,
                fatalityCount: resultMetadata.XFI_RESULT.fatalityCount,
                errorCount: resultMetadata.XFI_RESULT.errorCount,
                exemptCount: resultMetadata.XFI_RESULT.exemptCount,
                topIssues: resultMetadata.XFI_RESULT.issueDetails
                    .slice(0, 5)
                    .map((detail: any) => ({
                        filePath: detail.filePath,
                        errors: detail.errors.map((err: any) => ({
                            rule: err.ruleFailure,
                            level: err.level || 'error',
                            message: err.details?.message || ''
                        }))
                    }))
            }
        };
        
        logger.debug(JSON.stringify(issueSummary, null, 2));
        
        if (resultMetadata.XFI_RESULT.errorCount > 0) {
            logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
            logger.error(resultString);
            logger.error(`\n${prettyResult}\n\n`);
            logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
            await gracefulShutdown(logger, 1, new Error('Unexpected execution errors detected'));
        } else if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
            logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
            logger.error(resultString);
            logger.error(`\n${prettyResult}\n\n`);
            logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
            await gracefulShutdown(logger, 1, new Error('Fatalities detected during analysis'));
        } else {
            logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
            logger.warn(resultString);
            logger.warn(`\n${prettyResult}\n\n`);
            logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
            await gracefulShutdown(logger, 0);
        }
    } else {
        logger.info(outcomeMessage('HIGH FIDELITY codebase detected! No issues were found in the codebase.'));
        logger.info(resultString);
        logger.info(`\n${prettyResult}\n\n`);
        logger.info(outcomeMessage('HIGH FIDELITY codebase detected! No issues were found in the codebase.'));
        await gracefulShutdown(logger, 0);
    }
}

// Export everything needed, resolving export ambiguity for AstResult
export { AstResult } from '@x-fidelity/types';
export * from '@x-fidelity/types';
export * from '@x-fidelity/plugins';
export * from '@x-fidelity/core';

// Entry point
if (require.main === module) {
    main();
}