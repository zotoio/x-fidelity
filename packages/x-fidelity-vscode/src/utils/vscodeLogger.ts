import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ILogger, LogLevel, LogLevelValues } from '@x-fidelity/types';
import { EnhancedLogger, EnhancedLoggerConfig } from '@x-fidelity/core';

// Use LogLevel from @x-fidelity/types - no need to redefine
// Map string log levels to numeric values for internal use
const LOG_LEVEL_NUMERIC = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
} as const;

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  correlationId?: string;
  component?: string;
  operation?: string;
  data?: any;
}

export class VSCodeLogger {
  private outputChannel: vscode.OutputChannel;
  private currentLogLevel: LogLevel = 'info';
  private readonly componentName: string;
  private readonly prefix: string;
  private isStreaming: boolean = false;

  constructor(
    componentName: string,
    prefix: string = '',
    logLevel?: string,
    existingChannel?: vscode.OutputChannel
  ) {
    this.componentName = componentName;
    this.prefix = prefix;

    // Use existing channel or create new one
    this.outputChannel =
      existingChannel || vscode.window.createOutputChannel('X-Fidelity');

    if (logLevel) {
      this.currentLogLevel = this.parseLogLevel(logLevel);
    } else {
      this.updateLogLevelFromConfig();
    }

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(
      this.onConfigurationChanged,
      this
    );
  }

  private onConfigurationChanged(event: vscode.ConfigurationChangeEvent) {
    if (
      event.affectsConfiguration('xfidelity.debugMode') ||
      event.affectsConfiguration('xfidelity.logLevel')
    ) {
      this.updateLogLevelFromConfig();
    }
  }

  private updateLogLevelFromConfig() {
    const config = vscode.workspace.getConfiguration('xfidelity');
    const debugMode = config.get<boolean>('debugMode', false);
    const configLevel = config.get<string>(
      'logLevel',
      debugMode ? 'debug' : 'info'
    );
    this.currentLogLevel = this.parseLogLevel(configLevel);
  }

  private parseLogLevel(level: string): LogLevel {
    const normalizedLevel = level.toLowerCase();
    if (['error', 'warn', 'info', 'debug', 'trace'].includes(normalizedLevel)) {
      return normalizedLevel as LogLevel;
    }
    return 'info';
  }

  public setLogLevel(level: LogLevel | string) {
    if (typeof level === 'string') {
      this.currentLogLevel = this.parseLogLevel(level);
    } else {
      this.currentLogLevel = level;
    }
  }

  public getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentNumeric =
      LOG_LEVEL_NUMERIC[this.currentLogLevel] ?? LOG_LEVEL_NUMERIC.info;
    const requestedNumeric = LOG_LEVEL_NUMERIC[level] ?? LOG_LEVEL_NUMERIC.info;
    return requestedNumeric <= currentNumeric;
  }

  private formatTimestamp(date: Date): string {
    // Enhanced timestamp with milliseconds for precise correlation
    const time = date.toTimeString().split(' ')[0];
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  }

  private formatLogLevel(level: LogLevel): string {
    const levelEmojis = {
      error: '💥',
      warn: '⚠️ ',
      info: 'ℹ️ ',
      debug: '🔍',
      trace: '🔎'
    };

    const levelNames = {
      error: 'ERROR',
      warn: 'WARN ',
      info: 'INFO ',
      debug: 'DEBUG',
      trace: 'TRACE'
    };

    return `${levelEmojis[level]} ${levelNames[level]}`;
  }

  private formatCorrelationInfo(
    correlationId?: string,
    component?: string,
    operation?: string
  ): string {
    const parts: string[] = [];

    if (correlationId) {
      parts.push(`[${correlationId.substring(0, 8)}]`);
    }

    if (component) {
      parts.push(`{${component}}`);
    }

    if (operation) {
      parts.push(`(${operation})`);
    }

    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const level = this.formatLogLevel(entry.level);
    const correlationInfo = this.formatCorrelationInfo(
      entry.correlationId,
      entry.component,
      entry.operation
    );
    const prefix = this.prefix ? `[${this.prefix}] ` : '';

    let formatted = `[${timestamp}] ${level} ${prefix}${entry.message}${correlationInfo}`;

    if (entry.data && Object.keys(entry.data).length > 0) {
      // Format metadata in a readable way
      const dataStr =
        typeof entry.data === 'string'
          ? entry.data
          : JSON.stringify(entry.data, null, 2);
      formatted += `\n    📋 ${dataStr.replace(/\n/g, '\n    ')}`;
    }

    return formatted;
  }

  private log(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatLogEntry(entry);
    this.outputChannel.appendLine(formattedMessage);

    // Auto-show output channel for errors and when streaming
    if (entry.level === 'error' || this.isStreaming) {
      this.outputChannel.show(true);
    }
  }

  public trace(message: string | any, metadata?: any): void {
    this.logWithMetadata('trace', message, metadata);
  }

  public debug(message: string | any, metadata?: any): void {
    this.logWithMetadata('debug', message, metadata);
  }

  public info(message: string | any, metadata?: any): void {
    this.logWithMetadata('info', message, metadata);
  }

  public warn(message: string | any, metadata?: any): void {
    this.logWithMetadata('warn', message, metadata);
  }

  public error(message: string | any, metadata?: any): void {
    this.logWithMetadata('error', message, metadata);
  }

  public fatal(message: string | any, metadata?: any): void {
    this.logWithMetadata('error', message, metadata);
  }

  private logWithMetadata(
    level: LogLevel,
    message: string | any,
    metadata?: any
  ) {
    let logMessage: string;
    let logData: any = metadata;

    if (typeof message === 'string') {
      logMessage = message;
    } else if (message && typeof message === 'object') {
      if (message.message) {
        logMessage = message.message;
        logData = { ...message, ...metadata };
        delete logData.message;
      } else {
        logMessage = JSON.stringify(message);
        logData = metadata;
      }
    } else {
      logMessage = String(message);
    }

    // Extract correlation info from metadata
    const correlationId = logData?.correlationId;
    const component = logData?.component;
    const operation = logData?.operation;

    this.log({
      level,
      message: logMessage,
      timestamp: new Date(),
      correlationId,
      component,
      operation,
      data: logData
    });
  }

  // 🎯 NEW: Streaming capabilities for CLI output
  public startStreaming(): void {
    this.isStreaming = true;
    this.info('🚀 Starting real-time log streaming...');
  }

  public stopStreaming(): void {
    this.isStreaming = false;
    this.info('⏹️  Stopped real-time log streaming');
  }

  public streamLine(
    line: string,
    source: 'stdout' | 'stderr' = 'stdout'
  ): void {
    const emoji = source === 'stderr' ? '📛' : '📤';
    const level = source === 'stderr' ? 'warn' : 'info';

    // Try to parse JSON lines from CLI
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      try {
        const jsonData = JSON.parse(line.trim());
        this.logWithMetadata(
          level,
          `${emoji} CLI ${source.toUpperCase()}`,
          jsonData
        );
        return;
      } catch (e) {
        // Not JSON, log as regular text
      }
    }

    // Log regular text lines
    this.logWithMetadata(
      level,
      `${emoji} CLI ${source.toUpperCase()}: ${line.trim()}`
    );
  }

  // 🎯 NEW: Clear output before analysis
  public clearForNewAnalysis(correlationId?: string): void {
    this.clear();
    this.info('🧹 Cleared output for new analysis', {
      correlationId,
      operation: 'clear-output'
    });
    this.info('═'.repeat(80));
    if (correlationId) {
      this.info(`🔗 Analysis Correlation ID: ${correlationId}`, {
        correlationId
      });
    }
    this.info('═'.repeat(80));
  }

  // 🎯 NEW: Display XFI_RESULT.json in formatted way
  public displayAnalysisResult(xfiResult: any, correlationId?: string): void {
    this.info('📊 Analysis Results', {
      correlationId,
      operation: 'display-results'
    });
    this.info('─'.repeat(60));

    if (xfiResult && xfiResult.XFI_RESULT) {
      const result = xfiResult.XFI_RESULT;

      // Summary information
      this.info(`✅ Analysis completed successfully`, {
        correlationId,
        totalIssues: result.totalIssues,
        filesAnalyzed: result.fileCount,
        analysisTime: result.analysisTimeMs
          ? `${result.analysisTimeMs}ms`
          : 'unknown'
      });

      if (result.totalIssues > 0) {
        this.warn(
          `⚠️  Found ${result.totalIssues} issues across ${result.fileCount} files`,
          {
            correlationId,
            totalIssues: result.totalIssues,
            fileCount: result.fileCount
          }
        );

        // Show issue breakdown by severity
        if (result.issues && Array.isArray(result.issues)) {
          const severityCounts = result.issues.reduce(
            (acc: any, issue: any) => {
              const severity = issue.severity || 'unknown';
              acc[severity] = (acc[severity] || 0) + 1;
              return acc;
            },
            {}
          );

          this.info('📋 Issue Breakdown by Severity:', {
            correlationId,
            severityCounts
          });
        }
      } else {
        this.info('🎉 No issues found - excellent code quality!', {
          correlationId
        });
      }

      // Performance metrics
      if (result.metadata?.performanceMetrics) {
        this.debug('⚡ Performance Metrics:', {
          correlationId,
          metrics: result.metadata.performanceMetrics
        });
      }
    } else {
      this.error('❌ Invalid or missing XFI_RESULT in analysis output', {
        correlationId,
        receivedData: xfiResult
      });
    }

    this.info('─'.repeat(60));
    this.info(
      '🏁 Analysis complete - check Problems panel for detailed issues'
    );
  }

  public show(): void {
    this.outputChannel.show();
  }

  public clear(): void {
    this.outputChannel.clear();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }

  // Legacy compatibility methods
  public setLevel(level: string): void {
    this.setLogLevel(level);
  }

  public getLevel(): string {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    return levels[this.currentLogLevel];
  }

  public isLevelEnabled(level: string): boolean {
    const logLevel = this.parseLogLevel(level);
    return this.shouldLog(logLevel);
  }
}
