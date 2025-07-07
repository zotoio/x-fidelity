import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

export interface FileContainsConfig {
    expectMatch: boolean;
    requirePosition?: boolean;
    minMatches?: number;
    maxMatches?: number;
    requireContext?: boolean;
}

export const fileContainsWithPosition: OperatorDefn = {
    name: 'fileContainsWithPosition',
    description: 'Enhanced file content checking with position tracking and match requirements',
    fn: (factValue: any, expectedValue: boolean | FileContainsConfig) => {
        try {
            // Support both boolean and enhanced config
            const config: FileContainsConfig = typeof expectedValue === 'boolean'
                ? { expectMatch: expectedValue }
                : expectedValue;

            const { expectMatch, requirePosition = false, minMatches = 0, maxMatches = Infinity, requireContext = false } = config;

            // Handle enhanced fact format with position data
            if (factValue && factValue.matches && Array.isArray(factValue.matches)) {
                const matchCount = factValue.matches.length;
                const hasValidMatches = factValue.matches.every((match: any) => {
                    const hasPosition = match.range && match.range.start && match.range.end;
                    const hasContext = match.context || match.enhancedContext;
                    
                    if (requirePosition && !hasPosition) return false;
                    if (requireContext && !hasContext) return false;
                    
                    return true;
                });

                const matchesCountRequirement = matchCount >= minMatches && matchCount <= maxMatches;
                
                if (expectMatch) {
                    return matchCount > 0 && hasValidMatches && matchesCountRequirement;
                } else {
                    return matchCount === 0;
                }
            }

            // Handle legacy fact format
            if (factValue && factValue.result && Array.isArray(factValue.result)) {
                const matchCount = factValue.result.length;
                const matchesCountRequirement = matchCount >= minMatches && matchCount <= maxMatches;
                
                if (expectMatch) {
                    return matchCount > 0 && matchesCountRequirement;
                } else {
                    return matchCount === 0;
                }
            }

            // Fallback: simple boolean logic
            const hasContent = Boolean(factValue);
            if (expectMatch) {
                return hasContent;
            } else {
                return !hasContent;
            }
        } catch (error) {
            logger.error(`Error in fileContainsWithPosition: ${error}`);
            return false;
        }
    }
}; 