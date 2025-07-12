import { archetypeRoute } from './archetypeRoute';
import { logger, setLogPrefix } from '../utils/serverLogger';
import { validateUrlInput } from '@x-fidelity/core';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { validateArchetype } from '@x-fidelity/core';

const mockChildLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn()
};

jest.mock('../utils/serverLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(() => mockChildLogger)
  },
  setLogPrefix: jest.fn()
}));

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  validateUrlInput: jest.fn(),
  ConfigManager: {
    getConfig: jest.fn()
  },
  validateArchetype: jest.fn()
}));

jest.mock('../cacheManager', () => ({
  getCachedData: jest.fn(),
  setCachedData: jest.fn()
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
    // Clear mock child logger calls
    Object.values(mockChildLogger).forEach(mock => (mock as jest.Mock).mockClear());
  });

  it('should return 400 when archetype name is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(false);
    
    await archetypeRoute(mockRequest, mockResponse);
    
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
    expect(logger.info).toHaveBeenCalled();
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
    (validateArchetype as jest.MockedFunction<typeof validateArchetype>).mockReturnValue(true);
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({
      archetype: 'test-archetype',
      logPrefix: 'test-prefix'
    });
    expect(validateArchetype).toHaveBeenCalledWith(archetypeConfig);
    expect(setCachedData).toHaveBeenCalledWith('archetype:test-archetype', archetypeConfig);
    expect(logger.info).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(archetypeConfig);
  });

  it('should return 400 when archetype configuration is invalid', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      archetype: { name: 'test-archetype' }
    });
    (validateArchetype as jest.MockedFunction<typeof validateArchetype>).mockReturnValue(false);
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'invalid archetype requested' });
  });

  it('should return 500 when an error occurs', async () => {
    (validateUrlInput as jest.Mock).mockReturnValue(true);
    (getCachedData as jest.Mock).mockReturnValue(null);
    (ConfigManager.getConfig as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    await archetypeRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'internal server error' });
  });
});
