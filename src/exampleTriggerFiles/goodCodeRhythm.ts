import { Logger } from './types';
import { Metrics } from './types';

// Mock dependencies for the example
const logger: Logger = console;
const metrics: Metrics = {
    increment: (key: string) => { /* mock implementation */ }
};

// Helper functions
function getValidationRules(): ((data: any) => boolean)[] {
    return [
        (data: any) => !!data.id,
        (data: any) => typeof data.name === 'string',
        (data: any) => typeof data.email === 'string'
    ];
}

function getEnrichmentRules(): ((data: any) => void)[] {
    return [
        (data: any) => { data.enriched = true; },
        (data: any) => { data.timestamp = Date.now(); }
    ];
}

// Utility function with good rhythm
function processUserData(userData: any) {
    // Input validation with consistent pattern
    if (!userData) {
        return null;
    }

    if (!userData.id) {
        return null;
    }

    // Data transformation with balanced operations
    const normalizedData = {
        id: userData.id,
        name: userData.name?.trim(),
        email: userData.email?.toLowerCase()
    };

    // Consistent error handling pattern
    try {
        validateUserData(normalizedData);
        enrichUserData(normalizedData);
        return normalizedData;
    } catch (error) {
        handleError(error);
        return null;
    }
}

// Helper functions with similar rhythm
function validateUserData(data: any) {
    const rules = getValidationRules();
    const results = rules.map((rule: (data: any) => boolean) => rule(data));
    return results.every((result: boolean) => result === true);
}

function enrichUserData(data: any) {
    const enrichments = getEnrichmentRules();
    enrichments.forEach((enrich: (data: any) => void) => enrich(data));
    return data;
}

function handleError(error: any) {
    logger.error(error);
    metrics.increment('user_data_error');
}

export { processUserData };
