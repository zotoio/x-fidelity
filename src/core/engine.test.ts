import { analyzeCodebase } from './engine';
import { Engine } from 'json-rules-engine';
import { collectRepoFileData } from '../facts/repoFilesystemFacts';
import { collectStandardRepoStructure } from '../utils/config';
import { getDependencyVersionFacts } from '../facts/repoDependencyFacts';
import { collectMinimumDependencyVersions } from '../utils/config';
import { loadRules } from '../rules';

jest.mock('json-rules-engine');
jest.mock('../facts/repoFilesystemFacts');
jest.mock('../facts/repoDependencyFacts');
jest.mock('../rules');
jest.mock('../operators');
jest.mock('../utils/logger');
jest.mock('../utils/config');

describe('analyzeCodebase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should analyze the codebase and return results', async () => {
        const mockFileData = [{ filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' }];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockStandardStructure = { src: { core: null, utils: null, operators: null, rules: null, facts: null } };
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (collectMinimumDependencyVersions as jest.Mock).mockResolvedValue({});
        (collectStandardRepoStructure as jest.Mock).mockResolvedValue(mockStandardStructure);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);

        const engineRunMock = jest.fn().mockResolvedValue({ failureResults: [] });
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase('mockRepoPath');

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath');
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(collectMinimumDependencyVersions).toHaveBeenCalled();
        expect(collectStandardRepoStructure).toHaveBeenCalled();
        expect(loadRules).toHaveBeenCalled();
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual([]);
    });

    it('should handle errors during analysis', async () => {
        const mockFileData = [{ filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' }];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockStandardStructure = { src: { core: null, utils: null, operators: null, rules: null, facts: null } };
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (collectMinimumDependencyVersions as jest.Mock).mockResolvedValue({});
        (collectStandardRepoStructure as jest.Mock).mockResolvedValue(mockStandardStructure);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);

        const engineRunMock = jest.fn().mockRejectedValue(new Error('mock error'));
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase('mockRepoPath');

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath');
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(collectMinimumDependencyVersions).toHaveBeenCalled();
        expect(collectStandardRepoStructure).toHaveBeenCalled();
        expect(loadRules).toHaveBeenCalled();
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual([]);
    });

    it('should handle errors during analysis', async () => {
        const mockFileData = [{ filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' }];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockStandardStructure = { src: { core: null, utils: null, operators: null, rules: null, facts: null } };
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (collectMinimumDependencyVersions as jest.Mock).mockResolvedValue({});
        (collectStandardRepoStructure as jest.Mock).mockResolvedValue(mockStandardStructure);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);

        const engineRunMock = jest.fn().mockRejectedValue(new Error('mock error'));
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase('mockRepoPath');

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath');
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(collectMinimumDependencyVersions).toHaveBeenCalled();
        expect(collectStandardRepoStructure).toHaveBeenCalled();
        expect(loadRules).toHaveBeenCalled();
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual([]);
    });
});
