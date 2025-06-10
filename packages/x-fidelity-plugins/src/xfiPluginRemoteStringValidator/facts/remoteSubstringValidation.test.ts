import { remoteSubstringValidation } from './remoteSubstringValidation';
import { logger } from '@x-fidelity/core/utils/logger';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        warn: jest.fn()
    },
}));

describe('remoteSubstringValidation', () => {
    it('should extract patterns and validate remotely', async () => {
        const mockAlmanac = {
            factValue: jest.fn().mockResolvedValue({
                fileContent: 'systemId: "abc"',
                filePath: '/path/to/file',
            }),
            addRuntimeFact: jest.fn(),
        };

        const params = {
            pattern: '"systemId":[\\s]*"([a-z]*)"',
            validationParams: {
                url: 'http://localhost:4200/systemIdValidator',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { systemId: '#MATCH#' },
                checkJsonPath: '$.validSystems[?(@.id == "#MATCH#")]',
            },
            resultFact: 'remoteCheckResultFact',
        };

        const result = await remoteSubstringValidation.fn(params, mockAlmanac);

        expect(result).toHaveProperty('result');
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('remoteCheckResultFact', expect.any(Array));
    });

    it('should handle errors gracefully', async () => {
        const mockAlmanac = {
            factValue: jest.fn().mockRejectedValue(new Error('mock error')),
            addRuntimeFact: jest.fn(),
        };

        const params = {
            pattern: '"systemId":[\\s]*"([a-z]*)"',
            validationParams: {
                url: 'http://localhost:4200/systemIdValidator',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { systemId: '#MATCH#' },
                checkJsonPath: '$.validSystems[?(@.id == "#MATCH#")]',
            },
            resultFact: 'remoteCheckResultFact',
        };

        const result = await remoteSubstringValidation.fn(params, mockAlmanac);

        expect(result).toHaveProperty('result');
        expect(console.error).toHaveBeenCalled();
    });
});
