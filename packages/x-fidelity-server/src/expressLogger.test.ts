import { expressLogger } from './expressLogger';
import { logger, resetLogPrefix, setLogPrefix } from './utils/serverLogger';
import { maskSensitiveData } from '@x-fidelity/core';

jest.mock('./utils/serverLogger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        child: jest.fn().mockReturnValue({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            child: jest.fn()
        })
    },
    resetLogPrefix: jest.fn(),
    setLogPrefix: jest.fn()
}));

jest.mock('@x-fidelity/core', () => ({
    ...jest.requireActual('@x-fidelity/core'),
    maskSensitiveData: jest.fn(data => data)
}));

describe('expressLogger', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRequest = {
            method: 'GET',
            url: '/test',
            headers: {
                'x-log-prefix': 'test-prefix',
                'x-request-id': 'test-request-id'
            }
        };
        
        mockResponse = {
            statusCode: 200,
            getHeaders: jest.fn().mockReturnValue({ 'content-type': 'application/json' }),
            send: jest.fn().mockImplementation(function(this: any, body) { return this; })
        };
        
        mockNext = jest.fn();
    });

    it('should log incoming requests', () => {
        expressLogger(mockRequest, mockResponse, mockNext);
        
        // Should create child logger with request context
        expect(logger.child).toHaveBeenCalledWith({
            requestId: 'test-prefix',
            method: 'GET',
            url: '/test',
            headers: 'test-request-id'
        });
        
        expect(maskSensitiveData).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
    });

    it('should override response.send to log outgoing responses', () => {
        expressLogger(mockRequest, mockResponse, mockNext);
        
        // Simulate sending a response
        const responseBody = { success: true };
        mockResponse.send(responseBody);
        
        // Should have created child logger
        expect(logger.child).toHaveBeenCalled();
        expect(maskSensitiveData).toHaveBeenCalled();
    });

    it('should handle missing x-log-prefix header', () => {
        delete mockRequest.headers['x-log-prefix'];
        
        expressLogger(mockRequest, mockResponse, mockNext);
        
        // Should create child logger without requestId
        expect(logger.child).toHaveBeenCalledWith({
            method: 'GET',
            url: '/test',
            headers: 'test-request-id'
        });
        expect(mockNext).toHaveBeenCalled();
    });
});
