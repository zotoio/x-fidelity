import { loadFacts } from './index';
import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { logger } from '../utils/logger';

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
      { name: 'repoFilesystemFacts', fn: jest.fn(), priority: 100 },
      { name: 'repoDependencyFacts', fn: jest.fn(), priority: 90 },
      { name: 'openaiAnalysisFacts', fn: jest.fn(), priority: 50 },
      { name: 'globalFileAnalysisFacts', fn: jest.fn(), priority: 50 }
    ]);
    (isOpenAIEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should load facts from plugin registry', async () => {
    const result = await loadFacts(['repoFilesystemFacts', 'repoDependencyFacts']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('repoFilesystemFacts');
    expect(result[1].name).toBe('repoDependencyFacts');
    expect(logger.info).toHaveBeenCalledWith('Loading facts: repoFilesystemFacts,repoDependencyFacts');
  });

  it('should load plugin facts', async () => {
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
      { name: 'pluginFact1', fn: jest.fn(), priority: 100 }
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
    expect(logger.warn).toHaveBeenCalledWith('OpenAI fact openaiAnalysisFacts not loaded: OpenAI integration disabled');
  });

  it('should include OpenAI facts when OpenAI is enabled', async () => {
    (isOpenAIEnabled as jest.Mock).mockReturnValue(true);
    
    const result = await loadFacts(['openaiAnalysisFacts']);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('openaiAnalysisFacts');
  });

  it('should warn about facts that are not found', async () => {
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([]);
    
    const result = await loadFacts(['nonExistentFact']);
    
    expect(result).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith('Fact not found: nonExistentFact. Available facts: ');
  });

  it('should load facts with correct priorities', async () => {
    const result = await loadFacts(['repoFilesystemFacts', 'globalFileAnalysisFacts']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('repoFilesystemFacts');
    expect(result[0].priority).toBe(100);
    expect(result[1].name).toBe('globalFileAnalysisFacts');
    expect(result[1].priority).toBe(50);
  });

  it('should handle mixed core and plugin facts', async () => {
    (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
      { name: 'pluginFact1', fn: jest.fn(), priority: 80 },
      { name: 'repoFilesystemFacts', fn: jest.fn(), priority: 100 }
    ]);
    
    const result = await loadFacts(['repoFilesystemFacts', 'pluginFact1']);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('repoFilesystemFacts');
    expect(result[1].name).toBe('pluginFact1');
  });

  it('should handle empty fact names array', async () => {
    const result = await loadFacts([]);
    
    expect(result).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith('Loading facts: ');
  });
});
