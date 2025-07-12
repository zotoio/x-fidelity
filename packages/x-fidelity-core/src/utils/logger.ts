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
  setLevel: (level: any) => LoggerProvider.getLogger().setLevel(level),
  getLevel: () => LoggerProvider.getLogger().getLevel(),
  isLevelEnabled: (level: any) => LoggerProvider.getLogger().isLevelEnabled(level)
};

