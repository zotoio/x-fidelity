import { validateGithubWebhook } from './validateGithubWebhook';
import crypto from 'crypto';

describe('validateGithubWebhook middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    mockRequest = {
      headers: {},
      body: { test: 'data' }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 500 when webhook secret is not set', () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    
    validateGithubWebhook(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith('Server is not configured for webhooks');
  });

  it('should return 400 when signature header is missing', () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    
    validateGithubWebhook(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('No X-Hub-Signature-256 found on request');
  });

  it('should return 400 when signature is invalid', () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    mockRequest.headers['x-hub-signature-256'] = 'sha256=invalid';
    
    validateGithubWebhook(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('Invalid signature');
  });

  it('should call next() when signature is valid', () => {
    const secret = 'test-secret';
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(mockRequest.body)).digest('hex');
    mockRequest.headers['x-hub-signature-256'] = digest;
    
    validateGithubWebhook(mockRequest, mockResponse, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
