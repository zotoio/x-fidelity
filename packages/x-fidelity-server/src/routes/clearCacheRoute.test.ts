import { clearCacheRoute } from './clearCacheRoute';
import { logger, setLogPrefix } from '../utils/serverLogger';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';

jest.mock('../utils/serverLogger', () => ({
  logger: {
    info: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  },
  setLogPrefix: jest.fn()
}));

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  ConfigManager: {
    clearLoadedConfigs: jest.fn()
  }
}));

jest.mock('../cacheManager', () => ({
  clearCache: jest.fn()
}));

describe('clearCacheRoute', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
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

  it('should clear cache and return success message', async () => {
    await clearCacheRoute(mockRequest, mockResponse);
    
    // Should log cache clear success
    expect(logger.info).toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalled();
    expect(ConfigManager.clearLoadedConfigs).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Cache cleared successfully' });
  });
});
