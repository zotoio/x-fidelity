import { astFact } from './astFact';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

// Mock dependencies
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    LoggerProvider: {
        createCorrelationMetadata: jest.fn((meta = {}) => ({
            ...meta,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-01T00:00:00.000Z'
        }))
    }
}));
jest.mock('../../sharedPluginUtils/astUtils');

const mockGenerateAst = generateAst as jest.MockedFunction<typeof generateAst>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('astFact', () => {
    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should have correct metadata', () => {
        expect(astFact.name).toBe('ast');
        expect(astFact.description).toBe('Uses precomputed AST from file preprocessing or generates AST for code analysis using centralized Tree-sitter worker');
        expect(typeof astFact.fn).toBe('function');
    });

    it('should return null tree when no fileData available', async () => {
        mockAlmanac.factValue.mockResolvedValue(null);

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.debug).toHaveBeenCalledWith(
            'AST Fact: No fileData available',
            expect.objectContaining({
                fact: 'ast',
                factType: 'iterative-function',
                factPriority: 1,
                correlationId: 'test-correlation-id'
            })
        );
    });

    it('should return null tree when no file content available', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts'
            // No content or fileContent
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'AST Fact: No file content available for test.ts',
            expect.objectContaining({
                fileName: 'test.ts',
                issue: 'no-content',
                fact: 'ast'
            })
        );
    });

    it('should return null tree when file content is not a valid string', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: null
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'AST Fact: No file content available for test.ts',
            expect.objectContaining({
                fileName: 'test.ts',
                issue: 'no-content',
                fact: 'ast'
            })
        );
    });

    it('should use content field when available', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        const mockResult = { tree: { type: 'program' }, mode: 'native-direct' } as any;
        mockGenerateAst.mockResolvedValue(mockResult);

        const result = await astFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            ...fileData,
            content: 'const x = 1;'
        });
        expect(result).toBe(mockResult);
    });

    it('should use fileContent field when content not available', async () => {
        const fileData = {
            fileName: 'test.ts',
            fileContent: 'const y = 2;'
        };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        const mockResult = { tree: { type: 'program' }, mode: 'native-direct' } as any;
        mockGenerateAst.mockResolvedValue(mockResult);

        const result = await astFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            ...fileData,
            content: 'const y = 2;'
        });
        expect(result).toBe(mockResult);
    });

    it('should log timing information with correlation metadata', async () => {
        let callCount = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => {
            callCount++;
            return 1000 + callCount * 100; // 1100, 1200, 1300
        });

        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        mockGenerateAst.mockResolvedValue({ tree: { type: 'program' }, mode: 'native-direct' } as any);

        await astFact.fn({}, mockAlmanac);

        expect(mockLogger.info).toHaveBeenCalledWith(
            'AST Fact: Generated AST for test.ts using native-direct - Total: 200ms, AST: 100ms',
            expect.objectContaining({
                fileName: 'test.ts',
                astMode: 'native-direct',
                totalTime: 200,
                astGenTime: 100,
                success: true,
                fact: 'ast'
            })
        );
    });

    it('should add result to almanac when resultFact provided', async () => {
        const params = { resultFact: 'myAstResult' };
        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        const mockResult = { tree: { type: 'program' }, mode: 'native-direct' } as any;
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        mockGenerateAst.mockResolvedValue(mockResult);

        await astFact.fn(params, mockAlmanac);

        expect(mockLogger.debug).toHaveBeenCalledWith(
            'Adding generated AST to almanac: myAstResult',
            expect.objectContaining({
                resultFact: 'myAstResult',
                astSource: 'generated',
                astMode: 'native-direct',
                fact: 'ast'
            })
        );
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('myAstResult', mockResult);
    });

    it('should handle errors gracefully and return null tree', async () => {
        const error = new Error('Test error');
        mockAlmanac.factValue.mockRejectedValue(error);

        let callCount = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => {
            callCount++;
            return 1000 + callCount * 100;
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.error).toHaveBeenCalledWith(
            'AST Fact: Exception after 100ms - Error: Test error',
            expect.objectContaining({
                totalTime: 100,
                errorType: 'Error',
                errorMessage: 'Test error',
                fact: 'ast'
            })
        );
    });

    it('should handle generateAst errors gracefully', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        mockGenerateAst.mockRejectedValue(new Error('AST generation failed'));

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('AST Fact: Exception after'),
            expect.objectContaining({
                errorType: 'Error',
                errorMessage: 'AST generation failed',
                fact: 'ast'
            })
        );
    });

    it('should handle empty content string', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: ''
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'AST Fact: No file content available for test.ts',
            expect.objectContaining({
                fileName: 'test.ts',
                issue: 'no-content',
                fact: 'ast'
            })
        );
    });

    it('should handle non-string content types', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: 123 // Invalid type
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'AST Fact: Invalid content type for test.ts',
            expect.objectContaining({
                fileName: 'test.ts',
                contentType: 'number',
                issue: 'invalid-content-type',
                fact: 'ast'
            })
        );
    });
}); 