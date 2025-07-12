import { XFiPluginRegistry } from './pluginRegistry';
import { LoggerProvider } from '../utils/loggerProvider';
import { XFiPlugin, PluginContext, FactDefn, OperatorDefn, ILogger } from '@x-fidelity/types';

// Mock logger for testing
class MockLogger implements ILogger {
    public logs: Array<{ level: string; message: string; meta?: any }> = [];

    trace(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'trace', message: msgOrMeta, meta: metaOrMsg });
    }

    debug(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'debug', message: msgOrMeta, meta: metaOrMsg });
    }

    info(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'info', message: msgOrMeta, meta: metaOrMsg });
    }

    warn(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'warn', message: msgOrMeta, meta: metaOrMsg });
    }

    error(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'error', message: msgOrMeta, meta: metaOrMsg });
    }

    fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'fatal', message: msgOrMeta, meta: metaOrMsg });
    }

    child(bindings: any): ILogger {
        const childLogger = new MockLogger();
        childLogger.logs.push({ level: 'child', message: 'Created child logger', meta: bindings });
        return childLogger;
    }

    setLevel(level: any): void {}
    getLevel(): any { return 'info'; }
    isLevelEnabled(level: any): boolean { return true; }
    dispose?(): void {}
}

// Test plugin with new logging system
function createTestPlugin(name: string, hasInitialize: boolean = true, hasLegacyInitialize: boolean = false): XFiPlugin {
    let pluginLogger: ILogger;
    
    const testFact: FactDefn = {
        name: `${name}TestFact`,
        description: 'Test fact with logging',
        type: 'iterative-function',
        priority: 1,
        fn: async (params: any, almanac: any) => {
            if (pluginLogger) {
                pluginLogger.debug('Test fact executed', { params, almanac: !!almanac });
            }
            return { result: true, pluginName: name };
        }
    };
    
    const testOperator: OperatorDefn = {
        name: `${name}TestOperator`,
        description: 'Test operator with logging',
        fn: (factValue: any, operatorValue: any) => {
            if (pluginLogger) {
                pluginLogger.debug('Test operator executed', { factValue, operatorValue });
            }
            return factValue === operatorValue;
        }
    };
    
    const plugin: XFiPlugin = {
        name,
        version: '1.0.0',
        description: `Test plugin: ${name}`,
        facts: [testFact],
        operators: [testOperator],
        onError: (error: Error) => ({
            message: error.message,
            level: 'error' as const,
            severity: 'error' as const,
            source: name,
            details: error.stack
        })
    };
    
    if (hasInitialize && !hasLegacyInitialize) {
        // New-style initialize with context
        plugin.initialize = async (context: PluginContext) => {
            pluginLogger = context.logger;
            pluginLogger.info(`${name} plugin initialized with context`);
            
            // Test different logger types
            const operationLogger = context.loggerContext.createOperationLogger('test-operation');
            operationLogger.debug('Operation logger created');
            
            const factLogger = context.loggerContext.createFactLogger('test-fact');
            factLogger.debug('Fact logger created');
            
            const operatorLogger = context.loggerContext.createOperatorLogger('test-operator');
            operatorLogger.debug('Operator logger created');
        };
    } else if (hasLegacyInitialize) {
        // Legacy initialize without context
        plugin.initialize = async () => {
            console.log(`Legacy ${name} plugin initialized`);
        };
    }
    
    return plugin;
}

describe('Plugin Registry Integration with Logging', () => {
    let registry: XFiPluginRegistry;
    let mockLogger: MockLogger;

    beforeEach(() => {
        // Reset logger provider
        LoggerProvider.reset();
        
        // Create mock logger
        mockLogger = new MockLogger();
        LoggerProvider.setLogger(mockLogger);
        
        // Create new registry instance
        registry = new XFiPluginRegistry({
            enableLoggerContext: true,
            enableErrorWrapping: true,
            enableLegacySupport: true
        });
    });

    afterEach(() => {
        LoggerProvider.reset();
    });

    describe('Plugin Registration with Logger Context', () => {
        it('should register plugin with new-style initialization', () => {
            const testPlugin = createTestPlugin('TestPlugin', true, false);
            
            expect(() => {
                registry.registerPlugin(testPlugin);
            }).not.toThrow();
            
            expect(registry.getPluginCount()).toBe(1);
            expect(registry.getPlugin('TestPlugin')).toBe(testPlugin);
            
            // Plugin initialization happens asynchronously in background
            // Just verify the plugin was registered successfully
        });

        it('should register plugin with legacy initialization', () => {
            const testPlugin = createTestPlugin('LegacyPlugin', true, true);
            
            expect(() => {
                registry.registerPlugin(testPlugin);
            }).not.toThrow();
            
            expect(registry.getPluginCount()).toBe(1);
        });

        it('should register plugin without initialization', () => {
            const testPlugin = createTestPlugin('NoInitPlugin', false, false);
            
            expect(() => {
                registry.registerPlugin(testPlugin);
            }).not.toThrow();
            
            expect(registry.getPluginCount()).toBe(1);
        });

        it('should handle plugin registration errors gracefully', () => {
            const badPlugin = createTestPlugin('BadPlugin', true, false);
            badPlugin.initialize = () => {
                throw new Error('Plugin initialization failed');
            };
            
            expect(() => {
                registry.registerPlugin(badPlugin);
            }).toThrow('Plugin BadPlugin initialization failed');
            
            // Check error logging
            const errorLogs = mockLogger.logs.filter(log => 
                log.level === 'error' && log.message?.includes && log.message.includes('BadPlugin initialization failed')
            );
            expect(errorLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Plugin Function Wrapping with Logging', () => {
        it('should wrap plugin facts with error handling and logging', () => {
            const testPlugin = createTestPlugin('FactTestPlugin', true, false);
            registry.registerPlugin(testPlugin);
            
            const facts = registry.getPluginFacts();
            expect(facts.length).toBe(1);
            
            const fact = facts[0];
            expect(fact.name).toBe('FactTestPluginTestFact');
            
            // Execute the fact
            return fact.fn({ test: 'param' }, { test: 'almanac' }).then(result => {
                expect(result).toEqual({ result: true, pluginName: 'FactTestPlugin' });
                
                // Check that fact execution was logged
                const factLogs = mockLogger.logs.filter(log => 
                    log.message?.includes && log.message.includes('Executing fact: FactTestPluginTestFact')
                );
                expect(factLogs.length).toBeGreaterThan(0);
            });
        });

        it('should wrap plugin operators with error handling and logging', () => {
            const testPlugin = createTestPlugin('OperatorTestPlugin', true, false);
            registry.registerPlugin(testPlugin);
            
            const operators = registry.getPluginOperators();
            expect(operators.length).toBe(1);
            
            const operator = operators[0];
            expect(operator.name).toBe('OperatorTestPluginTestOperator');
            
            // Execute the operator
            const result = operator.fn('test', 'test');
            expect(result).toBe(true);
            
            // Check that operator execution was logged
            const operatorLogs = mockLogger.logs.filter(log => 
                log.message?.includes && log.message.includes('Executing operator: OperatorTestPluginTestOperator')
            );
            expect(operatorLogs.length).toBeGreaterThan(0);
        });

        it('should handle fact execution errors with proper logging', () => {
            const testPlugin = createTestPlugin('ErrorFactPlugin', true, false);
            testPlugin.facts![0].fn = async () => {
                throw new Error('Fact execution error');
            };
            
            registry.registerPlugin(testPlugin);
            
            const facts = registry.getPluginFacts();
            const fact = facts[0];
            
            return expect(fact.fn({}, {})).rejects.toThrow('Fact execution error').then(() => {
                // Check error logging
                const errorLogs = mockLogger.logs.filter(log => 
                    log.level === 'error' && log.message?.includes && log.message.includes('ErrorFactPluginTestFact failed')
                );
                expect(errorLogs.length).toBeGreaterThan(0);
            });
        });

        it('should handle operator execution errors with proper logging', () => {
            const testPlugin = createTestPlugin('ErrorOperatorPlugin', true, false);
            testPlugin.operators![0].fn = () => {
                throw new Error('Operator execution error');
            };
            
            registry.registerPlugin(testPlugin);
            
            const operators = registry.getPluginOperators();
            const operator = operators[0];
            
            expect(() => {
                operator.fn('test', 'test');
            }).toThrow('Operator execution error');
            
            // Check error logging
            const errorLogs = mockLogger.logs.filter(log => 
                log.level === 'error' && log.message?.includes && log.message.includes('ErrorOperatorPluginTestOperator failed')
            );
            expect(errorLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Plugin Function Execution', () => {
        it('should execute plugin function with proper logging', () => {
            const testPlugin = createTestPlugin('FunctionTestPlugin', true, false);
            testPlugin.customFunction = (param: string) => `Hello, ${param}!`;
            
            registry.registerPlugin(testPlugin);
            
            const result = registry.executePluginFunction('FunctionTestPlugin', 'customFunction', 'World');
            
            expect(result.success).toBe(true);
            expect(result.data).toBe('Hello, World!');
            
            // Check function execution logging
            const functionLogs = mockLogger.logs.filter(log => 
                log.message?.includes && log.message.includes('Executing plugin function: customFunction')
            );
            expect(functionLogs.length).toBeGreaterThan(0);
        });

        it('should handle plugin function errors with proper logging', () => {
            const testPlugin = createTestPlugin('ErrorFunctionPlugin', true, false);
            testPlugin.errorFunction = () => {
                throw new Error('Function execution error');
            };
            
            registry.registerPlugin(testPlugin);
            
            const result = registry.executePluginFunction('ErrorFunctionPlugin', 'errorFunction');
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Check error logging
            const errorLogs = mockLogger.logs.filter(log => 
                log.level === 'error' && log.message?.includes && log.message.includes('Error executing plugin ErrorFunctionPlugin.errorFunction')
            );
            expect(errorLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Plugin Cleanup', () => {
        it('should cleanup all plugins with proper logging', () => {
            const testPlugin1 = createTestPlugin('CleanupPlugin1', true, false);
            testPlugin1.cleanup = async () => {
                const logger = LoggerProvider.getLogger();
                logger.info('CleanupPlugin1 cleanup completed');
            };
            
            const testPlugin2 = createTestPlugin('CleanupPlugin2', true, false);
            testPlugin2.cleanup = async () => {
                const logger = LoggerProvider.getLogger();
                logger.info('CleanupPlugin2 cleanup completed');
            };
            
            registry.registerPlugin(testPlugin1);
            registry.registerPlugin(testPlugin2);
            
            return registry.cleanupAllPlugins().then(() => {
                // Check cleanup logging
                const cleanupLogs = mockLogger.logs.filter(log => 
                    log.message?.includes && (
                        log.message.includes('CleanupPlugin1 cleanup completed') ||
                        log.message.includes('CleanupPlugin2 cleanup completed')
                    )
                );
                expect(cleanupLogs.length).toBe(2);
            });
        });

        it('should handle cleanup errors gracefully', () => {
            const testPlugin = createTestPlugin('ErrorCleanupPlugin', true, false);
            testPlugin.cleanup = async () => {
                throw new Error('Cleanup error');
            };
            
            registry.registerPlugin(testPlugin);
            
            return registry.cleanupAllPlugins().then(() => {
                // Check error logging
                const errorLogs = mockLogger.logs.filter(log => 
                    log.level === 'error' && log.message?.includes && log.message.includes('Error cleaning up plugin ErrorCleanupPlugin')
                );
                expect(errorLogs.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Duplicate Plugin Handling', () => {
        it('should handle duplicate plugin registration with logging', () => {
            const testPlugin1 = createTestPlugin('DuplicatePlugin', true, false);
            const testPlugin2 = createTestPlugin('DuplicatePlugin', true, false);
            
            registry.registerPlugin(testPlugin1);
            registry.registerPlugin(testPlugin2);
            
            expect(registry.getPluginCount()).toBe(1);
            
            // Check warning logging
            const warningLogs = mockLogger.logs.filter(log => 
                log.level === 'warn' && log.message?.includes && log.message.includes('DuplicatePlugin is already registered')
            );
            expect(warningLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Logger Fallback Behavior', () => {
        it('should work with default logger when no logger is injected', () => {
            LoggerProvider.reset();
            // Don't inject any logger
            
            const testPlugin = createTestPlugin('FallbackPlugin', true, false);
            
            expect(() => {
                registry.registerPlugin(testPlugin);
            }).not.toThrow();
            
            expect(registry.getPluginCount()).toBe(1);
        });
    });
}); 