import { logger } from '../utils/logger';
import { LoggerProvider } from '../utils/loggerProvider';
import { OperatorDefn } from '@x-fidelity/types';
import { pluginRegistry } from '../core/pluginRegistry';

export async function loadOperators(): Promise<Map<string, OperatorDefn>> {
    logger.debug('Loading operators...');

    const operators = new Map<string, OperatorDefn>();

    // Add plugin operators - all operators are now provided by plugins
    for (const op of pluginRegistry.getPluginOperators()) {
        // Wrap operator function to ensure logger is available
        const wrappedOperator: OperatorDefn = {
            ...op,
            fn: (factValue: any, operatorValue: any) => {
                // Ensure logger is available to plugin operators - LoggerProvider now provides universal availability
                LoggerProvider.ensureInitialized();
                
                return op.fn(factValue, operatorValue);
            }
        };
        operators.set(op.name, wrappedOperator);
    }

    logger.debug(`Loaded ${operators.size} operators from plugins`);
    return operators;
}

// All operators are now provided by plugins through the plugin registry 