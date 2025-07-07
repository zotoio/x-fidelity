import { checkSharedSecret } from './checkSharedSecret';
import { logger } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  logger: {
    error: jest.fn()
  }
}));

describe('checkSharedSecret middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should call next() when no shared secret is set', () => {
    delete process.env.XFI_SHARED_SECRET;
    
    checkSharedSecret(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should call next() when shared secret matches', () => {
    process.env.XFI_SHARED_SECRET = 'test-secret';
    mockRequest.headers['x-shared-secret'] = 'test-secret';
    
    checkSharedSecret(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

});
