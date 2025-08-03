import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework',
    'description': 'Checks if project uses outdated framework versions',
    'fn': (factValue: any) => {
        try {
            logger.debug(`outdatedFramework: processing ${JSON.stringify(factValue)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('outdatedFramework: factValue is not an array');
                return false;
            }

            // Check if there are any actual dependency failures
            const hasOutdatedDependencies = factValue.some(item => {
                // Ensure the item is a proper DependencyFailure object
                if (!item || typeof item !== 'object' || !item.dependency || !item.currentVersion || !item.requiredVersion) {
                    return false;
                }
                
                // Check if current version is different from required version (indicating outdated)
                return item.currentVersion !== item.requiredVersion;
            });

            logger.debug(`outdatedFramework: result is ${hasOutdatedDependencies}`);
            return hasOutdatedDependencies;
        } catch (e) {
            logger.error(`outdatedFramework error: ${e}`);
            return false;
        }
    }
};

export { outdatedFramework }; 