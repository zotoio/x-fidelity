import { runEngineOnFiles } from './engineRunner';
import { Engine } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../../utils/configManager';

jest.mock('json-rules-engine');
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('runEngineOnFiles', () => {
    const mockEngine = {
        run: jest.fn().mockImplementation(() => Promise.resolve({ results: [] })),
    } as unknown as Engine;

    const mockFileData = [
        { fileName: 'test.ts', filePath: 'src/test.ts', fileContent: 'logger.log("test");' },
        { fileName: REPO_GLOBAL_CHECK, filePath: REPO_GLOBAL_CHECK, fileContent: REPO_GLOBAL_CHECK },
    ];

    const mockParams = {
        engine: mockEngine,
        fileData: mockFileData,
        installedDependencyVersions: {},
        minimumDependencyVersions: {},
        standardStructure: {},
        repoUrl: 'https://github.com/mock/repo',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should run engine on all files', async () => {
        (mockEngine.run as jest.Mock).mockResolvedValue({ results: [] });

        await runEngineOnFiles(mockParams);

        expect(mockEngine.run).toHaveBeenCalledTimes(2);
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RUNNING FILE CHECKS..'));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RUNNING GLOBAL REPO CHECKS..'));
    });

    it('should handle engine failures', async () => {
        (mockEngine.run as jest.Mock).mockRejectedValue(new Error('Engine failure'));

        await runEngineOnFiles(mockParams);

        expect(mockEngine.run).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should return failures when rules are violated', async () => {
        (mockEngine.run as jest.Mock).mockResolvedValue({
            results: [
                { result: true, name: 'Test Rule', event: { type: 'warning', params: { message: 'Test warning' } } },
            ],
        });

        const result = await runEngineOnFiles(mockParams);

        expect(result).toHaveLength(2);
        expect(result[0].errors).toHaveLength(1);
        expect(result[0].errors[0].ruleFailure).toBe('Test Rule');
        expect(result[0].errors[0].level).toBe('warning');
    });
});
