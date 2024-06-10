import { directoryStructureMatches } from './directoryStructureMatches';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('directoryStructureMatches', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true if filePath is not yarn.lock', () => {
        const filePath = 'not_yarn.lock';
        const standardStructure = {};
        expect(directoryStructureMatches.fn(filePath, standardStructure)).toBe(true);
    });

    it('returns true if the structure matches the standard', () => {
        const filePath = 'yarn.lock';
        const standardStructure = { src: { core: true, utils: true } };
        const repoPath = '/repo';
        
        (path.dirname as jest.Mock).mockReturnValue(repoPath);
        (fs.existsSync as jest.Mock).mockImplementation((p) => {
            return p === '/repo/src' || p === '/repo/src/core' || p === '/repo/src/utils';
        });
        (fs.lstatSync as jest.Mock).mockImplementation((p) => ({
            isDirectory: () => p === '/repo/src' || p === '/repo/src/core' || p === '/repo/src/utils'
        }));

        expect(directoryStructureMatches.fn(filePath, standardStructure)).toBe(true);
    });

    it('returns false if the structure does not match the standard', () => {
        const filePath = 'yarn.lock';
        const standardStructure = { src: { core: true, utils: true } };
        const repoPath = '/repo';
        
        (path.dirname as jest.Mock).mockReturnValue(repoPath);
        (fs.existsSync as jest.Mock).mockImplementation((p) => {
            return p === '/repo/src' || p === '/repo/src/core';
        });
        (fs.lstatSync as jest.Mock).mockImplementation((p) => ({
            isDirectory: () => p === '/repo/src' || p === '/repo/src/core'
        }));

        expect(directoryStructureMatches.fn(filePath, standardStructure)).toBe(false);
    });

    it('returns true if the check has already been performed', () => {
        const filePath = 'yarn.lock';
        const standardStructure = {};
        
        // First call to set hasChecked to true
        directoryStructureMatches.fn(filePath, standardStructure);
        
        // Second call should return true
        expect(directoryStructureMatches.fn(filePath, standardStructure)).toBe(true);
    });
});
