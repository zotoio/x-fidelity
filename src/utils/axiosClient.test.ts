import { axiosClient, isAxiosError } from './axiosClient';
import axios from 'axios';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: { response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('axiosClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should retry on 429 status code', async () => {
        const mockGet = jest.fn()
            .mockImplementationOnce(() => Promise.reject({ response: { status: 429 }, config: {} }))
            .mockImplementationOnce(() => Promise.resolve({ data: 'success' }));

        (axios as any).create.mockReturnValue({ 
          interceptors: { response: { use: jest.fn() } },
          get: mockGet 
        });

        const response = await axiosClient.get('/test-url');
        expect(response.data).toBe('success');
        expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-429 status code', async () => {
        const mockGet = jest.fn().mockRejectedValue({ response: { status: 500 }, config: {} });

        (axios as any).create.mockReturnValue({
          interceptors: { response: { use: jest.fn() } },
          get: mockGet 
        });

        await expect(axiosClient.get('/test-url')).rejects.toThrow();
        expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should identify axios errors', () => {
        const error = new Error('test error');
        expect(isAxiosError(error)).toBe(false);
        expect(isAxiosError({ isAxiosError: true })).toBe(true);
    });
});
