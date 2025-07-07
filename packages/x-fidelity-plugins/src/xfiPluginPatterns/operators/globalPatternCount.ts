import { OperatorDefn } from '@x-fidelity/types';

export interface RatioThreshold {
    threshold: number;
}

export const globalPatternCount: OperatorDefn = {
    name: 'globalPatternCount',
    description: 'Checks if the global pattern count meets a threshold',
    fn: (factValue: any, threshold: RatioThreshold) => {
        if (!factValue || !threshold || !threshold.threshold) {
            return false;
        }

        return factValue.length >= threshold.threshold;
    }
}; 