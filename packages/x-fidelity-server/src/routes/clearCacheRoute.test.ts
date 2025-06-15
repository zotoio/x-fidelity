import { clearCacheRoute } from './clearCacheRoute';
import { logger, setLogPrefix } from '@x-fidelity/core';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  logger: {
    info: jest.fn()
  },
  setLogPrefix: jest.fn(),
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

  it('should clear cache and return success message', () => {
    clearCacheRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(clearCache).toHaveBeenCalled();
    expect(ConfigManager.clearLoadedConfigs).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Cache cleared successfully');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Cache cleared successfully' });
  });
});
