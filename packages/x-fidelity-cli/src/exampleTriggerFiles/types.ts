// Simple types for CLI example files
export interface Logger {
  error(obj: object | string, msg?: string, ...args: any[]): void;
  info(obj: object | string, msg?: string, ...args: any[]): void;
  warn(obj: object | string, msg?: string, ...args: any[]): void;
  debug(obj: object | string, msg?: string, ...args: any[]): void;
  trace(obj: object | string, msg?: string, ...args: any[]): void;
  fatal(obj: object | string, msg?: string, ...args: any[]): void;
  level: string;
}

export interface Metrics {
  increment(key: string): void;
}

// Simple logger implementation for examples
export function createPinoStyleLogger(): Logger {
  return {
    error: (obj: object | string, msg?: string, ...args: any[]) => console.error(obj, msg, ...args),
    info: (obj: object | string, msg?: string, ...args: any[]) => console.info(obj, msg, ...args),
    warn: (obj: object | string, msg?: string, ...args: any[]) => console.warn(obj, msg, ...args),
    debug: (obj: object | string, msg?: string, ...args: any[]) => console.debug(obj, msg, ...args),
    trace: (obj: object | string, msg?: string, ...args: any[]) => console.trace(obj, msg, ...args),
    fatal: (obj: object | string, msg?: string, ...args: any[]) => console.error('FATAL:', obj, msg, ...args),
    level: 'info'
  };
}
