import { archetypeRoute } from './archetypeRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateUrlInput } from '../../utils/inputValidation';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '../../core/configManager';
import { validateArchetype } from '../../utils/jsonSchemas';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
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
  validateArchetype: jest.fn()
}));

describe('archetypeRoute', () => {
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
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(validateUrlInput).toHaveBeenCalledWith('test-archetype');
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid archetype name' });
  });

  it('should return cached archetype when available', async () => {
    const cachedArchetype = { name: 'test-archetype', rules: [] };
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(cachedArchetype);
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(getCachedData).toHaveBeenCalledWith('archetype:test-archetype');
    expect(logger.info).toHaveBeenCalledWith('serving cached archetype test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(cachedArchetype);
    expect(ConfigManager.getConfig).not.toHaveBeenCalled();
  });

  it('should fetch and return archetype when not cached', async () => {
    const archetypeConfig = { name: 'test-archetype', rules: [] };
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: archetypeConfig
    });
    (validateArchetype as jest.Mock).mockReturnValue(true);
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({
      archetype: 'test-archetype',
      logPrefix: 'test-prefix'
    });
    expect(validateArchetype).toHaveBeenCalledWith(archetypeConfig);
    expect(setCachedData).toHaveBeenCalledWith('archetype:test-archetype', archetypeConfig);
    expect(logger.info).toHaveBeenCalledWith('serving fresh archetype test-archetype');
    expect(mockResponse.json).toHaveBeenCalledWith(archetypeConfig);
  });

  it('should return 400 when archetype configuration is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { name: 'test-archetype' }
    });
    (validateArchetype as jest.Mock).mockReturnValue(false);
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('invalid archetype configuration for test-archetype');
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'invalid archetype requested' });
  });

  it('should return 500 when an error occurs', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('error fetching archetype test-archetype: Error: Test error');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'internal server error' });
  });
});
