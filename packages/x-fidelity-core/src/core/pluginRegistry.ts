import { XFiPlugin, FactDefn, OperatorDefn, PluginError, PluginResult, PluginRegistry, PluginContext, PluginInitializationOptions } from '@x-fidelity/types';
import { logger } from '../utils/logger';
import { LoggerProvider } from '../utils/loggerProvider';
import { createPluginLoggerContext, createPluginLogger } from '../utils/pluginLogger';

export class XFiPluginRegistry implements PluginRegistry {
    private static instance: XFiPluginRegistry;
    private plugins: XFiPlugin[] = [];
    private initializationOptions: PluginInitializationOptions;
    private initializationStatus: Map<string, 'pending' | 'initializing' | 'completed' | 'failed'> = new Map();
    private initializationPromises: Map<string, Promise<void>> = new Map();

    private constructor(options: PluginInitializationOptions = {}) {
        this.initializationOptions = {
            enableLoggerContext: true,
            enableErrorWrapping: true,
            enableLegacySupport: true,
            ...options
        };
    }

    public static getInstance(options?: PluginInitializationOptions): XFiPluginRegistry {
        if (!XFiPluginRegistry.instance) {
            XFiPluginRegistry.instance = new XFiPluginRegistry(options);
        }
        return XFiPluginRegistry.instance;
    }

    public registerPlugin(plugin: XFiPlugin): void {
        // Validate plugin structure - maintain old 3.24.0 validation behavior
        if (!plugin || !plugin.name || !plugin.version) {
            logger.error('Invalid plugin format - missing name or version');
            throw new Error('Invalid plugin format - missing name or version');
        }

        // Check for duplicate plugins by name - v4 enhancement
        const existingPlugin = this.plugins.find(p => p.name === plugin.name);
        if (existingPlugin) {
            logger.warn(`Plugin ${plugin.name} is already registered, skipping duplicate registration`);
            return;
        }

        // Enhanced logging from v3.24.0
        logger.debug(`Registering plugin: ${plugin.name}`);
        
        // Ensure logger is available for plugin registration
        LoggerProvider.ensureInitialized();

        // Initialize plugin with context if supported - WITH PROPER STATE TRACKING
        try {
            this.initializePluginSafe(plugin);
        } catch (error) {
            // Log the error but don't throw to avoid breaking plugin registration flow
            logger.error(`Plugin ${plugin.name} initialization failed: ${error}`);
            this.initializationStatus.set(plugin.name, 'failed');
            // Re-throw for test environments or when plugin initialization is critical
            if (process.env.NODE_ENV === 'test') {
                throw error;
            }
        }

        // Wrap plugin functions with error handling and logger context
        if (this.initializationOptions.enableErrorWrapping) {
            this.wrapPluginFunctions(plugin);
        }

        // Validate facts and operators - v4 enhanced validation
        this.validatePluginComponents(plugin);

        this.plugins.push(plugin);
        logger.info(`Successfully registered plugin: ${plugin.name} v${plugin.version}`);
    }

    private initializePluginSafe(plugin: XFiPlugin): void {
        if (!plugin.initialize) {
            this.initializationStatus.set(plugin.name, 'completed');
            return;
        }

        // Check if already initializing or completed
        const currentStatus = this.initializationStatus.get(plugin.name);
        if (currentStatus === 'initializing' || currentStatus === 'completed') {
            logger.debug(`Plugin ${plugin.name} already ${currentStatus}, skipping initialization`);
            return;
        }

        // Set status to initializing to prevent concurrent attempts
        this.initializationStatus.set(plugin.name, 'initializing');

        try {
            // Create plugin context with logger
            const context = this.createPluginContext(plugin);
            
            // Check if the plugin initialize method expects a context parameter
            if (plugin.initialize.length > 0) {
                // New-style plugin with context support
                // Create a tracked promise for initialization
                const initPromise = plugin.initialize(context).then(() => {
                    logger.debug(`Plugin ${plugin.name} initialized with context`);
                    this.initializationStatus.set(plugin.name, 'completed');
                }).catch((error) => {
                    logger.error(`Plugin ${plugin.name} initialization failed: ${error}`);
                    this.initializationStatus.set(plugin.name, 'failed');
                    throw error;
                });
                
                // Store the promise for potential awaiting
                this.initializationPromises.set(plugin.name, initPromise);
                
                // For critical plugins like AST, log the start but let it complete asynchronously
                if (plugin.name === 'xfi-plugin-ast') {
                    logger.info(`Critical plugin ${plugin.name} initialization started - will complete asynchronously`);
                }
            } else if (this.initializationOptions.enableLegacySupport) {
                // Legacy plugin without context - try to initialize without parameters
                const result = (plugin.initialize as any)();
                if (result && typeof result.then === 'function') {
                    // Handle async legacy initialize
                    const legacyPromise = result.then(() => {
                        logger.debug(`Plugin ${plugin.name} initialized (legacy mode)`);
                        this.initializationStatus.set(plugin.name, 'completed');
                    }).catch((error: any) => {
                        logger.error(`Plugin ${plugin.name} legacy initialization failed: ${error}`);
                        this.initializationStatus.set(plugin.name, 'failed');
                        throw error;
                    });
                    
                    this.initializationPromises.set(plugin.name, legacyPromise);
                } else {
                    logger.debug(`Plugin ${plugin.name} initialized (legacy mode)`);
                    this.initializationStatus.set(plugin.name, 'completed');
                }
            } else {
                logger.warn(`Plugin ${plugin.name} uses legacy initialization but legacy support is disabled`);
                this.initializationStatus.set(plugin.name, 'completed');
            }
        } catch (error) {
            const errorMessage = `Plugin ${plugin.name} initialization failed: ${error}`;
            logger.error(errorMessage);
            this.initializationStatus.set(plugin.name, 'failed');
            
            // Use plugin's error handler if available
            if (plugin.onError && error instanceof Error) {
                const pluginError = plugin.onError(error);
                logger.error(`Plugin error details:`, pluginError);
            }
            
            throw new Error(errorMessage);
        }
    }



    /**
     * Check if a plugin is ready (completed initialization)
     */
    public isPluginReady(pluginName: string): boolean {
        return this.initializationStatus.get(pluginName) === 'completed';
    }

    /**
     * Get initialization status for all plugins
     */
    public getInitializationStatus(): Map<string, 'pending' | 'initializing' | 'completed' | 'failed'> {
        return new Map(this.initializationStatus);
    }

    /**
     * Wait for a specific plugin to complete initialization
     */
    public async waitForPlugin(pluginName: string): Promise<void> {
        const promise = this.initializationPromises.get(pluginName);
        if (promise) {
            logger.debug(`Waiting for plugin ${pluginName} to complete initialization...`);
            await promise;
            logger.debug(`Plugin ${pluginName} initialization completed`);
        } else {
            // Check if plugin is already completed or doesn't need initialization
            const status = this.initializationStatus.get(pluginName);
            if (status === 'completed') {
                logger.debug(`Plugin ${pluginName} already completed initialization`);
            } else if (status === 'failed') {
                throw new Error(`Plugin ${pluginName} initialization failed`);
            } else {
                logger.debug(`Plugin ${pluginName} has no initialization promise`);
            }
        }
    }

    /**
     * Wait for all plugins to complete initialization
     */
    public async waitForAllPlugins(): Promise<void> {
        const promises = Array.from(this.initializationPromises.values());
        if (promises.length > 0) {
            logger.debug(`Waiting for ${promises.length} plugins to complete initialization...`);
            await Promise.allSettled(promises);
            logger.debug('All plugin initialization attempts completed');
        }
    }

    private createPluginContext(plugin: XFiPlugin): PluginContext {
        // Create logger context for the plugin
        const loggerContext = createPluginLoggerContext(plugin.name);
        
        return {
            config: {}, // TODO: Add plugin-specific configuration
            logger: loggerContext.logger,
            utils: {}, // TODO: Add plugin utilities
            loggerContext: {
                createOperationLogger: loggerContext.createOperationLogger,
                createFactLogger: loggerContext.createFactLogger,
                createOperatorLogger: loggerContext.createOperatorLogger
            }
        };
    }

    private wrapPluginFunctions(plugin: XFiPlugin): void {
        // Wrap facts to ensure logger availability and error handling
        if (plugin.facts) {
            plugin.facts = plugin.facts.map(fact => ({
                ...fact,
                fn: async (params: any, almanac: any) => {
                    const pluginLogger = createPluginLogger(plugin.name, { fact: fact.name });
                    
                    try {
                        pluginLogger.debug(`Executing fact: ${fact.name}`);
                        const result = await fact.fn(params, almanac);
                        pluginLogger.debug(`Fact ${fact.name} completed successfully`);
                        return result;
                    } catch (error) {
                        pluginLogger.error(`Fact ${fact.name} failed:`, error);
                        
                        // Use plugin's error handler if available
                        if (plugin.onError && error instanceof Error) {
                            const pluginError = plugin.onError(error);
                            pluginLogger.error(`Plugin error details:`, pluginError);
                        }
                        
                        throw error;
                    }
                }
            }));
        }

        // Wrap operators to ensure logger availability and error handling
        if (plugin.operators) {
            plugin.operators = plugin.operators.map(operator => ({
                ...operator,
                fn: (factValue: any, operatorValue: any) => {
                    const pluginLogger = createPluginLogger(plugin.name, { operator: operator.name });
                    
                    try {
                        pluginLogger.debug(`Executing operator: ${operator.name}`);
                        const result = operator.fn(factValue, operatorValue);
                        pluginLogger.debug(`Operator ${operator.name} completed successfully`);
                        return result;
                    } catch (error) {
                        pluginLogger.error(`Operator ${operator.name} failed:`, error);
                        
                        // Use plugin's error handler if available
                        if (plugin.onError && error instanceof Error) {
                            const pluginError = plugin.onError(error);
                            pluginLogger.error(`Plugin error details:`, pluginError);
                        }
                        
                        throw error;
                    }
                }
            }));
        }
    }

    private validatePluginComponents(plugin: XFiPlugin): void {
        if (plugin.facts) {
            plugin.facts.forEach(fact => {
                if (!fact.name || typeof fact.fn !== 'function') {
                    logger.warn(`Invalid fact in plugin ${plugin.name}: ${fact.name}`);
                }
            });
        }

        if (plugin.operators) {
            plugin.operators.forEach(operator => {
                if (!operator.name || typeof operator.fn !== 'function') {
                    logger.warn(`Invalid operator in plugin ${plugin.name}: ${operator.name}`);
                }
            });
        }
    }

    public getPlugin(name: string): XFiPlugin | undefined {
        return this.plugins.find(p => p.name === name);
    }

    public getPluginFacts(): FactDefn[] {
        return this.plugins.flatMap(plugin => plugin.facts || []);
    }

    public getPluginOperators(): OperatorDefn[] {
        return this.plugins.flatMap(plugin => plugin.operators || []);
    }

    public getPluginCount(): number {
        return this.plugins.length;
    }

    public getPluginNames(): string[] {
        return this.plugins.map(p => p.name);
    }

    public executePluginFunction(pluginName: string, functionName: string, ...args: any[]): PluginResult {
        try {
            const plugin = this.plugins.find(p => p.name === pluginName);
            if (!plugin) {
                throw new Error(`Plugin ${pluginName} not found`);
            }

            const func = plugin[functionName as keyof XFiPlugin];
            if (typeof func !== 'function') {
                throw new Error(`Function ${functionName} not found in plugin ${pluginName}`);
            }

            // Create plugin logger for function execution
            const pluginLogger = createPluginLogger(pluginName, { function: functionName });
            pluginLogger.debug(`Executing plugin function: ${functionName}`);

            // Cast args to a tuple type to allow spreading
            const result = func.call(plugin, ...(args as [any]));
            
            pluginLogger.debug(`Plugin function ${functionName} completed successfully`);
            return { success: true, data: result };

        } catch (error) {
            logger.error(`Error executing plugin ${pluginName}.${functionName}: ${error}`);
            
            // Use plugin's error handler if available
            const plugin = this.plugins.find(p => p.name === pluginName);
            if (plugin?.onError && error instanceof Error) {
                const pluginError = plugin.onError(error);
                // Always propagate errors up, let the rule's errorBehavior determine if it's fatal
                return { 
                    success: false, 
                    error: pluginError,
                    data: null 
                };
            }

            // For unhandled errors, throw an error with plugin error details (v3.24.0 behavior)
            const pluginError = {
                message: `Plugin ${pluginName} execution failed: ${error}`,
                level: 'fatality' as const, // Default to fatality for unhandled errors
                details: error instanceof Error ? error.stack : undefined
            };

            const wrappedError = new Error(pluginError.message);
            (wrappedError as any).pluginError = pluginError;
            throw wrappedError;
        }
    }

    public async cleanupAllPlugins(): Promise<void> {
        const cleanupPromises = this.plugins
            .filter(plugin => plugin.cleanup)
            .map(async plugin => {
                try {
                    await plugin.cleanup!();
                    logger.debug(`Plugin ${plugin.name} cleaned up successfully`);
                } catch (error) {
                    logger.error(`Error cleaning up plugin ${plugin.name}:`, error);
                }
            });

        await Promise.all(cleanupPromises);
    }

    public reset(): void {
        this.plugins = [];
    }
}

// Export singleton instance
export const pluginRegistry = XFiPluginRegistry.getInstance();
