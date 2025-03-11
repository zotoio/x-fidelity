// Example of good code rhythm with consistent patterns and flow

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
    const results = rules.map(rule => rule(data));
    return results.every(result => result === true);
}

function enrichUserData(data: any) {
    const enrichments = getEnrichmentRules();
    enrichments.forEach(enrich => enrich(data));
    return data;
}

function handleError(error: any) {
    logger.error(error);
    metrics.increment('user_data_error');
}
// Example of good code rhythm with consistent patterns and flow

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
    const results = rules.map(rule => rule(data));
    return results.every(result => result === true);
}

function enrichUserData(data: any) {
    const enrichments = getEnrichmentRules();
    enrichments.forEach(enrich => enrich(data));
    return data;
}

function handleError(error: any) {
    logger.error(error);
    metrics.increment('user_data_error');
}
