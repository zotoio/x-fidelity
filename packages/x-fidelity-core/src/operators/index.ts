import { logger } from '../utils/logger';
import { OperatorDefn } from '@x-fidelity/types';
import { pluginRegistry } from '../core/pluginRegistry';

export async function loadOperators(): Promise<Map<string, OperatorDefn>> {
    logger.debug('Loading operators...');

    const operators = new Map<string, OperatorDefn>();

    // Add plugin operators - all operators are now provided by plugins
    for (const op of pluginRegistry.getPluginOperators()) {
        operators.set(op.name, op);
    }

    logger.debug(`Loaded ${operators.size} operators from plugins`);
    return operators;
}

// All operators are now provided by plugins through the plugin registry 