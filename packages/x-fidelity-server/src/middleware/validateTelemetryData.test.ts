import { validateTelemetryData } from './validateTelemetryData';
import { validateTelemetryData as validateData, logValidationError } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  validateTelemetryData: jest.fn(),
  logValidationError: jest.fn()
}));

describe('validateTelemetryData middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: { 
        eventType: 'test',
        metadata: {},
        timestamp: '2023-01-01T00:00:00.000Z'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  it('should call next() when telemetry data is valid', () => {
    (validateData as jest.Mock).mockReturnValue({ isValid: true });
    
    validateTelemetryData(mockRequest, mockResponse, mockNext);
    
    expect(validateData).toHaveBeenCalledWith(mockRequest.body);
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 400 when telemetry data is invalid', () => {
    (validateData as jest.Mock).mockReturnValue({ 
      isValid: false,
      error: 'Invalid telemetry data format'
    });
    
    validateTelemetryData(mockRequest, mockResponse, mockNext);
    
    expect(validateData).toHaveBeenCalledWith(mockRequest.body);
    expect(logValidationError).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid telemetry data',
      details: 'Invalid telemetry data format'
    });
  });

  it('should handle missing error message', () => {
    (validateData as jest.Mock).mockReturnValue({ 
      isValid: false
    });
    
    validateTelemetryData(mockRequest, mockResponse, mockNext);
    
    expect(logValidationError).toHaveBeenCalledWith(
      'validateTelemetryData',
      mockRequest.body,
      'Unknown error'
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid telemetry data',
      details: 'Unknown error'
    });
  });
});
