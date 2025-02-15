import { logger } from '../../utils/logger';
import { pluginRegistry } from '../pluginRegistry';

interface ErrorActionParams {
    error: Error;
    rule: string;
    level: string;
    source?: "operator" | "fact" | "plugin" | "rule" | "unknown";
    params: Record<string, any>;
    file: any;
}

export async function executeErrorAction(actionName: string, params: ErrorActionParams): Promise<any> {
    // First check if it's a plugin action
    if (actionName.includes(':')) {
        const [pluginName, functionName] = actionName.split(':');
        const result = pluginRegistry.executePluginFunction(pluginName, functionName, params);
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
}

async function sendNotification(params: ErrorActionParams): Promise<void> {
    // Implementation for sending notifications (email, Slack, etc.)
    logger.info({ 
        notification: {
            rule: params.rule,
            level: params.level,
            error: params.error.message
        }
    }, 'Sending error notification');
    // Add actual notification implementation here
}

async function logToFile(params: ErrorActionParams): Promise<void> {
    // Implementation for logging to a separate file
    logger.info({ 
        errorLog: {
            rule: params.rule,
            level: params.level,
            error: params.error.message,
            file: params.file.filePath
        }
    }, 'Logging error to file');
    // Add actual file logging implementation here
}
