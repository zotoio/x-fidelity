import { validateUrlInput } from './validateUrlInput';
import { validateUrlInput as validateUrl, logValidationError } from '../../utils/inputValidation';

jest.mock('../../utils/inputValidation', () => ({
  validateUrlInput: jest.fn(),
  logValidationError: jest.fn()
}));

describe('validateUrlInput middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      params: {
        archetype: 'test-archetype'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  it('should call next() when all inputs are valid', () => {
    (validateUrl as jest.Mock).mockReturnValue({ isValid: true });
    
    validateUrlInput(mockRequest, mockResponse, mockNext);
    
    expect(validateUrl).toHaveBeenCalledWith('test-archetype');
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 400 when archetype is invalid', () => {
    (validateUrl as jest.Mock).mockReturnValue({ 
      isValid: false,
      error: 'Invalid archetype format'
    });
    
    validateUrlInput(mockRequest, mockResponse, mockNext);
    
    expect(validateUrl).toHaveBeenCalledWith('test-archetype');
    expect(logValidationError).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid input',
      details: 'Invalid archetype format'
    });
  });

  it('should validate rule parameter when present', () => {
    mockRequest.params.rule = 'test-rule';
    (validateUrl as jest.Mock)
      .mockReturnValueOnce({ isValid: true }) // archetype validation
      .mockReturnValueOnce({ isValid: true }); // rule validation
    
    validateUrlInput(mockRequest, mockResponse, mockNext);
    
    expect(validateUrl).toHaveBeenCalledWith('test-archetype');
    expect(validateUrl).toHaveBeenCalledWith('test-rule');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 400 when rule is invalid', () => {
    mockRequest.params.rule = 'invalid/rule';
    (validateUrl as jest.Mock)
      .mockReturnValueOnce({ isValid: true }) // archetype validation
      .mockReturnValueOnce({ 
        isValid: false,
        error: 'Invalid rule format'
      });
    
    validateUrlInput(mockRequest, mockResponse, mockNext);
    
    expect(validateUrl).toHaveBeenCalledWith('test-archetype');
    expect(validateUrl).toHaveBeenCalledWith('invalid/rule');
    expect(logValidationError).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid input',
      details: 'Invalid rule format'
    });
  });
});
