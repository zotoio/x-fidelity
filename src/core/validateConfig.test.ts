import { validateArchetypeConfig } from './validateConfig';
import { ConfigManager } from './configManager';
import { options } from './cli';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { loadRules } from '../utils/ruleUtils';
import { loadFacts } from '../facts';
import { loadOperators } from '../operators';
import { loadExemptions } from '../utils/exemptionUtils';
import { logger } from '../utils/logger';

jest.mock('./configManager');
jest.mock('./cli', () => ({
  options: {
    archetype: 'test-archetype',
    configServer: 'http://test-server',
    localConfigPath: '/test/path',
  },
}));
jest.mock('../utils/jsonSchemas');
jest.mock('../utils/ruleUtils');
jest.mock('../facts');
jest.mock('../operators');
jest.mock('../utils/exemptionUtils');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('validateConfig', () => {
  let mockExit: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      return undefined as never;
    });
    
    // Default mock implementations
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: {
        name: 'test-archetype',
        rules: ['rule1', 'rule2'],
        facts: ['fact1', 'fact2'],
        operators: ['operator1', 'operator2'],
        config: {
          minimumDependencyVersions: {},
          standardStructure: {},
          blacklistPatterns: [],
          whitelistPatterns: []
        }
      },
      rules: [
        { name: 'rule1', conditions: {}, event: {} },
        { name: 'rule2', conditions: {}, event: {} }
      ]
    });
    
    (validateArchetype as jest.Mock).mockReturnValue(true);
    (validateRule as jest.Mock).mockReturnValue(true);
    (loadExemptions as jest.Mock).mockResolvedValue([{ repoUrl: 'test', rule: 'test', expirationDate: '2099-01-01', reason: 'test' }]);
    (loadRules as jest.Mock).mockResolvedValue([
      { name: 'rule1', conditions: {}, event: {} },
      { name: 'rule2', conditions: {}, event: {} }
    ]);
    (loadFacts as jest.Mock).mockResolvedValue([
      { name: 'fact1', fn: jest.fn() },
      { name: 'fact2', fn: jest.fn() }
    ]);
    (loadOperators as jest.Mock).mockResolvedValue([
      { name: 'operator1', fn: jest.fn() },
      { name: 'operator2', fn: jest.fn() }
    ]);
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  it('should exit with code 0 when all validations pass', async () => {
    await validateArchetypeConfig();
    
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({ archetype: 'test-archetype' });
    expect(validateArchetype).toHaveBeenCalled();
    expect(loadExemptions).toHaveBeenCalled();
    expect(loadRules).toHaveBeenCalled();
    expect(loadFacts).toHaveBeenCalled();
    expect(loadOperators).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should exit with code 1 when archetype validation fails', async () => {
    (validateArchetype as jest.Mock).mockReturnValue(false);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Archetype configuration failed schema validation.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with code 1 when rule count mismatch', async () => {
    (loadRules as jest.Mock).mockResolvedValue([{ name: 'rule1', conditions: {}, event: {} }]);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Expected 2 rule(s) but loaded 1.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with code 1 when rule validation fails', async () => {
    (validateRule as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Rule rule2 failed validation.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with code 1 when fact count mismatch', async () => {
    (loadFacts as jest.Mock).mockResolvedValue([{ name: 'fact1', fn: jest.fn() }]);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Expected 2 fact(s) but loaded 1.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with code 1 when operator count mismatch', async () => {
    (loadOperators as jest.Mock).mockResolvedValue([{ name: 'operator1', fn: jest.fn() }]);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Expected 2 operator(s) but loaded 1.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with code 1 when unexpected error occurs', async () => {
    (ConfigManager.getConfig as jest.Mock).mockRejectedValue(new Error('Unexpected error'));
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Unexpected error during validation: Error: Unexpected error');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle multiple validation failures', async () => {
    (validateArchetype as jest.Mock).mockReturnValue(false);
    (loadFacts as jest.Mock).mockResolvedValue([{ name: 'fact1', fn: jest.fn() }]);
    (loadOperators as jest.Mock).mockResolvedValue([{ name: 'operator1', fn: jest.fn() }]);
    
    await validateArchetypeConfig();
    
    expect(logger.error).toHaveBeenCalledWith('Archetype configuration failed schema validation.');
    expect(logger.error).toHaveBeenCalledWith('Expected 2 fact(s) but loaded 1.');
    expect(logger.error).toHaveBeenCalledWith('Expected 2 operator(s) but loaded 1.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('FAILED: 3 CONFIG VALIDATION CHECKS'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
