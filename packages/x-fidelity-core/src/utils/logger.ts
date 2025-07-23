import { LoggerProvider } from './loggerProvider';
import { ILogger } from '@x-fidelity/types';

// Create a proxy logger that dynamically delegates to the mode-aware logger from the provider
export const logger: ILogger = {
  trace: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.trace(msgOrMeta, metaOrMsg);
  },
  debug: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.debug(msgOrMeta, metaOrMsg);
  },
  info: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.info(msgOrMeta, metaOrMsg);
  },
  warn: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.warn(msgOrMeta, metaOrMsg);
  },
  error: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.error(msgOrMeta, metaOrMsg);
  },
  fatal: (msgOrMeta: string | any, metaOrMsg?: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.fatal(msgOrMeta, metaOrMsg);
  },
  setLevel: (level: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.setLevel(level);
  },
  getLevel: () => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.getLevel();
  },
  isLevelEnabled: (level: any) => {
    const currentMode = LoggerProvider.getCurrentExecutionMode();
    const currentLogger = LoggerProvider.getLoggerForMode(currentMode);
    return currentLogger.isLevelEnabled(level);
  }
};

