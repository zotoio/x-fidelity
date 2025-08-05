import fs from 'fs/promises';
import path from 'path';
import { ResultMetadata } from '@x-fidelity/types';
import { options } from '../core/options';
import { getFormattedDate } from '../utils/utils';
import { logger } from '../utils/logger';

interface MetricsData {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
}

interface RuleFailureCount {
    rule: string;
    count: number;
}

interface FileIssueCount {
    file: string;
    count: number;
}

interface FunctionComplexityIssue {
    file: string;
    function: string;
    cyclomaticComplexity?: number;
    cognitiveComplexity?: number;
    nestingDepth?: number;
    parameterCount?: number;
    returnCount?: number;
    line?: number;
}

interface DependencyIssue {
    dependency: string;
    currentVersion: string;
    requiredVersion: string;
}

interface SensitiveDataIssue {
    file: string;
    pattern: string;
    line: number;
}

export class ReportGenerator {
    private data: ResultMetadata;
    private repoName: string;
    private githubHostname: string;
    private reportDate: string;

    /**
     * Creates a localized timestamp with GMT offset for user-facing reports
     */
    private createLocalizedTimestamp(): string {
        const now = new Date();
        
        // Get timezone offset in minutes and convert to GMT offset format
        const offsetMinutes = now.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes <= 0 ? '+' : '-';
        const offsetString = `GMT${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`;
        
        // Format as local date and time with GMT offset
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes} ${offsetString}`;
    }

    constructor(data: ResultMetadata) {
        this.data = data;
        this.repoName = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('.git')[0] || '';
        this.githubHostname = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('/')[0] || '';
        // Use local date format for report date (YYYY-MM-DD)
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        this.reportDate = `${year}-${month}-${day}`;
    }

    public generateReport(): string {
        const report: string[] = [];

        report.push(this.generateHeader());
        report.push(this.generateExecutiveSummary());
        report.push(this.generateRepositoryOverview());
        report.push(this.generateTopRuleFailures());
        report.push(this.generateFilesWithMostIssues());
        report.push(this.generateFactMetricsPerformance());
        report.push(this.generateTopCriticalIssues());
        report.push(this.generateFunctionComplexityIssues());
        report.push(this.generateDependencyIssues());
        report.push(this.generateSensitiveDataIssues());
        report.push(this.generateOtherGlobalIssues());
        report.push(this.generateAllIssuesWithAnchors());

        return report.join('\n\n');
    }

    private generateHeader(): string {
        const timestamp = this.createLocalizedTimestamp();
        
        return `# X-Fidelity Analysis Report
Generated for: ${this.repoName} on ${timestamp}`;
    }

    private generateExecutiveSummary(): string {
        const { totalIssues, warningCount, errorCount, fatalityCount, exemptCount, fileCount } = this.data.XFI_RESULT;
        const filesWithIssues = this.data.XFI_RESULT.issueDetails.length;
        const successfulFiles = fileCount - filesWithIssues;
        const successRate = fileCount > 0 ? ((successfulFiles / fileCount) * 100).toFixed(1) : '0.0';
        const version = this.data.XFI_RESULT.xfiVersion || 'Unknown';
        const duration = this.data.XFI_RESULT.durationSeconds || 0;

        return `## Executive Summary

This report presents the results of an X-Fidelity analysis conducted on the repository \`${this.data.XFI_RESULT.repoUrl}\`. The analysis identified **${totalIssues} total issues**, including:
- ${warningCount} warnings
- ${fatalityCount} fatalities
- ${errorCount} errors
- ${exemptCount} exempt issues

Out of ${fileCount} total files, ${successfulFiles} (${successRate}%) have no issues. The analysis was conducted using X-Fidelity version ${version} and took approximately ${duration.toFixed(2)} seconds to complete.`;
    }

    private generateRepositoryOverview(): string {
        const { fileCount } = this.data.XFI_RESULT;
        const filesWithIssues = this.data.XFI_RESULT.issueDetails.length;
        const successfulFiles = fileCount - filesWithIssues;
        const { totalIssues, warningCount, errorCount, fatalityCount, exemptCount } = this.data.XFI_RESULT;

        return `## Repository Overview

### File Status

\`\`\`mermaid
pie
    title File Status
    "Files with Issues" : ${filesWithIssues}
    "Successful Files" : ${successfulFiles}
\`\`\`

### Issue Distribution

\`\`\`mermaid
pie
    title Issue Distribution
    "Warnings" : ${warningCount}
    "Fatalities" : ${fatalityCount}
    "Errors" : ${errorCount}
    "Exempt" : ${exemptCount}
\`\`\``;
    }

    private generateTopRuleFailures(): string {
        const ruleFailures = new Map<string, number>();
        
        // Count rule failures
        this.data.XFI_RESULT.issueDetails.forEach(detail => {
            detail.errors.forEach(error => {
                const rule = error.ruleFailure || 'unknown-rule';
                const count = ruleFailures.get(rule) || 0;
                ruleFailures.set(rule, count + 1);
            });
        });

        // Sort by count and get top failures
        const sortedFailures = Array.from(ruleFailures.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([rule, count]) => ({ rule: this.truncateRuleName(rule), count }));

        if (sortedFailures.length === 0) {
            return `## Top Rule Failures

No rule failures detected in the analysis.`;
        }

        const ganttData = sortedFailures.map(item => 
            `    ${item.rule} :0, ${item.count}`
        ).join('\n');

        return `## Top Rule Failures

The following chart shows the most frequent rule failures detected in the analysis:

\`\`\`mermaid
gantt
    title Top Rule Failures
    dateFormat X
    axisFormat %s
    section Rule Failures
${ganttData}
\`\`\``;
    }

    private generateFilesWithMostIssues(): string {
        const fileIssues = new Map<string, number>();
        
        // Count issues per file
        this.data.XFI_RESULT.issueDetails.forEach(detail => {
            const fileName = path.basename(detail.filePath);
            const count = fileIssues.get(fileName) || 0;
            fileIssues.set(fileName, count + detail.errors.length);
        });

        // Sort by count and get top files
        const sortedFiles = Array.from(fileIssues.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([file, count]) => ({ file, count }));

        if (sortedFiles.length === 0) {
            return '';
        }

        const ganttData = sortedFiles.map(item => 
            `    ${item.file} :0, ${item.count}`
        ).join('\n');

        return `## Files with Most Issues

The following chart shows which files have the most issues:

\`\`\`mermaid
gantt
    title Files with Most Issues
    dateFormat X
    axisFormat %s
    section Files
${ganttData}
\`\`\``;
    }

    private generateFactMetricsPerformance(): string {
        const factMetrics = this.data.XFI_RESULT.factMetrics || {};
        const metrics = Object.entries(factMetrics)
            .filter(([, data]) => data.executionCount > 0)
            .sort(([, a], [, b]) => b.executionCount - a.executionCount);

        if (metrics.length === 0) {
            return '';
        }

        // Execution count chart
        const executionCountData = metrics.map(([name, data]) => 
            `    ${name} :0, ${data.executionCount}`
        ).join('\n');

        // Execution time pie chart  
        const timeMetrics = metrics
            .filter(([, data]) => data.totalExecutionTime > 0)
            .sort(([, a], [, b]) => b.totalExecutionTime - a.totalExecutionTime);

        const timeData = timeMetrics.map(([name, data]) => 
            `    "${name} (avg ${(data.totalExecutionTime / data.executionCount).toFixed(3)}s)" : ${data.totalExecutionTime.toFixed(3)}`
        ).join('\n');

        return `## Fact Metrics Performance

### Execution Count

\`\`\`mermaid
gantt
    title Fact Analyzer Execution Count
    dateFormat X
    axisFormat %s
    section Execution Count
${executionCountData}
\`\`\`

### Execution Time (seconds)

\`\`\`mermaid
pie
    title Fact Analyzer Execution Time (seconds)
${timeData}
\`\`\``;
    }

    private generateTopCriticalIssues(): string {
        // Look for OpenAI analysis results in the issue details
        const aiAnalysisIssues = this.data.XFI_RESULT.issueDetails
            .filter(detail => detail.errors.some(error => 
                error.ruleFailure?.includes('openai') || 
                error.details?.message?.includes('AI Analysis') ||
                error.message?.includes('AI Analysis')
            ))
            .slice(0, 5);

        if (aiAnalysisIssues.length === 0) {
            return `## Top 5 Critical Issues (AI Analysis)

No AI-powered critical issues analysis available. Consider enabling the OpenAI plugin for enhanced issue prioritization and detailed recommendations.`;
        }

        const criticalIssues = aiAnalysisIssues.map((detail, index) => {
            const error = detail.errors[0];
            const message = error.details?.message || error.message || 'AI-identified critical issue';
            const severity = this.extractSeverity(message) || (8 - index);
            const description = this.extractDescription(message);
            const files = this.extractFiles(message, detail.filePath);
            const suggestion = this.extractSuggestion(message);

            return `### ${index + 1}. ${this.extractTitle(message)} (Severity: ${severity})

**Description**: ${description}

**Files**: ${files}

**Suggestion**: ${suggestion}`;
        }).join('\n\n');

        return `## Top 5 Critical Issues (AI Analysis)

Based on the OpenAI analysis, these are the top 5 critical issues to address:

${criticalIssues}`;
    }

    private generateFunctionComplexityIssues(): string {
        // Look for function complexity issues
        const complexityIssues = this.data.XFI_RESULT.issueDetails
            .filter(detail => detail.errors.some(error => 
                error.ruleFailure?.includes('functionComplexity') ||
                error.ruleFailure?.includes('complexity')
            ))
            .flatMap(detail => 
                detail.errors
                    .filter(error => error.ruleFailure?.includes('functionComplexity') || error.ruleFailure?.includes('complexity'))
                    .map(error => this.parseComplexityIssue(detail.filePath, error))
            )
            .filter(issue => issue !== null);

        if (complexityIssues.length === 0) {
            return '';
        }

        const tableRows = complexityIssues.map(issue => {
            const githubLink = this.createGithubLink(issue.file, issue.line);
            return `| ${githubLink} | ${issue.function} | ${issue.cyclomaticComplexity || 'N/A'} | ${issue.cognitiveComplexity || 'N/A'} | ${issue.nestingDepth || 'N/A'} | ${issue.parameterCount || 'N/A'} | ${issue.returnCount || 'N/A'} |`;
        }).join('\n');

        return `## Function Complexity Issues

The analysis identified several functions with high complexity that should be refactored:

| File | Function | Cyclomatic Complexity | Cognitive Complexity | Nesting Depth | Parameter Count | Return Count |
|------|----------|------------------------|----------------------|--------------|----------------|--------------|
${tableRows}`;
    }

    private generateDependencyIssues(): string {
        // Look for dependency-related issues
        const dependencyIssues = this.data.XFI_RESULT.issueDetails
            .filter(detail => detail.errors.some(error => 
                error.ruleFailure?.includes('dependency') ||
                error.ruleFailure?.includes('version') ||
                error.ruleFailure?.includes('outdated')
            ))
            .flatMap(detail => 
                detail.errors
                    .filter(error => 
                        error.ruleFailure?.includes('dependency') ||
                        error.ruleFailure?.includes('version') ||
                        error.ruleFailure?.includes('outdated')
                    )
                    .map(error => this.parseDependencyIssue(error))
            )
            .filter(issue => issue !== null);

        if (dependencyIssues.length === 0) {
            return '';
        }

        const tableRows = dependencyIssues.map(issue => 
            `| ${issue.dependency} | ${issue.currentVersion} | ${issue.requiredVersion} |`
        ).join('\n');

        return `## Dependency Issues

The analysis detected outdated framework dependencies that need updating:

| Dependency | Current Version | Required Version |
|------------|-----------------|------------------|
${tableRows}`;
    }

    private generateSensitiveDataIssues(): string {
        // Look for sensitive data issues
        const sensitiveIssues = this.data.XFI_RESULT.issueDetails
            .filter(detail => detail.errors.some(error => 
                error.ruleFailure?.includes('sensitive') ||
                error.ruleFailure?.includes('logging') ||
                error.ruleFailure?.includes('secret')
            ))
            .flatMap(detail => 
                detail.errors
                    .filter(error => 
                        error.ruleFailure?.includes('sensitive') ||
                        error.ruleFailure?.includes('logging') ||
                        error.ruleFailure?.includes('secret')
                    )
                    .map(error => this.parseSensitiveDataIssue(detail.filePath, error))
            )
            .filter(issue => issue !== null);

        if (sensitiveIssues.length === 0) {
            return '';
        }

        const tableRows = sensitiveIssues.map(issue => {
            const githubLink = this.createGithubLink(issue.file, issue.line);
            return `| ${githubLink} | ${issue.pattern} | ${issue.line} |`;
        }).join('\n');

        return `## Sensitive Data Issues

Several files contain potentially sensitive data patterns that shouldn't be logged or exposed:

| File | Match Pattern | Line Number |
|------|--------------|-------------|
${tableRows}`;
    }

    private generateOtherGlobalIssues(): string {
        // Look for global/repository-level issues
        const globalIssues = this.data.XFI_RESULT.issueDetails
            .filter(detail => 
                detail.filePath === 'REPO_GLOBAL_CHECK' ||
                detail.errors.some(error => 
                    error.ruleFailure?.includes('global') ||
                    error.ruleFailure?.includes('repository') ||
                    error.ruleFailure?.includes('structure')
                )
            )
            .flatMap(detail => detail.errors);

        if (globalIssues.length === 0) {
            return '';
        }

        const issueList = globalIssues.map(error => {
            const level = error.level || 'warning';
            const message = error.details?.message || error.message || 'Global issue detected';
            return `- **${error.ruleFailure}** (${level}): ${message}`;
        }).join('\n');

        return `## Other Global Issues

${issueList}`;
    }

    /**
     * Generate a comprehensive issues section with unique anchors for direct linking
     * This is completely rule-agnostic and works with any custom rules
     */
    private generateAllIssuesWithAnchors(): string {
        const { issueDetails } = this.data.XFI_RESULT;
        
        if (issueDetails.length === 0) {
            return `## All Issues

No issues found in the analysis. Great job! 🎉`;
        }

        // Group issues by rule name dynamically
        const issuesByRule = new Map<string, Array<{
            detail: any;
            error: any;
            issueNumber: number;
        }>>();

        let issueCounter = 1;

        // Group all issues by rule name
        issueDetails.forEach(detail => {
            detail.errors.forEach(error => {
                const ruleName = error.ruleFailure || 'unknown-rule';
                
                if (!issuesByRule.has(ruleName)) {
                    issuesByRule.set(ruleName, []);
                }
                
                issuesByRule.get(ruleName)!.push({
                    detail,
                    error,
                    issueNumber: issueCounter
                });
                
                issueCounter++;
            });
        });

        // Generate sections for each rule
        const ruleSections: string[] = [];

        issuesByRule.forEach((issues, ruleName) => {
            const ruleSection = this.generateRuleSection(ruleName, issues);
            if (ruleSection) {
                ruleSections.push(ruleSection);
            }
        });

        if (ruleSections.length === 0) {
            return `## All Issues

No issues found in the analysis. Great job! 🎉`;
        }

        return `## All Issues

The following sections contain all issues found in the analysis, grouped by rule. Each issue has a unique anchor that allows direct linking from the VSCode extension.

${ruleSections.join('\n\n')}`;
    }

    /**
     * Generate a section for a specific rule with all its issues
     */
    private generateRuleSection(ruleName: string, issues: Array<{
        detail: any;
        error: any;
        issueNumber: number;
    }>): string {
        if (issues.length === 0) return '';

        // Check if this is a global rule (affects REPO_GLOBAL_CHECK)
        const isGlobalRule = issues.some(issue => 
            issue.detail.filePath === 'REPO_GLOBAL_CHECK' || 
            issue.detail.filePath.includes('global')
        );

        // Create section header with rule anchor
        const ruleId = this.generateRuleId(ruleName);
        const sectionTitle = this.formatRuleName(ruleName);
        let section = `### <a id="${ruleId}"></a>${sectionTitle} (${issues.length} issue${issues.length > 1 ? 's' : ''})\n\n`;

        // Add rule definition link if we can determine rule source
        const ruleLink = this.generateRuleDefinitionLink(ruleName);
        if (ruleLink) {
            section += `**Rule Definition:** ${ruleLink}\n\n`;
        }

        if (isGlobalRule) {
            // For global rules, list issues without file-specific tables
            section += this.generateGlobalRuleIssues(issues);
        } else {
            // For iterative rules, create a table with file links
            section += this.generateIterativeRuleTable(ruleName, issues);
        }

        // Add individual issue details with anchors
        section += '\n\n#### Individual Issues\n\n';
        issues.forEach(({ detail, error, issueNumber }) => {
            const issueBlock = this.generateIssueBlock(detail.filePath, error, issueNumber);
            section += issueBlock + '\n\n';
        });

        return section;
    }

    /**
     * Generate a table for iterative rules with file links
     */
    private generateIterativeRuleTable(ruleName: string, issues: Array<{
        detail: any;
        error: any;
        issueNumber: number;
    }>): string {
        // Extract common fields from the issues to build appropriate table columns
        const hasLineNumbers = issues.some(({ error }) => 
            error.details?.lineNumber || error.details?.details?.[0]?.lineNumber
        );

        // Build table header based on available data
        let tableHeader = '| File | Rule | Severity |';
        let tableSeparator = '|------|------|----------|';

        if (hasLineNumbers) {
            tableHeader += ' Line |';
            tableSeparator += '------|';
        }

        // Check for additional structured data that might be useful
        const hasMessage = issues.some(({ error }) => 
            error.details?.message || error.message
        );

        if (hasMessage) {
            tableHeader += ' Description |';
            tableSeparator += '-------------|';
        }

        tableHeader += '\n' + tableSeparator + '\n';

        // Build table rows
        const tableRows = issues.map(({ detail, error, issueNumber }) => {
            const fileName = path.basename(detail.filePath);
            const githubLink = this.createGithubLink(detail.filePath, 
                error.details?.lineNumber || error.details?.details?.[0]?.lineNumber);
            const severity = error.level || 'warning';
            
            let row = `| ${githubLink} | ${ruleName} | ${severity.toUpperCase()} |`;

            if (hasLineNumbers) {
                const lineNumber = error.details?.lineNumber || error.details?.details?.[0]?.lineNumber || '';
                row += ` ${lineNumber} |`;
            }

            if (hasMessage) {
                const message = this.extractCleanMessage(error);
                const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;
                row += ` ${truncatedMessage.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')} |`;
            }

            return row;
        }).join('\n');

        return `The following files contain issues for this rule:\n\n${tableHeader}${tableRows}\n`;
    }

    /**
     * Generate a list for global rules
     */
    private generateGlobalRuleIssues(issues: Array<{
        detail: any;
        error: any;
        issueNumber: number;
    }>): string {
        const issueList = issues.map(({ error }) => {
            const level = error.level || 'warning';
            const message = this.extractCleanMessage(error);
            return `- **${error.ruleFailure}** (${level}): ${message}`;
        }).join('\n');

        return `This rule applies globally to the repository:\n\n${issueList}\n`;
    }

    /**
     * Generate a markdown block for a single issue with anchor
     */
    private generateIssueBlock(filePath: string, error: any, issueNumber: number): string {
        const issueId = this.generateIssueId(filePath, error, issueNumber);
        const ruleFailure = error.ruleFailure || 'Unknown Rule';
        const level = error.level || 'warning';
        const message = this.extractAndFormatMessage(error);
        
        // Extract line and column information
        let lineInfo = '';
        
        if (error.details?.lineNumber) {
            lineInfo = `Line ${error.details.lineNumber}`;
        } else if (error.details?.details && Array.isArray(error.details.details)) {
            const firstDetail = error.details.details[0];
            if (firstDetail?.lineNumber) {
                lineInfo = `Line ${firstDetail.lineNumber}`;
            }
        }

        // Create GitHub link if available
        const githubLink = this.createGithubLink(filePath, 
            error.details?.lineNumber || error.details?.details?.[0]?.lineNumber);
        
        // Create severity badge
        const severityBadge = this.getSeverityBadge(level);
        
        // Create category info
        const categoryInfo = error.category && error.category !== 'general' ? 
            `**Category:** ${error.category}  \n` : '';

        // Create exemption info
        const exemptionInfo = error.exempted ? 
            `**Status:** ⚠️ Exempted  \n` : '';

        // Create fixable info
        const fixableInfo = error.fixable ? 
            `**Fixable:** 💡 Yes  \n` : '';

        return `#### <a id="${issueId}"></a>Issue #${issueNumber}: ${ruleFailure}

${severityBadge}

**File:** \`${filePath}\` ${lineInfo ? `(${lineInfo})` : ''}  
${categoryInfo}${exemptionInfo}${fixableInfo}**Rule:** \`${ruleFailure}\`  

**Description:**  
${message}

${githubLink !== path.basename(filePath) ? `**Source:** ${githubLink}` : ''}

---`;
    }

    /**
     * Extract and format message content, preserving markdown for rules like OpenAI
     */
    private extractAndFormatMessage(error: any): string {
        const rawMessage = error.details?.message || error.message || 'No description available';
        
        // Check if this looks like it's already markdown (e.g., from OpenAI analysis)
        if (this.isMarkdownContent(rawMessage)) {
            return rawMessage; // Return as-is for markdown content
        }
        
        return rawMessage; // Return plain text as-is
    }

    /**
     * Extract clean message for table display (strip markdown)
     */
    private extractCleanMessage(error: any): string {
        const rawMessage = error.details?.message || error.message || 'No description available';
        
        // Strip markdown formatting for table display
        return rawMessage
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic
            .replace(/`(.*?)`/g, '$1')       // Remove code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/#{1,6}\s/g, '')        // Remove headers
            .replace(/\n/g, ' ')             // Replace newlines with spaces
            .trim();
    }

    /**
     * Check if content appears to be markdown formatted
     */
    private isMarkdownContent(content: string): boolean {
        const markdownIndicators = [
            /\*\*.*?\*\*/,     // Bold
            /\*.*?\*/,         // Italic
            /#{1,6}\s/,        // Headers
            /```[\s\S]*?```/, // Code blocks
            /`.*?`/,           // Inline code
            /\[.*?\]\(.*?\)/,  // Links
            /^[-*+]\s/m,       // Lists
            /^\d+\.\s/m        // Numbered lists
        ];
        
        return markdownIndicators.some(pattern => pattern.test(content));
    }

    /**
     * Generate a unique issue ID for anchor linking
     */
    private generateIssueId(filePath: string, error: any, counter: number): string {
        const cleanFileName = path.basename(filePath).replace(/[^a-zA-Z0-9]/g, '-');
        const cleanRule = (error.ruleFailure || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
        const line = error.details?.lineNumber || error.details?.details?.[0]?.lineNumber || 1;
        
        return `issue-${counter}-${cleanFileName}-${cleanRule}-line-${line}`.toLowerCase();
    }

    /**
     * Generate a unique rule ID for anchor linking
     */
    private generateRuleId(ruleName: string): string {
        return `rule-${ruleName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    }

    /**
     * Generate a link to the rule definition JSON file
     */
    private generateRuleDefinitionLink(ruleName: string): string | null {
        // Try to find rule definition based on common patterns
        if (this.repoName) {
            // Look for common rule file patterns
            const possiblePaths = [
                `rules/${ruleName}.json`,
                `src/rules/${ruleName}.json`,
                `.xfi-config/${ruleName}.json`,
                `config/rules/${ruleName}.json`
            ];

            // Return link to the most likely location
            const rulePath = possiblePaths[0]; // Default to rules/ directory
            return `[${ruleName}.json](https://github.com/${this.repoName}/blob/main/${rulePath})`;
        }
        
        return null;
    }

    /**
     * Format rule name for display
     */
    private formatRuleName(ruleName: string): string {
        // Convert kebab-case or camelCase to Title Case
        return ruleName
            .replace(/[-_]/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    /**
     * Generate a severity badge for the issue
     */
    private getSeverityBadge(level: string): string {
        switch (level.toLowerCase()) {
            case 'fatal':
            case 'fatality':
                return '🔥 **FATAL**';
            case 'error':
                return '❌ **ERROR**';
            case 'warning':
                return '⚠️ **WARNING**';
            case 'info':
                return 'ℹ️ **INFO**';
            case 'hint':
                return '💡 **HINT**';
            default:
                return `📋 **${level.toUpperCase()}**`;
        }
    }

    // Helper methods
    private truncateRuleName(rule: string): string {
        if (rule.length > 30) {
            return rule.substring(0, 27) + '...';
        }
        return rule;
    }

    private createGithubLink(filePath: string, line?: number): string {
        // filePath is already relative to repo root
        const lineFragment = line ? `#L${line}` : '';
        if (this.repoName) {
            return `[${path.basename(filePath)}](https://github.com/${this.repoName}/blob/main/${filePath}${lineFragment})`;
        }
        return path.basename(filePath);
    }

    private extractSeverity(message: string): number | null {
        const match = message.match(/severity[:\s]+(\d+)/i);
        return match ? parseInt(match[1]) : null;
    }

    private extractDescription(message: string): string {
        // Extract description from AI analysis message
        const descMatch = message.match(/description[:\s]+(.*?)(?=\n\n|\*\*|$)/is);
        return descMatch ? descMatch[1].trim() : message.substring(0, 200) + '...';
    }

    private extractFiles(message: string, defaultFile: string): string {
        // Extract file references from AI analysis
        const fileMatch = message.match(/files?[:\s]+(.*?)(?=\n\n|\*\*|$)/is);
        if (fileMatch) {
            return fileMatch[1].trim();
        }
        return this.createGithubLink(defaultFile);
    }

    private extractSuggestion(message: string): string {
        // Extract suggestion from AI analysis
        const suggMatch = message.match(/suggestion[:\s]+(.*?)(?=\n\n|\*\*|$)/is);
        return suggMatch ? suggMatch[1].trim() : 'Review and refactor the identified code sections following best practices.';
    }

    private extractTitle(message: string): string {
        // Extract title from AI analysis
        const titleMatch = message.match(/^([^.\n]+)/);
        return titleMatch ? titleMatch[1].trim() : 'Critical Issue';
    }

    private parseComplexityIssue(filePath: string, error: any): FunctionComplexityIssue | null {
        try {
            const message = error.details?.message || error.message || '';
            const functionMatch = message.match(/function[:\s]+([^\s,]+)/i);
            const cyclomaticMatch = message.match(/cyclomatic[:\s]+(\d+)/i);
            const cognitiveMatch = message.match(/cognitive[:\s]+(\d+)/i);
            const lineMatch = message.match(/line[:\s]+(\d+)/i);

            return {
                file: filePath,
                function: functionMatch ? functionMatch[1] : 'unknown',
                cyclomaticComplexity: cyclomaticMatch ? parseInt(cyclomaticMatch[1]) : undefined,
                cognitiveComplexity: cognitiveMatch ? parseInt(cognitiveMatch[1]) : undefined,
                line: lineMatch ? parseInt(lineMatch[1]) : undefined
            };
        } catch (e) {
            return null;
        }
    }

    private parseDependencyIssue(error: any): DependencyIssue | null {
        try {
            const message = error.details?.message || error.message || '';
            const depMatch = message.match(/dependency[:\s]+([^\s,]+)/i) || message.match(/package[:\s]+([^\s,]+)/i);
            const currentMatch = message.match(/current[:\s]+([^\s,]+)/i) || message.match(/version[:\s]+([^\s,]+)/i);
            const requiredMatch = message.match(/required[:\s]+([^\s,]+)/i) || message.match(/expected[:\s]+([^\s,]+)/i);

            if (depMatch) {
                return {
                    dependency: depMatch[1],
                    currentVersion: currentMatch ? currentMatch[1] : 'unknown',
                    requiredVersion: requiredMatch ? requiredMatch[1] : 'unknown'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private parseSensitiveDataIssue(filePath: string, error: any): SensitiveDataIssue | null {
        try {
            const message = error.details?.message || error.message || '';
            const patternMatch = message.match(/pattern[:\s]+([^\s,]+)/i) || message.match(/match[:\s]+([^\s,]+)/i);
            
            // ✅ FIX: Access structured line number data first
            let lineNumber = 1; // Default fallback
            
            // Check for structured line data in error.details.details array (from facts)
            if (error.details?.details && Array.isArray(error.details.details)) {
                const firstMatch = error.details.details[0];
                if (firstMatch && typeof firstMatch.lineNumber === 'number') {
                    lineNumber = firstMatch.lineNumber;
                } else if (firstMatch && firstMatch.range?.start?.line) {
                    lineNumber = firstMatch.range.start.line;
                }
            }
            
            // Fallback to message parsing only if no structured data found
            if (lineNumber === 1) {
                const lineMatch = message.match(/line[:\s]+(\d+)/i);
                lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;
            }

            return {
                file: filePath,
                pattern: patternMatch ? patternMatch[1] : 'sensitive-data',
                line: lineNumber
            };
        } catch (e) {
            return null;
        }
    }

    public async saveReportToFile(outputPath: string): Promise<void> {
        try {
            const report = this.generateReport();
            await fs.writeFile(outputPath, report, 'utf8');
            logger.info(`Enhanced report saved to ${outputPath}`);
        } catch (error) {
            logger.error('Error saving enhanced report:', error);
            throw error;
        }
    }
}
