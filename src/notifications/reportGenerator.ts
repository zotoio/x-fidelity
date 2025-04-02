import fs from 'fs/promises';
import path from 'path';
import { ResultMetadata } from '../types/typeDefs';
import { options } from '../core/cli';
import { getFormattedDate } from '../utils/utils';
import { logger } from '../utils/logger';

export class XFiReportGenerator {
  private data: ResultMetadata;
  public repoName: string;
  private githubBaseUrl: string;
  private githubHostname: string;

  constructor(jsonData: ResultMetadata) {
    this.data = jsonData;
    
    // Extract repository name from URL (format: git@github.com:owner/repo.git)
    this.repoName = this.data.XFI_RESULT.repoUrl.split(':')[1]?.split('.git')[0] || '';
    this.githubHostname = this.data.XFI_RESULT.repoUrl.split(':')[1]?.split('/')[0] || '';
    
    // Set GitHub base URL for linking to files
    this.githubBaseUrl = `https://${this.githubHostname}/${this.repoName}/blob/main`;
  }

  private getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  private getGithubUrl(filePath: string): string {
    // Remove the local path prefix to get the relative path in the repo
    const relativePath = filePath.replace(`${options.dir}`, '');
    return `${this.githubBaseUrl}/${relativePath}`;
  }

  private countIssuesByFile(): Record<string, number> {
    const issuesByFile: Record<string, number> = {};
    
    this.data.XFI_RESULT.issueDetails.forEach(detail => {
      if (detail.filePath !== "REPO_GLOBAL_CHECK") {
        const fileName = this.getFileName(detail.filePath);
        issuesByFile[fileName] = (issuesByFile[fileName] || 0) + detail.errors.length;
      }
    });
    
    return issuesByFile;
  }

  private countIssuesByRuleType(): Record<string, number> {
    const issuesByRuleType: Record<string, number> = {};
    
    this.data.XFI_RESULT.issueDetails.forEach(detail => {
      detail.errors.forEach(error => {
        const ruleType = error.ruleFailure;
        issuesByRuleType[ruleType] = (issuesByRuleType[ruleType] || 0) + 1;
      });
    });
    
    return issuesByRuleType;
  }

  private calculateSuccessRate(): { successfulFiles: number, successRate: number } {
    // Count unique files with issues (excluding REPO_GLOBAL_CHECK)
    const filesWithIssues = new Set();
    this.data.XFI_RESULT.issueDetails.forEach(detail => {
      if (detail.filePath !== "REPO_GLOBAL_CHECK") {
        filesWithIssues.add(detail.filePath);
      }
    });
    
    const filesWithIssuesCount = filesWithIssues.size;
    const successfulFiles = this.data.XFI_RESULT.fileCount - filesWithIssuesCount;
    const successRate = (successfulFiles / this.data.XFI_RESULT.fileCount) * 100;
    
    return { successfulFiles, successRate };
  }

  private generateExecutiveSummary(): string {
    const { successfulFiles, successRate } = this.calculateSuccessRate();
    
    return `# X-Fidelity Analysis Report
Generated for: ${this.repoName} on ${getFormattedDate()}

## Executive Summary

This report presents the results of an X-Fidelity analysis conducted on the repository \`${this.data.XFI_RESULT.repoUrl}\`. The analysis identified **${this.data.XFI_RESULT.totalIssues} total issues**, including:
- ${this.data.XFI_RESULT.warningCount} warnings
- ${this.data.XFI_RESULT.fatalityCount} fatalities
- ${this.data.XFI_RESULT.errorCount} errors
- ${this.data.XFI_RESULT.exemptCount} exempt issues

Out of ${this.data.XFI_RESULT.fileCount} total files, ${successfulFiles} (${successRate.toFixed(1)}%) have no issues. The analysis was conducted using X-Fidelity version ${this.data.XFI_RESULT.xfiVersion} and took approximately ${this.data.XFI_RESULT.durationSeconds.toFixed(2)} seconds to complete.
`;
  }

  private generateFileStatusChart(): string {
    const { successfulFiles } = this.calculateSuccessRate();
    const filesWithIssues = this.data.XFI_RESULT.fileCount - successfulFiles;
    
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
    "Warnings" : ${this.data.XFI_RESULT.warningCount}
    "Fatalities" : ${this.data.XFI_RESULT.fatalityCount}
    "Errors" : ${this.data.XFI_RESULT.errorCount}
    "Exempt" : ${this.data.XFI_RESULT.exemptCount}
\`\`\`
`;
  }

  private generateTopRuleFailuresChart(): string {
    const issuesByRuleType = this.countIssuesByRuleType();
    
    // Sort rule types by count and take top 8
    const topRuleFailures = Object.entries(issuesByRuleType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    
    // Generate mermaid bar chart for top rule failures
    const mermaidChart = [
      '```mermaid',
      'gantt',
      '    title Top Rule Failures',
      '    dateFormat X',
      '    axisFormat %s',
      '    section Rule Failures'
    ];
    
    topRuleFailures.forEach(([rule, count], index) => {
      const shortRule = rule.length > 30 ? rule.substring(0, 27) + '...' : rule;
      mermaidChart.push(`    ${shortRule} :0, ${count}`);
    });
    
    mermaidChart.push('```');
    
    return `## Top Rule Failures

The following chart shows the most frequent rule failures detected in the analysis:

${mermaidChart.join('\n')}

`;
  }

  private generateFileIssuesChart(): string {
    const issuesByFile = this.countIssuesByFile();
    
    // Sort files by issue count and take top 8
    const topFiles = Object.entries(issuesByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    
    // Generate mermaid bar chart for files with most issues
    const mermaidChart = [
      '```mermaid',
      'gantt',
      '    title Files with Most Issues',
      '    dateFormat X',
      '    axisFormat %s',
      '    section Files'
    ];
    
    topFiles.forEach(([file, count]) => {
      mermaidChart.push(`    ${file} :0, ${count}`);
    });
    
    mermaidChart.push('```');
    
    return `## Files with Most Issues

The following chart shows which files have the most issues:

${mermaidChart.join('\n')}

`;
  }

  private generateFactMetricsChart(): string {
    // Sort fact metrics by execution count
    const factMetrics = Object.entries(this.data.XFI_RESULT.factMetrics)
      .sort((a, b) => b[1].executionCount - a[1].executionCount);
    
    // Generate execution count chart
    const executionCountChart = [
      '```mermaid',
      'gantt',
      '    title Fact Analyzer Execution Count',
      '    dateFormat X',
      '    axisFormat %s',
      '    section Execution Count'
    ];
    
    factMetrics.forEach(([name, metrics]) => {
      executionCountChart.push(`    ${name} :0, ${metrics.executionCount}`);
    });
    
    executionCountChart.push('```');
    
    // Generate execution time chart
    const executionTimeChart = [
      '```mermaid',
      'pie',
      '    title Fact Analyzer Execution Time (seconds)'
    ];
    
    factMetrics.forEach(([name, metrics]) => {
      // Only include metrics with non-zero execution time
      if (metrics.totalExecutionTime > 0) {
        executionTimeChart.push(`    "${name} (avg ${metrics.averageExecutionTime.toFixed(3)}s)" : ${metrics.totalExecutionTime.toFixed(3)}`);
      }
    });
    
    executionTimeChart.push('```');
    
    return `## Fact Metrics Performance

### Execution Count

${executionCountChart.join('\n')}

### Execution Time (seconds)

${executionTimeChart.join('\n')}

`;
  }

  private generateTopIssuesSection(): string {
    // Extract AI analysis if available
    let aiAnalysis = '';
    const globalCheckDetail = this.data.XFI_RESULT.issueDetails.find(detail => detail.filePath === "REPO_GLOBAL_CHECK");
    
    if (globalCheckDetail) {
      const openAiAnalysis = globalCheckDetail.errors.find(error => error.ruleFailure === "openaiAnalysisTop5-global");
      
      if (openAiAnalysis && openAiAnalysis.details && openAiAnalysis.details.details && openAiAnalysis.details.details.result) {
        const issues = openAiAnalysis.details.details.result;
        
        aiAnalysis = `## Top 5 Critical Issues (AI Analysis)

Based on the OpenAI analysis, these are the top 5 critical issues to address:

`;
        
        issues.forEach((issue: any, index: number) => {
          aiAnalysis += `### ${index + 1}. ${issue.issue} (Severity: ${issue.severity})

**Description**: ${issue.description}

**Files**: ${issue.filePaths.map((filePath: string) => {
            const fileName = path.basename(filePath);
            // Clean up the file path to get the relative path
            const relativePath = filePath.replace(/^\//, '');
            return `[${fileName}](${this.githubBaseUrl}/${relativePath})`;
          }).join(', ')}

**Suggestion**: ${issue.suggestion}

`;

          
          // Add condition details if available
          if (openAiAnalysis.details && openAiAnalysis.details.conditionDetails) {
            const { fact, operator, value, params } = openAiAnalysis.details.conditionDetails;
            aiAnalysis += `**Condition**: Fact \`${fact}\` with operator \`${operator}\`\n`;
            if (params) {
              aiAnalysis += `**Parameters**: \`${JSON.stringify(params)}\`\n\n`;
            }
          }
        });
      }
    }
    
    return aiAnalysis;
  }

  private generateFunctionComplexitySection(): string {
    const complexityIssues = this.data.XFI_RESULT.issueDetails
      .filter(detail => detail.filePath !== "REPO_GLOBAL_CHECK")
      .flatMap(detail => 
        detail.errors
          .filter(error => error.ruleFailure === "functionComplexity-iterative")
          .map(error => ({
            filePath: detail.filePath,
            fileName: this.getFileName(detail.filePath),
            fileUrl: this.getGithubUrl(detail.filePath),
            details: error.details,
          }))
      );
    
    if (complexityIssues.length === 0) {
      return '';
    }
    
    let section = `## Function Complexity Issues

The analysis identified several functions with high complexity that should be refactored:

`;

    // Add threshold information if available from the first issue
    if (complexityIssues[0].operatorThreshold) {
      const { operator, value } = complexityIssues[0].operatorThreshold;
      section += `**Threshold**: \`${operator}: ${JSON.stringify(value)}\`\n\n`;
    }
    
    // Add operator value information if available
    if (complexityIssues[0].operatorValue) {
      section += `**Required Value**: \`${JSON.stringify(complexityIssues[0].operatorValue)}\`\n\n`;
    }

    section += `| File | Function | Cyclomatic Complexity | Cognitive Complexity | Nesting Depth | Parameter Count | Return Count |
|------|----------|------------------------|----------------------|--------------|----------------|--------------|
`;
    
    complexityIssues.forEach(issue => {
      if (issue.details && issue.details.details && issue.details.details.complexities) {
        issue.details.details.complexities.forEach((complexity: any) => {
          section += `| [${issue.fileName}](${issue.fileUrl}#L${complexity.location?.start?.row || ''}) | ${complexity.name} | ${complexity.metrics.cyclomaticComplexity} | ${complexity.metrics.cognitiveComplexity} | ${complexity.metrics.nestingDepth} | ${complexity.metrics.parameterCount} | ${complexity.metrics.returnCount} |\n`;
        });
      }
    });
    
    return section;
  }

  private generateDependencyIssuesSection(): string {
    // Look for outdated framework issues
    const globalCheckDetail = this.data.XFI_RESULT.issueDetails.find(detail => detail.filePath === "REPO_GLOBAL_CHECK");
    
    if (!globalCheckDetail) {
      return '';
    }
    
    const dependencyIssue = globalCheckDetail.errors.find(error => error.ruleFailure === "outdatedFramework-global");
    
    if (!dependencyIssue || !dependencyIssue.details || !dependencyIssue.details.details || !dependencyIssue.details.details.result) {
      return '';
    }
    
    const dependencies = dependencyIssue.details.details.result;
    
    let section = `## Dependency Issues

The analysis detected outdated framework dependencies that need updating:

`;

    
    // Add condition details if available
    if (dependencyIssue.details.conditionDetails) {
      const { fact, operator, params } = dependencyIssue.details.conditionDetails;
      section += `**Condition**: Fact \`${fact}\` with operator \`${operator}\`\n`;
      if (params) {
        section += `**Parameters**: \`${JSON.stringify(params)}\`\n\n`;
      }
    }

    section += `| Dependency | Current Version | Required Version |
|------------|-----------------|------------------|
`;
    
    dependencies.forEach((dep: any) => {
      section += `| ${dep.dependency} | ${dep.currentVersion} | ${dep.requiredVersion} |\n`;
    });
    
    return section;
  }

  private generateSensitiveDataSection(): string {
    const sensitiveDataIssues = this.data.XFI_RESULT.issueDetails
      .filter(detail => detail.filePath !== "REPO_GLOBAL_CHECK")
      .flatMap(detail => 
        detail.errors
          .filter(error => error.ruleFailure === "sensitiveLogging-iterative")
          .map(error => ({
            filePath: detail.filePath,
            fileName: this.getFileName(detail.filePath),
            fileUrl: this.getGithubUrl(detail.filePath),
            details: error.details
          }))
      );
    
    if (sensitiveDataIssues.length === 0) {
      return '';
    }
    
    let section = `## Sensitive Data Issues

Several files contain potentially sensitive data patterns that shouldn't be logged or exposed:

| File | Match Pattern | Line Number |
|------|--------------|-------------|
`;
    
    sensitiveDataIssues.forEach(issue => {
      if (issue.details && issue.details.details) {
        issue.details.details.forEach((detail: any) => {
          section += `| [${issue.fileName}](${issue.fileUrl}#L${detail.lineNumber}) | ${detail.match} | ${detail.lineNumber} |\n`;
        });
      }
    });
    
    return section;
  }

  private generateGlobalIssuesSection(): string {
    const globalCheckDetail = this.data.XFI_RESULT.issueDetails.find(detail => detail.filePath === "REPO_GLOBAL_CHECK");
    
    if (!globalCheckDetail) {
      return '';
    }
    
    // Filter out openaiAnalysisTop5-global as it's handled separately
    const globalIssues = globalCheckDetail.errors.filter(error => 
      error.ruleFailure !== "openaiAnalysisTop5-global" && 
      error.ruleFailure !== "outdatedFramework-global"
    );
    
    if (globalIssues.length === 0) {
      return '';
    }
    
    let section = `## Other Global Issues

`;
    
    globalIssues.forEach(issue => {
      section += `- **${issue.ruleFailure}** (${issue.level}): ${issue.details && issue.details.message ? issue.details.message : 'No details available'}\n`;
      
      
      // Add condition details if available
      if (issue.details && issue.details.conditionDetails) {
        const { fact, operator, params } = issue.details.conditionDetails;
        section += `  - Condition: Fact \`${fact}\` with operator \`${operator}\`\n`;
        if (params) {
          section += `  - Parameters: \`${JSON.stringify(params)}\`\n`;
        }
      }
    });
    
    return section;
  }

  /**
   * Helper method to add operator information to report sections
   */
  private addOperatorValueToReport(issueDetails: string, error: any): string {
    
    // Add condition details if available
    if (error.details.conditionDetails) {
      const { fact, operator, params } = error.details.conditionDetails;
      issueDetails += `  - Condition: Fact \`${fact}\` with operator \`${operator}\`\n`;
      if (params) {
        issueDetails += `  - Parameters: \`${JSON.stringify(params)}\`\n`;
      }
    }
    
    // Add all condition operators if available
    if (error.details && error.details.allConditionOperators && error.details.allConditionOperators.length > 0) {
      issueDetails += `  - All Condition Operators:\n`;
      error.details.allConditionOperators.forEach((condition: any, index: number) => {
        issueDetails += `    ${index + 1}. Fact: \`${condition.fact}\` Operator: \`${condition.operator}\` Value: \`${JSON.stringify(condition.value)}\`\n`;
        if (condition.params) {
          issueDetails += `       Parameters: \`${JSON.stringify(condition.params)}\`\n`;
        }
      });
    }
    
    return issueDetails;
  }

  public generateReport(): string {
    const executiveSummary = this.generateExecutiveSummary();
    const fileStatusChart = this.generateFileStatusChart();
    const topRuleFailuresChart = this.generateTopRuleFailuresChart();
    const fileIssuesChart = this.generateFileIssuesChart();
    const factMetricsChart = this.generateFactMetricsChart();
    const topIssuesSection = this.generateTopIssuesSection();
    const functionComplexitySection = this.generateFunctionComplexitySection();
    const dependencyIssuesSection = this.generateDependencyIssuesSection();
    const sensitiveDataSection = this.generateSensitiveDataSection();
    const globalIssuesSection = this.generateGlobalIssuesSection();
    
    // Combine all sections
    return [
      executiveSummary,
      fileStatusChart,
      topRuleFailuresChart,
      fileIssuesChart,
      factMetricsChart,
      topIssuesSection,
      functionComplexitySection,
      dependencyIssuesSection,
      sensitiveDataSection,
      globalIssuesSection
    ].join('\n');
  }

  public async saveReportToFile(outputPath: string): Promise<void> {
    const outputFile = outputPath || `xfi-report-${this.repoName}-${getFormattedDate()}.md`;
    const report = this.generateReport();
    
    logger.debug({
      outputPath,
      reportLength: report.length,
      hasContent: Boolean(report),
      sections: {
        executiveSummary: Boolean(this.generateExecutiveSummary()),
        fileStatus: Boolean(this.generateFileStatusChart()),
        topRuleFailures: Boolean(this.generateTopRuleFailuresChart()),
        fileIssues: Boolean(this.generateFileIssuesChart()),
        factMetrics: Boolean(this.generateFactMetricsChart())
      }
    }, 'Generating report');

    try {
      if (!report) {
        throw new Error('Generated report is empty');
      }
      await fs.writeFile(outputPath, report);
      logger.info(`Report saved to ${outputFile}`);
    } catch (error) {
      logger.error(`Failed to save report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
