import { expressLogger } from './expressLogger';
import { logger, resetLogPrefix, setLogPrefix } from '@x-fidelity/core';
import { maskSensitiveData } from '@x-fidelity/core';

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    resetLogPrefix: jest.fn(),
    setLogPrefix: jest.fn()
}));

jest.mock('../utils/maskSensitiveData', () => ({
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
        
        expect(resetLogPrefix).toHaveBeenCalled();
        expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                req: expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    headers: expect.any(Object),
                    requestId: 'test-request-id'
                })
            }),
            'Incoming request'
        );
        expect(maskSensitiveData).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
    });

    it('should override response.send to log outgoing responses', () => {
        expressLogger(mockRequest, mockResponse, mockNext);
        
        // Simulate sending a response
        const responseBody = { success: true };
        mockResponse.send(responseBody);
        
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                res: expect.objectContaining({
                    statusCode: 200,
                    headers: expect.any(Object),
                    body: responseBody
                })
            }),
            'Outgoing response'
        );
    });

    it('should handle missing x-log-prefix header', () => {
        delete mockRequest.headers['x-log-prefix'];
        
        expressLogger(mockRequest, mockResponse, mockNext);
        
        expect(resetLogPrefix).toHaveBeenCalled();
        expect(setLogPrefix).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
    });
});
