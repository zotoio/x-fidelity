/**
 * Example implementation using SafeWebview for report viewing
 * Demonstrates proper serialization practices
 */

import * as vscode from 'vscode';
import { SafeWebview } from '../utils/safeSerialization';
import { SerializationService } from '../services/serializationService';
import {
  SerializableAnalysisResult,
  toSerializableRange,
  SerializableValue
} from '../types/serialization';

export interface ReportViewerMessage {
  command: string;
  data: SerializableValue;
}

export class SafeReportViewer {
  private panel: vscode.WebviewPanel | undefined;
  private safeWebview: SafeWebview | undefined;
  private serializer: SerializationService;

  constructor(private context: vscode.ExtensionContext) {
    this.serializer = SerializationService.getInstance();
  }

  /**
   * Show the report viewer with analysis results
   */
  public async showReport(analysisResult: any): Promise<void> {
    try {
      // Create webview panel
      this.panel = vscode.window.createWebviewPanel(
        'xfiReportViewer',
        'X-Fidelity Analysis Report',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, 'out'),
            vscode.Uri.joinPath(this.context.extensionUri, 'dist')
          ]
        }
      );

      // Create safe webview wrapper
      this.safeWebview = new SafeWebview(this.panel.webview);

      // Set up message handling
      this.setupMessageHandling();

      // Set HTML content
      this.panel.webview.html = this.getWebviewContent();

      // Send initial data safely
      await this.sendAnalysisResultSafely(analysisResult);

      // Handle panel disposal
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.safeWebview = undefined;
      });
    } catch (error) {
      console.error('Failed to create report viewer:', error);
      vscode.window.showErrorMessage(
        `Failed to show report: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set up safe message handling between extension and webview
   */
  private setupMessageHandling(): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.onDidReceiveMessage(
      async (message: ReportViewerMessage) => {
        try {
          await this.handleWebviewMessage(message);
        } catch (error) {
          console.error('Error handling webview message:', error);

          if (this.safeWebview) {
            await this.safeWebview.postError(
              error instanceof Error ? error : new Error(String(error)),
              message.command
            );
          }
        }
      }
    );
  }

  /**
   * Handle messages from the webview safely
   */
  private async handleWebviewMessage(
    message: ReportViewerMessage
  ): Promise<void> {
    if (!this.safeWebview) {
      throw new Error('SafeWebview not initialized');
    }

    switch (message.command) {
      case 'ready':
        console.log('Webview ready, no additional action needed');
        break;

      case 'navigateToIssue':
        await this.handleNavigateToIssue(message.data);
        break;

      case 'requestDetails':
        await this.handleRequestDetails(message.data);
        break;

      case 'exportReport':
        await this.handleExportReport(message.data);
        break;

      case 'refreshData':
        await this.handleRefreshData();
        break;

      default:
        console.warn('Unknown webview command:', message.command);
        await this.safeWebview.postMessage({
          command: 'error',
          data: { message: `Unknown command: ${message.command}` }
        });
    }
  }

  /**
   * Send analysis results to webview safely
   */
  private async sendAnalysisResultSafely(analysisResult: any): Promise<void> {
    if (!this.safeWebview) {
      throw new Error('SafeWebview not initialized');
    }

    try {
      // Convert to serializable format
      const safeResult =
        this.convertAnalysisResultToSerializable(analysisResult);

      // Validate serialization before sending
      const validationResult = this.serializer.serialize(safeResult, {
        includeMetadata: true,
        errorOnFailure: false
      });

      if (!validationResult.success) {
        throw new Error(
          `Analysis result serialization failed: ${validationResult.error}`
        );
      }

      console.log(
        `📊 Sending analysis result (${validationResult.metadata?.byteSize} bytes)`
      );

      // Send the data safely
      await this.safeWebview.postMessage({
        command: 'analysisResult',
        data: safeResult
      });
    } catch (error) {
      console.error('Failed to send analysis result:', error);

      // Send error message instead
      await this.safeWebview.postError(
        error instanceof Error ? error : new Error(String(error)),
        'analysisResult'
      );
    }
  }

  /**
   * Convert analysis result to serializable format
   */
  private convertAnalysisResultToSerializable(
    analysisResult: any
  ): SerializableAnalysisResult {
    try {
      // Extract the core data we need
      const issueDetails =
        analysisResult?.metadata?.XFI_RESULT?.issueDetails || [];

      // Convert issues to serializable format
      const safeIssues = issueDetails.map((issue: any) => ({
        filePath: String(issue.filePath || ''),
        errors: (issue.errors || []).map((error: any) => ({
          ruleFailure: String(error.ruleFailure || ''),
          level: String(error.level || 'error'),
          details: this.convertErrorDetailsToSerializable(error.details)
        }))
      }));

      return {
        metadata: {
          XFI_RESULT: {
            issueDetails: safeIssues
          }
        },
        timestamp: Date.now(),
        duration: Number(analysisResult?.duration) || 0,
        summary: {
          totalIssues: safeIssues.reduce(
            (sum: number, issue: any) => sum + issue.errors.length,
            0
          ),
          filesAnalyzed: safeIssues.length,
          analysisTimeMs: Number(analysisResult?.duration) || 0
        },
        operationId: `analysis-${Date.now()}`
      };
    } catch (error) {
      console.error('Error converting analysis result:', error);

      // Return a safe fallback result
      return {
        metadata: {
          XFI_RESULT: {
            issueDetails: []
          }
        },
        timestamp: Date.now(),
        duration: 0,
        summary: {
          totalIssues: 0,
          filesAnalyzed: 0,
          analysisTimeMs: 0
        },
        operationId: `analysis-error-${Date.now()}`
      };
    }
  }

  /**
   * Convert error details to serializable format
   */
  private convertErrorDetailsToSerializable(details: any): any {
    if (!details || typeof details !== 'object') {
      return {};
    }

    const safeDetails: any = {};

    // Copy safe primitive properties
    for (const [key, value] of Object.entries(details)) {
      if (value === null || value === undefined) {
        safeDetails[key] = value;
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        safeDetails[key] = value;
      } else if (value instanceof vscode.Range) {
        safeDetails[key] = toSerializableRange(value);
      } else if (value instanceof vscode.Position) {
        safeDetails[key] = {
          line: value.line,
          character: value.character
        };
      } else if (Array.isArray(value)) {
        // Recursively process arrays
        safeDetails[key] = value.map(item =>
          this.convertErrorDetailsToSerializable(item)
        );
      } else if (typeof value === 'object') {
        // Recursively process objects
        safeDetails[key] = this.convertErrorDetailsToSerializable(value);
      } else {
        // Convert other types to string representation
        safeDetails[key] = String(value);
      }
    }

    return safeDetails;
  }

  /**
   * Handle navigation to an issue
   */
  private async handleNavigateToIssue(data: any): Promise<void> {
    if (!this.safeWebview) {
      return;
    }

    try {
      const { filePath, lineNumber, columnNumber } = data;

      if (!filePath) {
        throw new Error('File path is required for navigation');
      }

      // Open the file
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Navigate to specific location if provided
      if (typeof lineNumber === 'number') {
        const line = Math.max(0, lineNumber);
        const character = Math.max(0, columnNumber || 0);
        const position = new vscode.Position(line, character);

        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }

      // Send confirmation
      await this.safeWebview.postMessage({
        command: 'navigationComplete',
        data: {
          filePath,
          lineNumber: lineNumber || 0,
          success: true
        }
      });
    } catch (error) {
      console.error('Navigation failed:', error);

      await this.safeWebview.postMessage({
        command: 'navigationComplete',
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Handle request for additional details
   */
  private async handleRequestDetails(data: any): Promise<void> {
    if (!this.safeWebview) {
      return;
    }

    try {
      // This would typically fetch additional details from the analysis engine
      const details = {
        requestId: data.requestId,
        details: `Additional details for ${data.ruleId || 'unknown rule'}`,
        timestamp: Date.now()
      };

      await this.safeWebview.postMessage({
        command: 'detailsResponse',
        data: details
      });
    } catch (error) {
      console.error('Failed to fetch details:', error);

      await this.safeWebview.postError(
        error instanceof Error ? error : new Error(String(error)),
        'detailsResponse'
      );
    }
  }

  /**
   * Handle report export
   */
  private async handleExportReport(data: any): Promise<void> {
    if (!this.safeWebview) {
      return;
    }

    try {
      const { format } = data;

      // For demonstration, just show a message
      vscode.window.showInformationMessage(
        `Export to ${format} format is not yet implemented`
      );

      await this.safeWebview.postMessage({
        command: 'exportComplete',
        data: {
          success: true,
          format,
          message: 'Export functionality coming soon'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);

      await this.safeWebview.postError(
        error instanceof Error ? error : new Error(String(error)),
        'exportComplete'
      );
    }
  }

  /**
   * Handle data refresh request
   */
  private async handleRefreshData(): Promise<void> {
    if (!this.safeWebview) {
      return;
    }

    try {
      // This would typically trigger a new analysis
      vscode.window.showInformationMessage('Refreshing analysis data...');

      await this.safeWebview.postMessage({
        command: 'refreshStarted',
        data: { timestamp: Date.now() }
      });
    } catch (error) {
      console.error('Refresh failed:', error);

      await this.safeWebview.postError(
        error instanceof Error ? error : new Error(String(error)),
        'refreshStarted'
      );
    }
  }

  /**
   * Get the HTML content for the webview
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>X-Fidelity Analysis Report</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
          }
          .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .issue {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin: 10px 0;
            padding: 15px;
            background: var(--vscode-editor-background);
          }
          .issue-header {
            font-weight: bold;
            margin-bottom: 10px;
          }
          .error {
            margin: 5px 0;
            padding: 8px;
            background: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
          }
          .navigate-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 2px;
            cursor: pointer;
            margin-top: 5px;
          }
          .navigate-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>X-Fidelity Analysis Report</h1>
          <div id="summary">Loading analysis results...</div>
        </div>
        <div id="content" class="loading">
          <p>Please wait while the analysis results are loaded...</p>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          // Send ready message to extension
          vscode.postMessage({ command: 'ready', data: {} });
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'analysisResult':
                displayAnalysisResult(message.data);
                break;
              case 'error':
                displayError(message.data);
                break;
              case 'navigationComplete':
                handleNavigationComplete(message.data);
                break;
              default:
                console.log('Unknown message from extension:', message);
            }
          });
          
          function displayAnalysisResult(data) {
            const summaryEl = document.getElementById('summary');
            const contentEl = document.getElementById('content');
            
            // Update summary
            summaryEl.innerHTML = \`
              <p><strong>Total Issues:</strong> \${data.summary.totalIssues}</p>
              <p><strong>Files Analyzed:</strong> \${data.summary.filesAnalyzed}</p>
              <p><strong>Analysis Time:</strong> \${data.summary.analysisTimeMs}ms</p>
            \`;
            
            // Display issues
            if (data.metadata.XFI_RESULT.issueDetails.length === 0) {
              contentEl.innerHTML = '<div class="no-issues">🎉 No issues found!</div>';
              return;
            }
            
            let html = '';
            data.metadata.XFI_RESULT.issueDetails.forEach((issue, issueIndex) => {
              html += \`
                <div class="issue">
                  <div class="issue-header">📁 \${issue.filePath}</div>
              \`;
              
              issue.errors.forEach((error, errorIndex) => {
                html += \`
                  <div class="error">
                    <div><strong>\${error.ruleFailure}</strong> (\${error.level})</div>
                    \${error.details.message ? \`<div>\${error.details.message}</div>\` : ''}
                    \${error.details.lineNumber !== undefined ? 
                      \`<button class="navigate-btn" onclick="navigateToIssue('\${issue.filePath}', \${error.details.lineNumber}, \${error.details.columnNumber || 0})">
                        Go to Line \${error.details.lineNumber + 1}
                      </button>\` : ''}
                  </div>
                \`;
              });
              
              html += '</div>';
            });
            
            contentEl.innerHTML = html;
          }
          
          function displayError(data) {
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = \`
              <div class="error">
                <h3>❌ Error Loading Report</h3>
                <p>\${data.message || 'Unknown error occurred'}</p>
                \${data.error ? \`<pre>\${data.error}</pre>\` : ''}
              </div>
            \`;
          }
          
          function navigateToIssue(filePath, lineNumber, columnNumber) {
            vscode.postMessage({
              command: 'navigateToIssue',
              data: { filePath, lineNumber, columnNumber }
            });
          }
          
          function handleNavigationComplete(data) {
            if (data.success) {
              console.log('Navigation successful');
            } else {
              alert(\`Navigation failed: \${data.error}\`);
            }
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
    this.safeWebview = undefined;
  }
}
