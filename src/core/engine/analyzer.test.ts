import { analyzeCodebase } from './analyzer';
import { Engine } from 'json-rules-engine';
import { collectRepoFileData } from '../../facts/repoFilesystemFacts';
import { getDependencyVersionFacts } from '../../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts } from '../../facts/openaiAnalysisFacts';
import { loadRules } from '../../rules';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { archetypes } from '../../archetypes';
import { ConfigManager } from '../../utils/configManager';
import { sendTelemetry } from '../../utils/telemetry';
import { isOpenAIEnabled } from '../../utils/openaiUtils';
import { generateLogPrefix } from '../../utils/logger';

jest.mock('../../utils/openaiUtils');
jest.mock('../../core/cli', () => ({
    options: {
        dir: 'mockDir',
        archetype: 'node-fullstack',
        configServer: '',
        openaiEnabled: true,
        telemetryCollector: '',
        mode: 'cli',
        port: '8888',
        localConfigPath: ''
    }
}));

jest.mock('json-rules-engine');
jest.mock('../../facts/repoFilesystemFacts');
jest.mock('../../facts/repoDependencyFacts');
jest.mock('../../facts/openaiAnalysisFacts');
jest.mock('../../rules');
jest.mock('../../operators');
jest.mock('../../facts');
jest.mock('../../utils/logger', () => ({
    ...jest.requireActual('../../utils/logger'),
    generateLogPrefix: jest.fn().mockReturnValue('mockLogPrefix')
}));
jest.mock('../../utils/configManager');
jest.mock('../../utils/telemetry');
jest.mock('../../archetypes', () => ({
    archetypes: {
        'node-fullstack': {
            rules: ['mockRule'],
            operators: ['mockOperator'],
            facts: ['mockFact'],
            config: {
                minimumDependencyVersions: {},
                standardStructure: {},
                blacklistPatterns: [],
                whitelistPatterns: []
            }
        }
    }
}));

describe('analyzeCodebase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
            archetype: {
                name: 'test-archetype',
                rules: ['rule1'],
                operators: ['operator1'],
                facts: ['fact1'],
                config: {
                    minimumDependencyVersions: {},
                    standardStructure: {},
                    blacklistPatterns: [],
                    whitelistPatterns: []
                }
            },
            rules: [{ name: 'rule1', conditions: { all: [] }, event: { type: 'test', params: {} } }],
            cliOptions: {}
        });
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(console, 'log').mockImplementation(() => {});
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should analyze the codebase and return results', async () => {
        const mockFileData = [
            { filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: 'REPO_GLOBAL_CHECK', fileContent: 'REPO_GLOBAL_CHECK' }
        ];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];

        const mockLogPrefix = 'mockLogPrefix';

        (generateLogPrefix as jest.Mock).mockReturnValue(mockLogPrefix);

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);
        (collectOpenaiAnalysisFacts as jest.Mock).mockResolvedValue('mock openai system prompt');

        const engineRunMock = jest.fn().mockResolvedValue({ results: [] });
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase({
            repoPath: 'mockRepoPath',
            archetype: 'node-fullstack'
        });

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath', expect.any(Object));
        expect(getDependencyVersionFacts).toHaveBeenCalledWith(expect.any(Object));
        expect(loadOperators).toHaveBeenCalledWith(['operator1']);
        expect(loadFacts).toHaveBeenCalledWith(['fact1']);
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual({
            XFI_RESULT: expect.objectContaining({
                archetype: 'node-fullstack',
                repoPath: 'mockRepoPath',
                fileCount: 3,
                totalIssues: 0,
                warningCount: 0,
                fatalityCount: 0,
                issueDetails: [],
                durationSeconds: expect.any(Number),
                finishTime: expect.any(Number),
                startTime: expect.any(Number),
                options: expect.any(Object),
                telemetryData: expect.any(Object),
            })
        });
        expect(sendTelemetry).toHaveBeenCalledTimes(2); // Once for start, once for end
    });

    it('should handle errors during analysis', async () => {
        const mockFileData = [
            { filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: 'REPO_GLOBAL_CHECK', fileContent: 'REPO_GLOBAL_CHECK' }
        ];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];
        const mockLogPrefix = 'mockLogPrefix';

        (generateLogPrefix as jest.Mock).mockReturnValue(mockLogPrefix);
        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);
        (collectOpenaiAnalysisFacts as jest.Mock).mockResolvedValue('mock openai system prompt');

        const engineRunMock = jest.fn().mockRejectedValue(new Error('mock error'));
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const results = await analyzeCodebase({
            repoPath: 'mockRepoPath',
            archetype: 'node-fullstack'
        });

        expect(collectRepoFileData).toHaveBeenCalledWith('mockRepoPath', expect.any(Object));
        expect(getDependencyVersionFacts).toHaveBeenCalled();
        expect(loadOperators).toHaveBeenCalledWith(['operator1']);
        expect(loadFacts).toHaveBeenCalledWith(['fact1']);
        expect(engineRunMock).toHaveBeenCalledTimes(mockFileData.length);
        expect(results).toEqual({
            XFI_RESULT: expect.objectContaining({
                archetype: 'node-fullstack',
                repoPath: 'mockRepoPath',
                fileCount: 3,
                totalIssues: 0,
                warningCount: 0,
                fatalityCount: 0,
                issueDetails: [],
                durationSeconds: expect.any(Number),
                finishTime: expect.any(Number),
                startTime: expect.any(Number),
                options: expect.any(Object),
                telemetryData: expect.any(Object),
            })
        });
        expect(sendTelemetry).toHaveBeenCalledTimes(2); // Once for start, once for end
    });

    it('should handle OpenAI analysis when OpenAI is enabled', async () => {
        (isOpenAIEnabled as jest.Mock).mockReturnValue(true);
        const mockFileData = [
            { filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: 'REPO_GLOBAL_CHECK', fileContent: 'REPO_GLOBAL_CHECK' }
        ];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'openaiAnalysis', fn: jest.fn() }, { name: 'openaiSystemPrompt', fn: 'mock openai system prompt'} ];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);
        (collectOpenaiAnalysisFacts as jest.Mock).mockResolvedValue('mock openai system prompt');

        const engineRunMock = jest.fn().mockResolvedValue({ results: [] });
        const engineAddFactMock = jest.fn();
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: engineAddFactMock,
            on: jest.fn(),
            run: engineRunMock
        }));

        await analyzeCodebase({
            repoPath: 'mockRepoPath',
            archetype: 'node-fullstack'
        });

        expect(engineAddFactMock).toHaveBeenCalledWith('repoDependencyAnalysis', expect.any(Function));
        expect(sendTelemetry).toHaveBeenCalledTimes(2); // Once for start, once for end
    });

    it('should not add OpenAI facts when OpenAI is not enabled', async () => {
        (isOpenAIEnabled as jest.Mock).mockReturnValue(false);
        const mockFileData = [
            { filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: 'REPO_GLOBAL_CHECK', fileContent: 'REPO_GLOBAL_CHECK' }
        ];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'mockEvent' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);
        (collectOpenaiAnalysisFacts as jest.Mock).mockResolvedValue('mock openai system prompt');

        const engineRunMock = jest.fn().mockResolvedValue({ results: [] });
        const engineAddFactMock = jest.fn();
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: engineAddFactMock,
            on: jest.fn(),
            run: engineRunMock
        }));

        await analyzeCodebase({ repoPath: 'mockRepoPath', archetype: 'node-fullstack' });

        expect(engineAddFactMock).not.toHaveBeenCalledWith('openaiAnalysis', expect.any(Function));
        expect(engineAddFactMock).not.toHaveBeenCalledWith('openaiSystemPrompt', expect.any(String));
        expect(sendTelemetry).toHaveBeenCalledTimes(2); // Once for start, once for end
    });

    it('should handle fatalities', async () => {
        const mockFileData = [
            { filePath: 'src/index.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: 'REPO_GLOBAL_CHECK', fileContent: 'REPO_GLOBAL_CHECK' }
        ];
        const mockDependencyData = [{ dep: 'commander', ver: '2.0.0', min: '^2.0.0' }];
        const mockRules = [{ name: 'mockRule', conditions: { all: [] }, event: { type: 'fatality' } }];
        const mockOperators = [{ name: 'mockOperator', fn: jest.fn() }];
        const mockFacts = [{ name: 'mockFact', fn: jest.fn() }];

        (collectRepoFileData as jest.Mock).mockResolvedValue(mockFileData);
        (getDependencyVersionFacts as jest.Mock).mockResolvedValue(mockDependencyData);
        (loadRules as jest.Mock).mockResolvedValue(mockRules);
        (loadOperators as jest.Mock).mockResolvedValue(mockOperators);
        (loadFacts as jest.Mock).mockResolvedValue(mockFacts);
        (collectOpenaiAnalysisFacts as jest.Mock).mockResolvedValue('mock openai system prompt');

        const engineRunMock = jest.fn().mockResolvedValue({ 
            results: [{ result: true, event: { type: 'fatality', params: { level: 'fatality' } } }] 
        });
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
            run: engineRunMock
        }));

        const result = await analyzeCodebase({
            repoPath: 'mockRepoPath',
            archetype: 'node-fullstack'
        });
        expect(result).toEqual({
            XFI_RESULT: expect.objectContaining({
                archetype: 'node-fullstack',
                repoPath: 'mockRepoPath',
                fileCount: 3,
                totalIssues: 3,
                warningCount: 0,
                fatalityCount: 3,
                issueDetails: expect.arrayContaining([
                    expect.objectContaining({
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                level: 'fatality'
                            })
                        ])
                    })
                ]),
                durationSeconds: expect.any(Number),
                finishTime: expect.any(Number),
                startTime: expect.any(Number),
                options: expect.any(Object),
                telemetryData: expect.any(Object),
            })
        });
        expect(sendTelemetry).toHaveBeenCalledTimes(2); // Start and end
    });
});
