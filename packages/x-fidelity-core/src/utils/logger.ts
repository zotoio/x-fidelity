import { LoggerProvider } from './loggerProvider';
import { ILogger } from '@x-fidelity/types';

// Create a proxy logger that dynamically delegates to the current logger from the provider
export const logger: ILogger = {
  trace: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().trace(msgOrMeta, metaOrMsg),
  debug: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().debug(msgOrMeta, metaOrMsg),
  info: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().info(msgOrMeta, metaOrMsg),
  warn: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().warn(msgOrMeta, metaOrMsg),
  error: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().error(msgOrMeta, metaOrMsg),
  fatal: (msgOrMeta: string | any, metaOrMsg?: any) => LoggerProvider.getLogger().fatal(msgOrMeta, metaOrMsg),
  child: (bindings: any) => LoggerProvider.getLogger().child(bindings),
  setLevel: (level: any) => LoggerProvider.getLogger().setLevel(level),
  getLevel: () => LoggerProvider.getLogger().getLevel(),
  isLevelEnabled: (level: any) => LoggerProvider.getLogger().isLevelEnabled(level)
};

// For backward compatibility, provide access to the provider
export { LoggerProvider };

// Legacy functions for compatibility
export function setLogLevel(level: string): void {
  LoggerProvider.getLogger().setLevel(level as any);
}

export function getLogPrefix(): string {
  // This is a legacy function that may not be relevant with the new provider pattern
  // but keeping for backward compatibility
  return '[X-Fidelity-Core]';
}

export function setLogPrefix(prefix: string): void {
  // This is a legacy function - with the provider pattern, prefixes are handled
  // by the specific logger implementations
  console.warn('setLogPrefix is deprecated with the new logger provider pattern');
}

export function setLogFilePath(filePath: string): void {
  // This is a legacy function - file paths are handled by specific logger implementations
  console.warn('setLogFilePath is deprecated with the new logger provider pattern');
}

export function getLogFilePath(): string {
  // This is a legacy function - returning empty string for compatibility
  return '';
}

export function resetLogger(): void {
  // Clear any injected logger to fall back to default
  LoggerProvider.clearInjectedLogger();
}

export function generateLogPrefix(): string {
  return '';
} 