import { loadFacts } from './index';
import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { openaiAnalysis } from './openaiAnalysisFacts';
import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { logger } from '../utils/logger';

jest.mock('./repoFilesystemFacts');
jest.mock('./repoDependencyFacts');
jest.mock('./openaiAnalysisFacts');
jest.mock('./globalFileAnalysisFacts', () => ({
  globalFileAnalysis: {
    fn: jest.fn()
  }
}));
jest.mock('../core/pluginRegistry');
jest.mock('../utils/openaiUtils');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    error: jest.fn()
  }
}));

describe('loadFacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
      { name: 'pluginFact1', fn: jest.fn() },
      { name: 'pluginFact2', fn: jest.fn() }
    ]);
  });

  it('should load core facts', async () => {
    const result = await loadFacts(['repoFilesystemFacts', 'repoDependencyFacts']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('fileData');
    expect(result[1].name).toBe('dependencyData');
    expect(logger.info).toHaveBeenCalledWith('Loading facts: repoFilesystemFacts,repoDependencyFacts');
  });

  it('should load plugin facts', async () => {
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
      { name: 'pluginFact1', fn: jest.fn() }
    ]);
    
    const result = await loadFacts(['pluginFact1']);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('pluginFact1');
    expect(logger.info).toHaveBeenCalledWith('Found 1 plugin facts available');
  });

  it('should filter out OpenAI facts when OpenAI is disabled', async () => {
    (isOpenAIEnabled as jest.Mock).mockReturnValue(false);
    
    const result = await loadFacts(['openaiAnalysisFacts']);
    
    expect(result).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith('OpenAI fact openaiAnalysis not loaded: OpenAI integration disabled');
  });

  it('should include OpenAI facts when OpenAI is enabled', async () => {
    (isOpenAIEnabled as jest.Mock).mockReturnValue(true);
    
    const result = await loadFacts(['openaiAnalysisFacts']);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('openaiAnalysis');
  });

  it('should warn about facts that are not found', async () => {
    const result = await loadFacts(['nonExistentFact']);
    
    expect(result).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith('Fact not found: nonExistentFact');
  });

  it('should load facts with correct priorities', async () => {
    const result = await loadFacts(['repoFilesystemFacts', 'globalFileAnalysisFacts']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('fileData');
    expect(result[0].priority).toBe(100);
    expect(result[1].name).toBe('globalFileAnalysis');
    expect(result[1].priority).toBe(50);
  });

  it('should handle mixed core and plugin facts', async () => {
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
      { name: 'pluginFact1', fn: jest.fn() }
    ]);
    
    const result = await loadFacts(['repoFilesystemFacts', 'pluginFact1']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('fileData');
    expect(result[1].name).toBe('pluginFact1');
  });
});
