import { analyzeCodebase } from './engine';
import { Engine } from 'json-rules-engine';
import { collectRepoFileData } from '../facts/repoFilesystemFacts';
import { getDependencyVersionFacts } from '../facts/repoDependencyFacts';
import { loadRules } from '../rules';
import { loadOperators } from '../operators';
import { loadFacts } from '../facts';
import { archetypes } from '../archetypes';

jest.mock('json-rules-engine');
jest.mock('../facts/repoFilesystemFacts');
jest.mock('../facts/repoDependencyFacts');
jest.mock('../rules');
jest.mock('../operators');
jest.mock('../facts');
jest.mock('../utils/logger');
jest.mock('../archetypes', () => ({
    archetypes: {
        'node-fullstack': {
            rules: ['mockRule'],
            operators: ['mockOperator'],
            facts: ['mockFact'],
            config: {
                minimumDependencyVersions: {},
                standardStructure: {}
            }
        }
    }
}));

describe('analyzeCodebase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should analyze the codebase and return results', async () => {
        const mockFileData = [{ filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' }];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);

        const engineRunMock = jest.fn().mockResolvedValue({ results: [] });
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase('mockRepoPath', 'node-fullstack');

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath');
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(loadRules).toHaveBeenCalledWith(['mockRule']);
        expect(loadOperators).toHaveBeenCalledWith(['mockOperator']);
        expect(loadFacts).toHaveBeenCalledWith(['mockFact']);
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual([]);
    });

    it('should handle errors during analysis', async () => {
        const mockFileData = [{ filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' }];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);

        const engineRunMock = jest.fn().mockRejectedValue(new Error('mock error'));
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase('mockRepoPath', 'node-fullstack');

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath');
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(loadRules).toHaveBeenCalledWith(['mockRule']);
        expect(loadOperators).toHaveBeenCalledWith(['mockOperator']);
        expect(loadFacts).toHaveBeenCalledWith(['mockFact']);
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual([]);
    });
});
