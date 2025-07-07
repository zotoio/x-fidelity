import crypto from 'crypto';

/**
 * Execution Context Manager
 * Provides consistent execution IDs and context for logging correlation
 */
export class ExecutionContext {
    private static currentExecutionId: string | null = null;
    private static currentContext: ExecutionContextData | null = null;

    /**
     * Generate a unique execution ID
     */
    static generateExecutionId(): string {
        try {
            // Try to use crypto.randomUUID if available (Node.js 14.17.0+)
            if (crypto.randomUUID) {
                return crypto.randomUUID().substring(0, 8);
            }
            // Fallback to randomBytes if available
            if (crypto.randomBytes) {
                return crypto.randomBytes(4).toString('hex');
            }
        } catch (error) {
            // Fall through to simple fallback
        }
        
        // Simple fallback for test environments or when crypto is not available
        return Math.random().toString(36).substring(2, 10);
    }

    /**
     * Start a new execution with a consistent ID
     */
    static startExecution(context?: Partial<ExecutionContextData>): string {
        const executionId = this.generateExecutionId();
        this.currentExecutionId = executionId;
        this.currentContext = {
            executionId,
            startTime: Date.now(),
            component: context?.component || 'Core',
            operation: context?.operation || 'analyze',
            archetype: context?.archetype,
            repoPath: context?.repoPath,
            metadata: context?.metadata || {}
        };
        
        return executionId;
    }

    /**
     * Get the current execution ID
     */
    static getCurrentExecutionId(): string | null {
        return this.currentExecutionId;
    }

    /**
     * Get the current execution context
     */
    static getCurrentContext(): ExecutionContextData | null {
        return this.currentContext ? { ...this.currentContext } : null;
    }

    /**
     * Update the current execution context
     */
    static updateContext(updates: Partial<ExecutionContextData>): void {
        if (this.currentContext) {
            this.currentContext = { ...this.currentContext, ...updates };
        }
    }

    /**
     * End the current execution
     */
    static endExecution(): void {
        if (this.currentContext) {
            this.currentContext.endTime = Date.now();
            this.currentContext.duration = this.currentContext.endTime - this.currentContext.startTime;
        }
        this.currentExecutionId = null;
        this.currentContext = null;
    }

    /**
     * Create logger bindings for the current execution
     * Note: We only include additional context, not execution context fields,
     * since the execution ID is already included in the message prefix
     */
    static createLoggerBindings(additionalContext?: Record<string, any>): Record<string, any> {
        // Only return additional context, not the verbose execution context fields
        // The execution ID is already included in the message prefix via PrefixingLogger
        return additionalContext || {};
    }

    /**
     * Get execution prefix for log messages
     */
    static getExecutionPrefix(): string {
        return this.currentExecutionId ? `[${this.currentExecutionId}]` : '';
    }

    /**
     * Check if we're in an active execution
     */
    static isExecutionActive(): boolean {
        return this.currentExecutionId !== null;
    }

    /**
     * Create a prefixed log message with execution ID
     */
    static prefixMessage(message: string): string {
        const prefix = this.getExecutionPrefix();
        return prefix ? `${prefix} ${message}` : message;
    }
}

/**
 * Execution context data structure
 */
export interface ExecutionContextData {
    executionId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    component: 'CLI' | 'VSCode' | 'Core' | 'Server';
    operation: string;
    archetype?: string;
    repoPath?: string;
    metadata: Record<string, any>;
}

/**
 * Execution ID utilities for legacy compatibility
 */
export const ExecutionId = {
    generate: () => ExecutionContext.generateExecutionId(),
    getCurrent: () => ExecutionContext.getCurrentExecutionId(),
    getPrefix: () => ExecutionContext.getExecutionPrefix()
}; 