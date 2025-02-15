import { startServer } from './configServer';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Server TLS Fallback', () => {
    it('should start server with TLS', () => {
        process.env.CERT_PATH = './certs';
        const server = startServer({ customPort: '8888' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('https://localhost:8888'));
        server.close();
    });

    it('should fall back to HTTP if TLS fails', () => {
        process.env.CERT_PATH = './invalid-certs';
        const server = startServer({ customPort: '8888' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('http://localhost:8888'));
        server.close();
    });
});
