#!/usr/bin/env node
import { 
    logger, 
    getLogPrefix, 
    setLogLevel, 
    analyzeCodebase, 
    sendTelemetry, 
    validateArchetypeConfig,
} from '@x-fidelity/core';

import { startServer } from '@x-fidelity/server';

import type {
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    FileData,
    ErrorLevel
} from '@x-fidelity/types';

import { initCLI, options } from './cli';
import { version } from '../package.json';

// Re-export all types
export type {
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    FileData,
    ErrorLevel
};

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
    setLogLevel(process.env.XFI_LOG_LEVEL || 'info');
    initCLI();
}

const executionLogPrefix = getLogPrefix();

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
    logger.error(error, 'Execution failure');
};

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;

logger.debug({ options }, 'Startup options');

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
                const resultMetadata: ResultMetadata = await analyzeCodebase({
                    repoPath: options.dir || '.',
                    archetype: options.archetype || 'node-fullstack',
                    configServer: options.configServer,
                    localConfigPath: options.localConfigPath,
                    executionLogPrefix
                });

                logger.info(`PERFORMANCE: Rule executions took ${resultMetadata.XFI_RESULT.durationSeconds} seconds`);

                const reportGenerationStartTime = new Date().getTime();

                let resultString = JSON.stringify(resultMetadata);
                let prettyResult = json.render(resultMetadata.XFI_RESULT);

                const reportGenerationdurationSeconds = ((new Date().getTime()) - reportGenerationStartTime) / 1000;
                logger.info(`PERFORMANCE: Report generation took ${reportGenerationdurationSeconds} seconds`);

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
                        process.exit(1);
                    }

                    if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        logger.info(resultString);
                        logger.error(`\n${prettyResult}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        process.exit(1);
                    } else {
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                        logger.info(resultString);
                        logger.warn(`\n${prettyResult}\n\n`);
                        logger.warn(outcomeMessage('Please review the warnings above.'));
                        process.exit(0);
                    }
                } else {
                    logger.info(outcomeMessage('HIGH FIDELITY APPROVED! No issues were found in the codebase.'));
                    logger.info(resultString);
                    logger.info(`\n${prettyResult}\n\n`);
                    logger.info(outcomeMessage('HIGH FIDELITY APPROVED! No issues were found in the codebase.'));
                    process.exit(0);
                }
            }
        }
    } catch (error) {
        await handleError(error as Error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
