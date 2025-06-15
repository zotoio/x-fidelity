import { exemptionsRoute } from './exemptionsRoute';
import { logger, setLogPrefix } from '@x-fidelity/core';
import { ConfigManager } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  logger: {
    info: jest.fn()
  },
  setLogPrefix: jest.fn(),
  ConfigManager: {
    getConfig: jest.fn()
  }
}));

describe('exemptionsRoute', () => {
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

  it('should return exemptions for the specified archetype', async () => {
    const mockExemptions = [
      { repoUrl: 'repo1', rule: 'rule1', expirationDate: '2023-12-31', reason: 'reason1' },
      { repoUrl: 'repo2', rule: 'rule2', expirationDate: '2023-12-31', reason: 'reason2' }
    ];
    
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      exemptions: mockExemptions
    });
    
    await exemptionsRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(logger.info).toHaveBeenCalledWith('Fetching exemptions');
    expect(ConfigManager.getConfig).toHaveBeenCalledWith({
      archetype: 'test-archetype',
      logPrefix: 'test-prefix'
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(mockExemptions);
  });

  it('should handle empty exemptions array', async () => {
    (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
      exemptions: []
    });
    
    await exemptionsRoute(mockRequest, mockResponse);
    
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith([]);
  });
});
