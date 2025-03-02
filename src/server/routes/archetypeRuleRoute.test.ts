import { archetypeRuleRoute } from './archetypeRuleRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateUrlInput } from '../../utils/inputValidation';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '../../core/configManager';
import { validateRule } from '../../utils/jsonSchemas';

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
  getCachedData: jest.fn(),
  setCachedData: jest.fn()
}));

jest.mock('../../core/configManager', () => ({
  ConfigManager: {
    getConfig: jest.fn()
  }
}));

jest.mock('../../utils/jsonSchemas', () => ({
  validateRule: jest.fn().mockReturnValue(true)
}));

describe('archetypeRuleRoute', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      params: {
        archetype: 'test-archetype',
        rule: 'test-rule'
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

  it('should return 400 when archetype or rule name is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(false);
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'invalid archetype or rule name' });
  });

  it('should return cached rule when available', async () => {
    const cachedRule = { name: 'test-rule', conditions: {}, event: {} };
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(cachedRule);
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(getCachedData).toHaveBeenCalledWith('rule:test-archetype:test-rule');
    expect(logger.info).toHaveBeenCalledWith('serving cached rule test-rule for archetype test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(cachedRule);
    expect(ConfigManager.getConfig).not.toHaveBeenCalled();
  });

  it('should fetch and return rule when not cached', async () => {
    const ruleConfig = { name: 'test-rule', conditions: {}, event: {} };
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { rules: ['test-rule'] },
      rules: [ruleConfig]
    });
    (validateRule as jest.MockedFunction<typeof validateRule>).mockReturnValue(true);
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({
      archetype: 'test-archetype',
      logPrefix: 'test-prefix'
    });
    expect(validateRule).toHaveBeenCalledWith(ruleConfig);
    expect(setCachedData).toHaveBeenCalledWith('rule:test-archetype:test-rule', ruleConfig);
    expect(logger.info).toHaveBeenCalledWith('serving fresh rule test-rule for archetype test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(ruleConfig);
  });

  it('should return 404 when rule is not found', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { rules: ['other-rule'] },
      rules: [{ name: 'other-rule' }]
    });
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'rule not found' });
  });

  it('should return 500 when rule configuration is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { rules: ['test-rule'] },
      rules: [{ name: 'test-rule' }]
    });
    (validateRule as jest.MockedFunction<typeof validateRule>).mockReturnValue(false);
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('invalid rule configuration for test-rule');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'invalid rule configuration' });
  });

  it('should return 500 when an error occurs', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    await archetypeRuleRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('error fetching rule test-rule for archetype test-archetype: Error: Test error');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'internal server error' });
  });
});
