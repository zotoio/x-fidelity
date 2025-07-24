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

    constructor(data: ResultMetadata) {
        this.data = data;
        this.repoName = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('.git')[0] || '';
        this.githubHostname = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('/')[0] || '';
        this.reportDate = new Date().toISOString().split('T')[0];
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

        return report.join('\n\n');
    }

    private generateHeader(): string {
        const timestamp = new Date().toISOString().split('T')[0] + '-' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-').substring(0, 5);
        
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

    // Helper methods
    private truncateRuleName(rule: string): string {
        if (rule.length > 30) {
            return rule.substring(0, 27) + '...';
        }
        return rule;
    }

    private createGithubLink(filePath: string, line?: number): string {
        const relativePath = filePath.replace(this.data.XFI_RESULT.repoPath, '').replace(/^\//, '');
        const lineFragment = line ? `#L${line}` : '';
        if (this.repoName) {
            return `[${path.basename(filePath)}](https://github.com/${this.repoName}/blob/main/${relativePath}${lineFragment})`;
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
            const lineMatch = message.match(/line[:\s]+(\d+)/i);

            return {
                file: filePath,
                pattern: patternMatch ? patternMatch[1] : 'sensitive-data',
                line: lineMatch ? parseInt(lineMatch[1]) : 1
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
