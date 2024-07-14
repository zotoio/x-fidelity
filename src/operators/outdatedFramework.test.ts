import { logger } from '../utils/logger';
import { outdatedFramework } from './outdatedFramework';

describe('outdatedFramework', () => {
    it('returns false when repoDependencyAnalysis is empty', () => {
        const repoDependencyAnalysis = {};
        expect(outdatedFramework.fn(repoDependencyAnalysis, null)).toBe(false);
    });

    it('returns false when no outdated dependencies are found', () => {
        const repoDependencyAnalysis = {
            result: []
        };
        expect(outdatedFramework.fn(repoDependencyAnalysis, null)).toBe(false);
    });

    it('returns true when outdated dependencies are found', () => {
        const repoDependencyAnalysis = {
            result: [
                { dependency: 'dep1', currentVersion: '1.0.0', requiredVersion: '2.0.0' }
            ]
        };
        expect(outdatedFramework.fn(repoDependencyAnalysis, null)).toBe(true);
    });

});
