import { logger, setLogPrefix, getLogPrefix } from '../../utils/logger';
import { pluginRegistry } from '../pluginRegistry';
import { ErrorActionParams } from '@x-fidelity/types';

// Sensitive field names to redact
const SENSITIVE_FIELDS = ['password', 'apikey', 'token', 'secret', 'key', 'auth'];

// Helper function to safely serialize objects with circular references and non-serializable values
function safeSerialize(obj: any, seen = new WeakSet()): any {
    // Handle primitives first
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle functions
    if (typeof obj === 'function') {
        return '[Function]';
    }

    // Handle symbols
    if (typeof obj === 'symbol') {
        return '[Symbol]';
    }

    // Handle non-objects
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle circular references
    if (seen.has(obj)) {
        return '[Circular]';
    }
    seen.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => safeSerialize(item, seen));
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        // Check for sensitive data
        if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
            result[key] = '[REDACTED]';
        } else {
            result[key] = safeSerialize(value, seen);
        }
    }

    return result;
}

// Helper function to safely serialize individual values (for direct property assignment)
function safeSerializeValue(value: any): any {
    if (typeof value === 'function') {
        return '[Function]';
    }
    if (typeof value === 'symbol') {
        return '[Symbol]';
    }
    return safeSerialize(value);
}

export async function executeErrorAction(actionName: string, params: ErrorActionParams): Promise<any> {
    const originalLogPrefix = getLogPrefix();
    setLogPrefix(`${originalLogPrefix}:${params.ruleName || 'unknown-rule'}`);
    
    try {
        // First check if it's a plugin action
        if (actionName.includes(':')) {
            const [pluginName, functionName] = actionName.split(':');
            const result = await pluginRegistry.executePluginFunction(pluginName, functionName, params);
            if (!result.success) {
                throw new Error(`Plugin error action failed: ${result.error?.message}`);
            }
            return result.data;
        }

        // Otherwise check built-in actions
        switch (actionName) {
            case 'sendNotification':
                return await sendNotification(params);
            case 'logToFile':
                return await logToFile(params);
            default:
                throw new Error(`Unknown error action: ${actionName}`);
        }
    } finally {
        // Always restore the original log prefix
        setLogPrefix(originalLogPrefix);
    }
}

async function sendNotification(params: ErrorActionParams): Promise<void> {
    // Implementation for sending notifications (email, Slack, etc.)
    const notification: any = {
        rule: params.ruleName,
        level: params.level,
        error: params.error.message
    };

    // Include custom notification parameters if provided
    if (params.params) {
        Object.assign(notification, safeSerialize(params.params));
    }

    logger.info({ notification }, 'Sending error notification');
    // Add actual notification implementation here
}

async function logToFile(params: ErrorActionParams): Promise<void> {
    // Implementation for logging to a separate file
    const errorLog: any = {
        rule: params.ruleName,
        level: params.level,
        error: params.error.message
    };

    // Add file path if provided
    if (params.filePath) {
        errorLog.file = params.filePath;
    }

    // Add stack trace if available
    if (params.error.stack) {
        errorLog.stack = params.error.stack;
    }

    // Include context if provided
    if (params.context) {
        errorLog.context = safeSerialize(params.context);
    }

    // Include custom log parameters if provided
    if (params.params) {
        Object.assign(errorLog, safeSerialize(params.params));
    }

    // Handle custom error properties with safe serialization
    if (params.error && typeof params.error === 'object') {
        const customProps = Object.keys(params.error).filter(key => 
            !['message', 'stack', 'name'].includes(key)
        );
        customProps.forEach(prop => {
            const value = (params.error as any)[prop];
            // Check for sensitive data in error properties
            if (SENSITIVE_FIELDS.some(field => prop.toLowerCase().includes(field))) {
                errorLog[prop] = '[REDACTED]';
            } else {
                errorLog[prop] = safeSerializeValue(value);
            }
        });
    }

    logger.info({ errorLog }, 'Logging error to file');
    // Add actual file logging implementation here
}
