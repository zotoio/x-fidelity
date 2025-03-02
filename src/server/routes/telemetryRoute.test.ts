import { telemetryRoute } from './telemetryRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateTelemetryData } from '../../utils/inputValidation';

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

jest.mock('../../utils/inputValidation', () => ({
  validateTelemetryData: jest.fn()
}));

describe('telemetryRoute', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      headers: {
        'x-log-prefix': 'test-prefix'
      },
      body: {
        eventType: 'test-event',
        metadata: {},
        timestamp: '2023-01-01T00:00:00.000Z'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });

  it('should return 400 when telemetry data is invalid', () => {
    (validateTelemetryData as jest.Mock).mockReturnValue(false);
    
    telemetryRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(validateTelemetryData).toHaveBeenCalledWith(mockRequest.body);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid telemetry data' });
  });

  it('should process valid telemetry data', () => {
    (validateTelemetryData as jest.Mock).mockReturnValue(true);
    
    telemetryRoute(mockRequest, mockResponse);
    
    expect(logger.debug).toHaveBeenCalledWith(
      {
        telemetryData: mockRequest.body,
        type: 'telemetry-received'
      },
      'Accepting telemetry data'
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'telemetry data received successfully' });
  });
});
