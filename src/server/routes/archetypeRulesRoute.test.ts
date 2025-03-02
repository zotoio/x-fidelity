import { archetypeRulesRoute } from './archetypeRulesRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateUrlInput } from '../../utils/inputValidation';
import { getRuleListCache, setRuleListCache } from '../cacheManager';
import { ConfigManager } from '../../core/configManager';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

jest.mock('../../utils/inputValidation', () => ({
  validateUrlInput: jest.fn()
}));

jest.mock('../cacheManager', () => ({
  getRuleListCache: jest.fn(),
  setRuleListCache: jest.fn()
}));

jest.mock('../../core/configManager', () => ({
  ConfigManager: {
    getConfig: jest.fn()
  }
}));

describe('archetypeRulesRoute', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      params: {
        archetype: 'test-archetype'
      },
      headers: {
        'x-log-prefix': 'test-prefix'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });

  it('should return 400 when archetype name is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(false);
    
    await archetypeRulesRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(validateUrlInput).toHaveBeenCalledWith('test-archetype');
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'invalid archetype' });
  });

  it('should return cached rules when available', async () => {
    const cachedRules = [{ name: 'rule1' }, { name: 'rule2' }];
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getRuleListCache as jest.Mock).mockReturnValue(cachedRules);
    
    await archetypeRulesRoute(mockRequest, mockResponse);
    
    expect(getRuleListCache).toHaveBeenCalledWith('test-archetype');
    expect(logger.info).toHaveBeenCalledWith('serving cached rule list for archetype: test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(cachedRules);
    expect(ConfigManager.getConfig).not.toHaveBeenCalled();
  });

  it('should fetch and return rules when not cached', async () => {
    const rules = [{ name: 'rule1' }, { name: 'rule2' }];
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getRuleListCache as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { rules: ['rule1', 'rule2'] },
      rules: rules
    });
    
    await archetypeRulesRoute(mockRequest, mockResponse);
    
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({
      archetype: 'test-archetype',
      logPrefix: 'test-prefix'
    });
    expect(setRuleListCache).toHaveBeenCalledWith('test-archetype', rules, expect.any(Number));
    expect(logger.info).toHaveBeenCalledWith('serving fresh rule list for archetype: test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(rules);
  });

  it('should return 404 when archetype has no rules', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getRuleListCache as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: {},
      rules: []
    });
    
    await archetypeRulesRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('archetype test-archetype not found or has no rules');
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'archetype not found or has no rules' });
  });
});
