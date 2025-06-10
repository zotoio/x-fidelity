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

export class ReportGenerator {
    private data: ResultMetadata;
    private repoName: string;
    private githubHostname: string;

    constructor(data: ResultMetadata) {
        this.data = data;
        this.repoName = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('.git')[0] || '';
        this.githubHostname = this.data.XFI_RESULT.repoUrl?.split(':')[1]?.split('/')[0] || '';
    }

    public generateReport(): string {
        const report = [];

        report.push(this.generateHeader());
        report.push(this.generateSummary());
        report.push(this.generateIssueDetails());
        report.push(this.generateMetrics());
        report.push(this.generateTopRuleFailuresChart());
        report.push(this.generateFileIssuesChart());

        return report.join('\n\n');
    }

    private generateHeader(): string {
        return `# X-Fidelity Analysis Report
Repository: ${this.repoName}
Archetype: ${this.data.XFI_RESULT.archetype}
Date: ${new Date().toISOString()}`;
    }

    private generateSummary(): string {
        const { totalIssues, warningCount, errorCount, fatalityCount } = this.data.XFI_RESULT;
        return `## Summary
Total Issues: ${totalIssues}
Warnings: ${warningCount}
Errors: ${errorCount}
Fatal: ${fatalityCount}`;
    }

    private generateIssueDetails(): string {
        const details = this.data.XFI_RESULT.issueDetails;
        if (!details || details.length === 0) {
            return '## Issues\nNo issues found.';
        }

        const issueList = details.map(detail => {
            const errorList = detail.errors.map(error => 
                `- ${error.level.toUpperCase()}: ${error.message}`
            ).join('\n');

            return `### ${detail.filePath}\n${errorList}`;
        }).join('\n\n');

        return `## Issues\n${issueList}`;
    }

    private generateMetrics(): string {
        const metrics = new Map<string, MetricsData>();
        const executionCountChart: string[] = [];
        const executionTimeChart: string[] = [];

        // Process metrics
        for (const [name, data] of metrics.entries()) {
            if (data.executionCount > 0) {
                executionCountChart.push(`    ${name} : ${data.executionCount}`);
                if (data.totalExecutionTime > 0) {
                    executionTimeChart.push(`    "${name} (avg ${data.averageExecutionTime.toFixed(3)}s)" : ${data.totalExecutionTime.toFixed(3)}`);
                }
            }
        }

        return `## Performance Metrics
### Execution Count
\`\`\`
{
${executionCountChart.join(',\n')}
}
\`\`\`

### Execution Time (seconds)
\`\`\`
{
${executionTimeChart.join(',\n')}
}
\`\`\``;
    }

    private generateTopRuleFailuresChart(): string {
        const ruleFailures = new Map<string, number>();
        
        // Count rule failures
        this.data.XFI_RESULT.issueDetails.forEach(detail => {
            detail.errors.forEach(error => {
                const count = ruleFailures.get(error.ruleFailure) || 0;
                ruleFailures.set(error.ruleFailure, count + 1);
            });
        });

        // Sort by count
        const sortedFailures = Array.from(ruleFailures.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Top 10

        if (sortedFailures.length === 0) {
            return '';
        }

        const chartData = sortedFailures.map(([rule, count]) => 
            `    "${rule}" : ${count}`
        ).join(',\n');

        return `## Top Rule Failures
\`\`\`
{
${chartData}
}
\`\`\``;
    }

    private generateFileIssuesChart(): string {
        const fileIssues = new Map<string, number>();
        
        // Count issues per file
        this.data.XFI_RESULT.issueDetails.forEach(detail => {
            const count = fileIssues.get(detail.filePath) || 0;
            fileIssues.set(detail.filePath, count + detail.errors.length);
        });

        // Sort by count
        const sortedFiles = Array.from(fileIssues.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Top 10

        if (sortedFiles.length === 0) {
            return '';
        }

        const chartData = sortedFiles.map(([file, count]) => 
            `    "${path.basename(file)}" : ${count}`
        ).join(',\n');

        return `## Files with Most Issues
\`\`\`
{
${chartData}
}
\`\`\``;
    }

    public async saveReportToFile(outputPath: string): Promise<void> {
        try {
            const report = this.generateReport();
            await fs.writeFile(outputPath, report, 'utf8');
            logger.info(`Report saved to ${outputPath}`);
        } catch (error) {
            logger.error('Error saving report:', error);
            throw error;
        }
    }
}
