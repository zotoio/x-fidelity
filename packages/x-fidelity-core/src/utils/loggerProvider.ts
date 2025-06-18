import { ILogger } from '@x-fidelity/types';
import { DefaultLogger } from './defaultLogger';

/**
 * Logger provider that allows injecting a logger instance
 * This enables the CLI to provide its pino logger to core and plugins
 */
class LoggerProvider {
  private static injectedLogger: ILogger | null = null;
  private static defaultLogger: ILogger = new DefaultLogger('[X-Fidelity-Core]');

  /**
   * Set the logger instance to be used throughout the system
   * @param logger The logger instance to inject
   */
  static setLogger(logger: ILogger): void {
    this.injectedLogger = logger;
  }

  /**
   * Get the current logger instance (injected or default)
   * @returns The current logger instance
   */
  static getLogger(): ILogger {
    return this.injectedLogger || this.defaultLogger;
  }

  /**
   * Check if a logger has been injected
   * @returns True if a logger has been injected
   */
  static hasInjectedLogger(): boolean {
    return this.injectedLogger !== null;
  }

  /**
   * Clear the injected logger (useful for testing)
   */
  static clearInjectedLogger(): void {
    this.injectedLogger = null;
  }

  /**
   * Create a child logger from the current logger
   * @param bindings Additional context for the child logger
   * @returns A child logger instance
   */
  static createChildLogger(bindings: any): ILogger {
    return this.getLogger().child(bindings);
  }
}

export { LoggerProvider }; 