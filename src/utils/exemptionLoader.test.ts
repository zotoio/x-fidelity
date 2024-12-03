import { loadLocalExemptions } from './exemptionLoader';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('loadLocalExemptions', () => {
    const archetype = 'test-archetype';
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load exemptions from legacy file and correctly named files in directory', async () => {
        const mockLegacyExemptions = [
            { repoUrl: 'repo1', rule: 'rule1', expirationDate: '2024-12-31', reason: 'reason1' }
        ];
        const mockFileExemptions = [
            { repoUrl: 'repo2', rule: 'rule2', expirationDate: '2024-12-31', reason: 'reason2' }
        ];

        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions.json') || path.includes('-exemptions'));
        (fs.promises.readFile as jest.Mock)
            .mockImplementation(path => {
                if (path.includes(`${archetype}-exemptions.json`)) {
                    return Promise.resolve(JSON.stringify(mockLegacyExemptions));
                }
                return Promise.resolve(JSON.stringify(mockFileExemptions));
            });
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([
                `team1-${archetype}-exemptions.json`,
                'wrongformat.json',
                `project1-${archetype}-exemptions.json`
            ]);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([...mockLegacyExemptions, ...mockFileExemptions, ...mockFileExemptions]);
        expect(logger.info).toHaveBeenCalledWith(`Loaded 3 total exemptions for archetype ${archetype}`);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Skipping file wrongformat.json")
        );
    });

    it('should handle invalid JSON in exemption files', async () => {
        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions'));
        (fs.promises.readFile as jest.Mock)
            .mockRejectedValue(new Error('Invalid JSON'));
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([`team1-${archetype}-exemptions.json`]);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Error processing exemption file")
        );
    });

    it('should handle missing directory and legacy file', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalled();
    });
});
