import { astFact } from './astFact';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

// Mock dependencies
jest.mock('@x-fidelity/core');
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
        expect(mockLogger.debug).toHaveBeenCalledWith('No fileData available for AST generation');
    });

    it('should return null tree when no file content available', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts'
            // No content or fileContent
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.debug).toHaveBeenCalledWith('No file content available for AST generation');
    });

    it('should return null tree when file content is not a valid string', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: null
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
    });

    it('should use content field when available', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        const mockResult = { tree: { type: 'program' } };
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
        const mockResult = { tree: { type: 'program' } };
        mockGenerateAst.mockResolvedValue(mockResult);

        const result = await astFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            ...fileData,
            content: 'const y = 2;'
        });
        expect(result).toBe(mockResult);
    });

    it('should log timing information', async () => {
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
        mockGenerateAst.mockResolvedValue({ tree: { type: 'program' } });

        await astFact.fn({}, mockAlmanac);

        expect(mockLogger.debug).toHaveBeenCalledWith(
            'AST TIMING: test.ts - Total: 200ms, AST Gen: 100ms, Content size: 12 chars'
        );
    });

    it('should add result to almanac when resultFact provided', async () => {
        const params = { resultFact: 'myAstResult' };
        const fileData = {
            fileName: 'test.ts',
            content: 'const x = 1;'
        };
        const mockResult = { tree: { type: 'program' } };
        
        mockAlmanac.factValue.mockResolvedValue(fileData);
        mockGenerateAst.mockResolvedValue(mockResult);

        await astFact.fn(params, mockAlmanac);

        expect(mockLogger.debug).toHaveBeenCalledWith('Adding generated AST to almanac:', 'myAstResult');
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
        expect(mockLogger.error).toHaveBeenCalledWith('AST TIMING: Error after 100ms - Error: Test error');
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
            expect.stringContaining('AST TIMING: Error after')
        );
    });

    it('should handle empty content string', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: '',
            fileContent: '' // Both content and fileContent are empty to trigger the "no content" message
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.debug).toHaveBeenCalledWith('No file content available for AST generation');
    });

    it('should handle non-string content types', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts',
            content: 123
        });

        const result = await astFact.fn({}, mockAlmanac);

        expect(result).toEqual({ tree: null });
        expect(mockLogger.debug).toHaveBeenCalledWith('File content is not a valid string for AST generation');
    });
}); 