import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../../configuration/configManager';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import {
  IAnalysisEngine,
  getCompletionEvent
} from '../../analysis/analysisEngineInterface';
import type { TrendData } from '../../reports/reportHistoryManager';

export interface DashboardData {
  projectInfo: {
    name: string;
    archetype: string;
    filesCount: number;
    lastAnalysis?: number;
  };
  currentMetrics: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    hintCount: number;
    exemptCount: number;
    filesAnalyzed: number;
    duration: number;
  };
  trends: TrendData;
  recentActivity: Array<{
    timestamp: number;
    type: 'analysis' | 'config' | 'exemption';
    description: string;
    impact?: string;
  }>;
  healthScore: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      status: 'good' | 'warning' | 'critical';
    }>;
  };
  recommendations: Array<{
    type: 'performance' | 'quality' | 'config' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action?: string;
  }>;
}

export class DashboardPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private updateTimer?: NodeJS.Timeout;

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private analysisManager: IAnalysisEngine | null,
    private diagnosticProvider: DiagnosticProvider
  ) {
    this.setupEventListeners();
  }

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      await this.updateContent();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'xfidelityDashboard',
      'X-Fidelity Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(
            path.join(this.context.extensionUri.fsPath, 'resources')
          )
        ]
      }
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        if (this.updateTimer) {
          clearInterval(this.updateTimer);
          this.updateTimer = undefined;
        }
      },
      null,
      this.disposables
    );

    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.disposables
    );

    await this.updateContent();
    this.startAutoRefresh();
  }

  private setupEventListeners(): void {
    // Listen for analysis completion to update dashboard (if analysis manager is available)
    if (this.analysisManager) {
      this.disposables.push(
        getCompletionEvent(this.analysisManager)(() => {
          if (this.panel) {
            this.updateContent();
          }
        })
      );
    }

    // Listen for configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        if (this.panel) {
          this.updateContent();
        }
      })
    );
  }

  private startAutoRefresh(): void {
    // Update dashboard every 30 seconds
    this.updateTimer = setInterval(() => {
      if (this.panel) {
        this.updateContent();
      }
    }, 30000);
  }

  private async updateContent(): Promise<void> {
    if (!this.panel) {
      return;
    }

    try {
      const dashboardData = await this.collectDashboardData();
      this.panel.webview.html = this.generateHTML(dashboardData);
    } catch (error) {
      console.error('Failed to update dashboard:', error);
    }
  }

  private async collectDashboardData(): Promise<DashboardData> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const config = this.configManager.getConfig();
    const diagnosticsSummary = this.diagnosticProvider.getDiagnosticsSummary();

    // Defensive: Only use plain string for archetype
    const archetype =
      typeof config.archetype === 'string'
        ? config.archetype
        : String(config.archetype);

    // Project info
    const projectInfo = {
      name: workspaceFolder
        ? path.basename(workspaceFolder.uri.fsPath)
        : 'No Workspace',
      archetype,
      filesCount: await this.getFileCount(workspaceFolder?.uri.fsPath),
      lastAnalysis: Date.now() // This would come from actual analysis data
    };

    // Current metrics
    const currentMetrics = {
      totalIssues: diagnosticsSummary.total,
      errorCount: diagnosticsSummary.errors,
      warningCount: diagnosticsSummary.warnings,
      infoCount: diagnosticsSummary.info,
      hintCount: diagnosticsSummary.hints,
      exemptCount: 0, // Would be calculated from actual exemptions
      filesAnalyzed: 0, // Would come from analysis result
      duration: 0 // Would come from analysis result
    };

    // Trends (mock data for now)
    const trends: TrendData = {
      timestamps: Array.from(
        { length: 7 },
        (_, i) => Date.now() - (6 - i) * 24 * 60 * 60 * 1000
      ),
      totalIssues: [45, 38, 42, 35, 41, 33, currentMetrics.totalIssues],
      errorCounts: [12, 8, 10, 7, 9, 6, currentMetrics.errorCount],
      warningCounts: [28, 25, 27, 23, 26, 21, currentMetrics.warningCount],
      filesCounts: [125, 128, 130, 132, 135, 138, 140]
    };

    // Recent activity (mock data)
    const recentActivity = [
      {
        timestamp: Date.now() - 300000, // 5 minutes ago
        type: 'analysis' as const,
        description: 'Analysis completed',
        impact: `${currentMetrics.totalIssues} issues found`
      },
      {
        timestamp: Date.now() - 3600000, // 1 hour ago
        type: 'config' as const,
        description: 'Changed archetype to ' + archetype,
        impact: 'Configuration updated'
      },
      {
        timestamp: Date.now() - 7200000, // 2 hours ago
        type: 'exemption' as const,
        description: 'Added exemption for unused-variable rule',
        impact: '3 issues exempted'
      }
    ];

    // Health score calculation
    const healthScore = this.calculateHealthScore(currentMetrics, trends);

    // Recommendations
    const recommendations = this.generateRecommendations(
      currentMetrics,
      { archetype }, // Only pass plain archetype
      healthScore
    );

    return {
      projectInfo,
      currentMetrics,
      trends,
      recentActivity,
      healthScore,
      recommendations
    };
  }

  private async getFileCount(workspacePath?: string): Promise<number> {
    if (!workspacePath) {
      return 0;
    }

    try {
      const files = await vscode.workspace.findFiles(
        '**/*',
        '**/node_modules/**'
      );
      return files.length;
    } catch {
      return 0;
    }
  }

  private calculateHealthScore(
    metrics: DashboardData['currentMetrics'],
    trends: TrendData
  ): DashboardData['healthScore'] {
    const factors: Array<{
      name: string;
      score: number;
      weight: number;
      status: 'good' | 'warning' | 'critical';
    }> = [
      {
        name: 'Issue Count',
        score: Math.max(0, 100 - metrics.totalIssues * 2), // 2 points per issue
        weight: 0.4,
        status:
          metrics.totalIssues === 0
            ? 'good'
            : metrics.totalIssues < 10
              ? 'warning'
              : 'critical'
      },
      {
        name: 'Error Ratio',
        score:
          metrics.totalIssues === 0
            ? 100
            : Math.max(
                0,
                100 - (metrics.errorCount / metrics.totalIssues) * 100
              ),
        weight: 0.3,
        status:
          metrics.errorCount === 0
            ? 'good'
            : metrics.errorCount / Math.max(1, metrics.totalIssues) < 0.2
              ? 'warning'
              : 'critical'
      },
      {
        name: 'Trend Direction',
        score: this.calculateTrendScore(trends.totalIssues),
        weight: 0.2,
        status: this.getTrendStatus(trends.totalIssues)
      },
      {
        name: 'Code Coverage',
        score: 85, // Mock value
        weight: 0.1,
        status: 'good'
      }
    ];

    const weightedScore = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (weightedScore >= 90) {
      grade = 'A';
    } else if (weightedScore >= 80) {
      grade = 'B';
    } else if (weightedScore >= 70) {
      grade = 'C';
    } else if (weightedScore >= 60) {
      grade = 'D';
    } else {
      grade = 'F';
    }

    return {
      score: Math.round(weightedScore),
      grade,
      factors
    };
  }

  private calculateTrendScore(trendData: number[]): number {
    if (trendData.length < 2) {
      return 50;
    }

    const recent = trendData.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = trendData.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    if (recent < older) {
      return 100;
    } // Improving
    if (recent === older) {
      return 75;
    } // Stable
    return Math.max(0, 50 - (recent - older) * 2); // Declining
  }

  private getTrendStatus(trendData: number[]): 'good' | 'warning' | 'critical' {
    const score = this.calculateTrendScore(trendData);
    if (score >= 75) {
      return 'good';
    }
    if (score >= 50) {
      return 'warning';
    }
    return 'critical';
  }

  private generateRecommendations(
    metrics: DashboardData['currentMetrics'],
    config: any,
    _healthScore: DashboardData['healthScore']
  ): DashboardData['recommendations'] {
    const recommendations: DashboardData['recommendations'] = [];

    // High error count
    if (metrics.errorCount > 5) {
      recommendations.push({
        type: 'quality' as const,
        priority: 'high' as const,
        title: 'High Error Count',
        description: `You have ${metrics.errorCount} errors that should be addressed immediately.`,
        action: 'Review and fix critical errors'
      });
    }

    // Performance optimization
    if (config.cacheResults === false) {
      recommendations.push({
        type: 'performance' as const,
        priority: 'medium' as const,
        title: 'Enable Result Caching',
        description:
          'Caching analysis results can significantly improve performance.',
        action: 'Enable caching in settings'
      });
    }

    // Configuration optimization
    if (config.runInterval === 0) {
      recommendations.push({
        type: 'config' as const,
        priority: 'low' as const,
        title: 'Enable Periodic Analysis',
        description: 'Regular analysis helps catch issues early.',
        action: 'Set analysis interval in settings'
      });
    }

    // Maintenance
    if (metrics.totalIssues === 0) {
      recommendations.push({
        type: 'maintenance' as const,
        priority: 'low' as const,
        title: 'Excellent Code Quality!',
        description: 'Consider sharing your configuration with the team.',
        action: 'Export settings for team use'
      });
    }

    return recommendations;
  }

  private generateHTML(data: DashboardData): string {
    const nonce = this.getNonce();
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>X-Fidelity Dashboard</title>
    ${this.getStyles(isDark)}
</head>
<body class="${isDark ? 'dark' : 'light'}">
    <div class="dashboard">
        <header class="dashboard-header">
            <div class="project-info">
                <h1>📊 ${data.projectInfo.name}</h1>
                <div class="project-meta">
                    <span class="archetype">🏗️ ${data.projectInfo.archetype}</span>
                    <span class="file-count">📁 ${data.projectInfo.filesCount} files</span>
                    <span class="last-analysis">🕒 ${new Date(data.projectInfo.lastAnalysis || 0).toLocaleTimeString()}</span>
                </div>
            </div>
            <div class="health-score">
                <div class="score-circle grade-${data.healthScore.grade.toLowerCase()}">
                    <span class="score-number">${data.healthScore.score}</span>
                    <span class="score-grade">${data.healthScore.grade}</span>
                </div>
                <div class="score-label">Health Score</div>
            </div>
        </header>
        
        <div class="dashboard-grid">
            <!-- Metrics Cards -->
            <section class="metrics-section">
                <h2>📈 Current Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card ${data.currentMetrics.totalIssues === 0 ? 'success' : 'warning'}">
                        <div class="metric-value">${data.currentMetrics.totalIssues}</div>
                        <div class="metric-label">Total Issues</div>
                        <div class="metric-trend">${this.getTrendIndicator(data.trends.totalIssues)}</div>
                    </div>
                    <div class="metric-card ${data.currentMetrics.errorCount === 0 ? 'success' : 'error'}">
                        <div class="metric-value">${data.currentMetrics.errorCount}</div>
                        <div class="metric-label">Errors</div>
                        <div class="metric-trend">${this.getTrendIndicator(data.trends.errorCounts)}</div>
                    </div>
                    <div class="metric-card ${data.currentMetrics.warningCount === 0 ? 'success' : 'warning'}">
                        <div class="metric-value">${data.currentMetrics.warningCount}</div>
                        <div class="metric-label">Warnings</div>
                        <div class="metric-trend">${this.getTrendIndicator(data.trends.warningCounts)}</div>
                    </div>
                    <div class="metric-card info">
                        <div class="metric-value">${data.currentMetrics.filesAnalyzed}</div>
                        <div class="metric-label">Files Analyzed</div>
                        <div class="metric-trend">${this.getTrendIndicator(data.trends.filesCounts)}</div>
                    </div>
                </div>
            </section>
            
            <!-- Trends Chart -->
            <section class="trends-section">
                <h2>📊 7-Day Trends</h2>
                <div class="chart-container">
                    <canvas id="trendsChart" width="400" height="200"></canvas>
                </div>
            </section>
            
            <!-- Health Factors -->
            <section class="health-section">
                <h2>💪 Health Factors</h2>
                <div class="health-factors">
                    ${data.healthScore.factors
                      .map(
                        factor => `
                        <div class="health-factor">
                            <div class="factor-header">
                                <span class="factor-name">${factor.name}</span>
                                <span class="factor-score status-${factor.status}">${Math.round(factor.score)}</span>
                            </div>
                            <div class="factor-bar">
                                <div class="factor-fill status-${factor.status}" 
                                     style="width: ${factor.score}%"></div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </section>
            
            <!-- Recent Activity -->
            <section class="activity-section">
                <h2>🔄 Recent Activity</h2>
                <div class="activity-list">
                    ${data.recentActivity
                      .map(
                        activity => `
                        <div class="activity-item">
                            <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                            <div class="activity-content">
                                <div class="activity-description">${activity.description}</div>
                                <div class="activity-meta">
                                    <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
                                    ${activity.impact ? `<span class="activity-impact">${activity.impact}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </section>
            
            <!-- Recommendations -->
            <section class="recommendations-section">
                <h2>💡 Recommendations</h2>
                <div class="recommendations-list">
                    ${data.recommendations
                      .map(
                        rec => `
                        <div class="recommendation-item priority-${rec.priority}">
                            <div class="recommendation-header">
                                <span class="recommendation-type">${this.getRecommendationIcon(rec.type)}</span>
                                <span class="recommendation-title">${rec.title}</span>
                                <span class="recommendation-priority priority-${rec.priority}">${rec.priority}</span>
                            </div>
                            <div class="recommendation-description">${rec.description}</div>
                            ${
                              rec.action
                                ? `
                                <button class="recommendation-action" onclick="handleRecommendation('${rec.action}')">
                                    ${rec.action}
                                </button>
                            `
                                : ''
                            }
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </section>
            
            <!-- Quick Actions -->
            <section class="actions-section">
                <h2>⚡ Quick Actions</h2>
                <div class="actions-grid">
                    <button class="action-btn primary" onclick="runAnalysis()">
                        🔍 Run Analysis
                    </button>
                    <button class="action-btn secondary" onclick="openSettings()">
                        ⚙️ Settings
                    </button>
                    <button class="action-btn secondary" onclick="viewReports()">
                        📊 View Reports
                    </button>
                    <button class="action-btn secondary" onclick="exportData()">
                        📤 Export Data
                    </button>
                </div>
            </section>
        </div>
    </div>
    
    <script nonce="${nonce}">
        ${this.getJavaScript(data)}
    </script>
</body>
</html>`;
  }

  private getTrendIndicator(trendData: number[]): string {
    if (trendData.length < 2) {
      return '➖';
    }

    const recent = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];

    if (recent < previous) {
      return '📈';
    } // Improving (fewer issues)
    if (recent > previous) {
      return '📉';
    } // Declining (more issues)
    return '➖'; // Stable
  }

  private getActivityIcon(type: string): string {
    switch (type) {
      case 'analysis':
        return '🔍';
      case 'config':
        return '⚙️';
      case 'exemption':
        return '🚫';
      default:
        return '📝';
    }
  }

  private getRecommendationIcon(type: string): string {
    switch (type) {
      case 'performance':
        return '⚡';
      case 'quality':
        return '🎯';
      case 'config':
        return '⚙️';
      case 'maintenance':
        return '🔧';
      default:
        return '💡';
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return `${days}d ago`;
    }
    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return 'Just now';
  }

  private getStyles(isDark: boolean): string {
    return `<style>
        :root {
            --bg-primary: ${isDark ? '#1e1e1e' : '#ffffff'};
            --bg-secondary: ${isDark ? '#252526' : '#f8f9fa'};
            --bg-tertiary: ${isDark ? '#2d2d30' : '#e9ecef'};
            --text-primary: ${isDark ? '#cccccc' : '#212529'};
            --text-secondary: ${isDark ? '#969696' : '#6c757d'};
            --border-color: ${isDark ? '#3c3c3c' : '#dee2e6'};
            --accent-color: #007acc;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --error-color: #dc3545;
            --info-color: #17a2b8;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }
        
        .project-info h1 {
            font-size: 2em;
            margin-bottom: 10px;
            color: var(--accent-color);
        }
        
        .project-meta {
            display: flex;
            gap: 20px;
            color: var(--text-secondary);
        }
        
        .health-score {
            text-align: center;
        }
        
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .score-circle.grade-a { background: var(--success-color); color: white; }
        .score-circle.grade-b { background: #20c997; color: white; }
        .score-circle.grade-c { background: var(--warning-color); color: black; }
        .score-circle.grade-d { background: #fd7e14; color: white; }
        .score-circle.grade-f { background: var(--error-color); color: white; }
        
        .score-number { font-size: 1.5em; }
        .score-grade { font-size: 0.8em; }
        .score-label { color: var(--text-secondary); font-size: 0.9em; }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        section {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border-color);
        }
        
        section h2 {
            margin-bottom: 20px;
            font-size: 1.3em;
            color: var(--accent-color);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }
        
        .metric-card {
            background: var(--bg-tertiary);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            position: relative;
            border: 2px solid transparent;
        }
        
        .metric-card.success { border-color: var(--success-color); }
        .metric-card.warning { border-color: var(--warning-color); }
        .metric-card.error { border-color: var(--error-color); }
        .metric-card.info { border-color: var(--info-color); }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: var(--text-secondary);
            font-size: 0.9em;
        }
        
        .metric-trend {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 1.2em;
        }
        
        .chart-container {
            width: 100%;
            height: 200px;
            background: var(--bg-tertiary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
        }
        
        .health-factors {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .health-factor {
            background: var(--bg-tertiary);
            padding: 15px;
            border-radius: 8px;
        }
        
        .factor-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .factor-score {
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .factor-score.status-good { background: var(--success-color); color: white; }
        .factor-score.status-warning { background: var(--warning-color); color: black; }
        .factor-score.status-critical { background: var(--error-color); color: white; }
        
        .factor-bar {
            width: 100%;
            height: 6px;
            background: var(--border-color);
            border-radius: 3px;
            overflow: hidden;
        }
        
        .factor-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .factor-fill.status-good { background: var(--success-color); }
        .factor-fill.status-warning { background: var(--warning-color); }
        .factor-fill.status-critical { background: var(--error-color); }
        
        .activity-list, .recommendations-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .activity-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: var(--bg-tertiary);
            border-radius: 8px;
        }
        
        .activity-icon {
            font-size: 1.2em;
            width: 24px;
            text-align: center;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-meta {
            display: flex;
            gap: 12px;
            margin-top: 4px;
            font-size: 0.8em;
            color: var(--text-secondary);
        }
        
        .recommendation-item {
            background: var(--bg-tertiary);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid var(--border-color);
        }
        
        .recommendation-item.priority-high { border-left-color: var(--error-color); }
        .recommendation-item.priority-medium { border-left-color: var(--warning-color); }
        .recommendation-item.priority-low { border-left-color: var(--info-color); }
        
        .recommendation-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .recommendation-title {
            font-weight: 500;
            flex: 1;
        }
        
        .recommendation-priority {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            text-transform: uppercase;
        }
        
        .recommendation-priority.priority-high { background: var(--error-color); color: white; }
        .recommendation-priority.priority-medium { background: var(--warning-color); color: black; }
        .recommendation-priority.priority-low { background: var(--info-color); color: white; }
        
        .recommendation-description {
            color: var(--text-secondary);
            margin-bottom: 12px;
        }
        
        .recommendation-action {
            background: var(--accent-color);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .recommendation-action:hover {
            opacity: 0.9;
        }
        
        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }
        
        .action-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .action-btn.primary {
            background: var(--accent-color);
            color: white;
        }
        
        .action-btn.secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            .dashboard-header {
                flex-direction: column;
                gap: 20px;
                text-align: center;
            }
            
            .project-meta {
                flex-direction: column;
                gap: 8px;
            }
            
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>`;
  }

  private getJavaScript(data: DashboardData): string {
    let dashboardDataString = '{}';
    try {
      dashboardDataString = JSON.stringify(data);
    } catch (err) {
      console.error(
        'Failed to serialize dashboard data for webview:',
        err,
        data
      );
    }
    return `
        const vscode = acquireVsCodeApi();
        const dashboardData = ${dashboardDataString};
        
        // Simple chart rendering (mock for now)
        function renderChart() {
            const canvas = document.getElementById('trendsChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Mock chart - would use a real charting library in production
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Trends chart would render here', canvas.width / 2, canvas.height / 2);
            ctx.fillText('(Integration with Chart.js or similar)', canvas.width / 2, canvas.height / 2 + 20);
        }
        
        function runAnalysis() {
            vscode.postMessage({ command: 'runAnalysis' });
        }
        
        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }
        
        function viewReports() {
            vscode.postMessage({ command: 'viewReports' });
        }
        
        function exportData() {
            vscode.postMessage({ command: 'exportData' });
        }
        
        function handleRecommendation(action) {
            vscode.postMessage({ 
                command: 'handleRecommendation',
                action: action
            });
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            renderChart();
        });
        
        // Auto-refresh every 30 seconds
        setInterval(function() {
            vscode.postMessage({ command: 'refreshData' });
        }, 30000);
    `;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'runAnalysis':
        await vscode.commands.executeCommand('xfidelity.runAnalysis');
        break;

      case 'openSettings':
        await vscode.commands.executeCommand('xfidelity.openSettings');
        break;

      case 'viewReports':
        await vscode.commands.executeCommand('xfidelity.openReports');
        break;

      case 'exportData':
        await vscode.commands.executeCommand('xfidelity.exportReport');
        break;

      case 'handleRecommendation':
        await this.handleRecommendation(message.action);
        break;

      case 'refreshData':
        await this.updateContent();
        break;
    }
  }

  private async handleRecommendation(action: string): Promise<void> {
    switch (action) {
      case 'Review and fix critical errors':
        await vscode.commands.executeCommand(
          'workbench.panel.markers.view.focus'
        );
        break;

      case 'Enable caching in settings':
        await this.configManager.updateConfig({ cacheResults: true });
        vscode.window.showInformationMessage('Result caching enabled');
        break;

      case 'Set analysis interval in settings':
        await vscode.commands.executeCommand('xfidelity.openSettings');
        break;

      case 'Export settings for team use':
        await vscode.commands.executeCommand('xfidelity.exportReport');
        break;
    }
  }

  private getNonce(): string {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose(): void {
    this.panel?.dispose();
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.disposables.forEach(d => d.dispose());
  }
}
