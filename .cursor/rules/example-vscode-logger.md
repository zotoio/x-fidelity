```
import * as vscode from 'vscode';

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    file?: string;
    line?: number;
    data?: any;
}

export class StructuredLogger {
    private outputChannel: vscode.OutputChannel;
    private currentLogLevel: LogLevel;
    private readonly channelName: string;

    constructor(channelName: string, initialLogLevel: LogLevel = LogLevel.INFO) {
        this.channelName = channelName;
        this.outputChannel = vscode.window.createOutputChannel(channelName);
        this.currentLogLevel = initialLogLevel;
        
        // Register configuration change listener
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
        this.updateLogLevelFromConfig();
    }

    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent) {
        if (event.affectsConfiguration(`${this.channelName.toLowerCase()}.logLevel`)) {
            this.updateLogLevelFromConfig();
        }
    }

    private updateLogLevelFromConfig() {
        const config = vscode.workspace.getConfiguration(this.channelName.toLowerCase());
        const configLevel = config.get<string>('logLevel', 'info');
        this.currentLogLevel = this.parseLogLevel(configLevel);
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'error': return LogLevel.ERROR;
            case 'warn': return LogLevel.WARN;
            case 'info': return LogLevel.INFO;
            case 'debug': return LogLevel.DEBUG;
            case 'trace': return LogLevel.TRACE;
            default: return LogLevel.INFO;
        }
    }

    public setLogLevel(level: LogLevel) {
        this.currentLogLevel = level;
    }

    public getLogLevel(): LogLevel {
        return this.currentLogLevel;
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this.currentLogLevel;
    }

    private formatTimestamp(date: Date): string {
        return date.toISOString().replace('T', ' ').replace('Z', '');
    }

    private formatLogLevel(level: LogLevel): string {
        const levels = ['ERROR', 'WARN ', 'INFO ', 'DEBUG', 'TRACE'];
        return levels[level];
    }

    private createFileLink(file: string, line?: number): string {
        if (!file) return '';
        
        // Create clickable file link - VS Code recognizes this format
        const lineInfo = line ? `:${line}` : '';
        return `${file}${lineInfo}`;
    }

    private formatLogEntry(entry: LogEntry): string {
        const timestamp = this.formatTimestamp(entry.timestamp);
        const level = this.formatLogLevel(entry.level);
        const fileLink = entry.file ? ` [${this.createFileLink(entry.file, entry.line)}]` : '';
        
        let formatted = `[${timestamp}] ${level}: ${entry.message}${fileLink}`;
        
        if (entry.data) {
            formatted += `\n${JSON.stringify(entry.data, null, 2)}`;
        }
        
        return formatted;
    }

    private log(entry: LogEntry) {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const formattedMessage = this.formatLogEntry(entry);
        this.outputChannel.appendLine(formattedMessage);
        
        // Auto-show output channel for errors
        if (entry.level === LogLevel.ERROR) {
            this.outputChannel.show(true);
        }
    }

    public error(message: string, file?: string, line?: number, data?: any) {
        this.log({
            level: LogLevel.ERROR,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    public warn(message: string, file?: string, line?: number, data?: any) {
        this.log({
            level: LogLevel.WARN,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    public info(message: string, file?: string, line?: number, data?: any) {
        this.log({
            level: LogLevel.INFO,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    public debug(message: string, file?: string, line?: number, data?: any) {
        this.log({
            level: LogLevel.DEBUG,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    public trace(message: string, file?: string, line?: number, data?: any) {
        this.log({
            level: LogLevel.TRACE,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    // Convenience method to log from current stack frame
    public logWithSource(level: LogLevel, message: string, data?: any) {
        const stack = new Error().stack;
        let file: string | undefined;
        let line: number | undefined;

        if (stack) {
            const stackLines = stack.split('\n');
            // Skip first 3 lines (Error, this method, calling method)
            const callerLine = stackLines[3];
            if (callerLine) {
                const match = callerLine.match(/\((.+):(\d+):\d+\)/);
                if (match) {
                    file = match[1];
                    line = parseInt(match[2], 10);
                }
            }
        }

        this.log({
            level,
            message,
            timestamp: new Date(),
            file,
            line,
            data
        });
    }

    public show() {
        this.outputChannel.show();
    }

    public clear() {
        this.outputChannel.clear();
    }

    public dispose() {
        this.outputChannel.dispose();
    }
}

// Extension activation example
export function activate(context: vscode.ExtensionContext) {
    const logger = new StructuredLogger('MyExtension', LogLevel.INFO);
    
    // Example usage
    logger.info('Extension activated successfully');
    logger.debug('Debug information', 'src/extension.ts', 42, { version: '1.0.0' });
    logger.warn('This is a warning', 'src/utils.ts', 15);
    logger.error('Something went wrong', 'src/parser.ts', 123, { 
        error: 'File not found',
        path: '/some/path'
    });

    // Add to subscriptions for proper cleanup
    context.subscriptions.push(logger);
    
    // Make logger available globally in extension
    (global as any).logger = logger;
}

// Configuration schema for package.json
/*
Add to your package.json:

{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "MyExtension",
      "properties": {
        "myextension.logLevel": {
          "type": "string",
          "enum": ["error", "warn", "info", "debug", "trace"],
          "default": "info",
          "description": "Set the logging level for the extension"
        }
      }
    }
  }
}
*/
```