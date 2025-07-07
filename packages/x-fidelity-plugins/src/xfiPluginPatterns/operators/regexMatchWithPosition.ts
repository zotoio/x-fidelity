import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

export interface RegexMatchConfig {
    pattern: string;
    flags?: string;
    captureGroups?: boolean;
    contextLength?: number;
    multiline?: boolean;
}

const regexMatchWithPosition: OperatorDefn = {
    'name': 'regexMatchWithPosition',
    'description': 'Enhanced regex matching with precise position capture and context',
    'fn': (factValue: any, config: RegexMatchConfig | string) => {
        try {
            // Support both string pattern and enhanced config
            const regexConfig: RegexMatchConfig = typeof config === 'string' 
                ? { pattern: config } 
                : config;

            const { pattern, flags = 'g', captureGroups = false, contextLength = 50, multiline = false } = regexConfig;

            // Handle enhanced fact result format
            if (factValue && factValue.matches && Array.isArray(factValue.matches)) {
                // Enhanced format with position data
                return factValue.matches.some((match: any) => {
                    if (match.pattern) {
                        const regex = new RegExp(pattern, flags);
                        return regex.test(match.pattern) || regex.test(match.match || '');
                    }
                    return false;
                });
            }

            // Handle legacy fact result format  
            if (factValue && factValue.result && Array.isArray(factValue.result)) {
                const regex = new RegExp(pattern, flags);
                return factValue.result.some((item: any) => {
                    return regex.test(item.match || item.pattern || item.line || '');
                });
            }

            // Direct string matching
            if (typeof factValue === 'string') {
                const regex = new RegExp(pattern, flags);
                return regex.test(factValue);
            }

            logger.debug({ factValue, pattern }, 'No matches found in regexMatchWithPosition');
            return false;
        } catch (error) {
            logger.error(`Error in regexMatchWithPosition: ${error}`);
            return false;
        }
    }
};

export { regexMatchWithPosition }; 