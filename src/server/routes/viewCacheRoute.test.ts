import { viewCacheRoute } from './viewCacheRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import { getCacheContent } from '../cacheManager';
import { ConfigManager } from '../../core/configManager';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

jest.mock('../cacheManager', () => ({
  getCacheContent: jest.fn()
}));

jest.mock('../../core/configManager', () => ({
  ConfigManager: {
    getLoadedConfigs: jest.fn()
  }
}));

describe('viewCacheRoute', () => {
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

  it('should return cache content and loaded configs', () => {
    const mockCacheContent = {
      cache: { key1: 'value1' },
      ruleListCache: { key2: 'value2' }
    };
    
    const mockLoadedConfigs = ['config1', 'config2'];
    
    (getCacheContent as jest.Mock).mockReturnValue(mockCacheContent);
    (ConfigManager.getLoadedConfigs as jest.Mock).mockReturnValue(mockLoadedConfigs);
    
    viewCacheRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(logger.info).toHaveBeenCalledWith('Viewing cache');
    expect(getCacheContent).toHaveBeenCalled();
    expect(ConfigManager.getLoadedConfigs).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...mockCacheContent,
      loadedConfigs: mockLoadedConfigs
    });
  });
});
