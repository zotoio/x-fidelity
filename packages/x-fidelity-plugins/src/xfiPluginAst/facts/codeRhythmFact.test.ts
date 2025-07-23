import { CodeRhythmMetrics, codeRhythmFact } from './codeRhythmFact';

describe('codeRhythmFact', () => {
    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return basic metrics when AST and fileData are available', async () => {
        // Mock fileData first, then AST
        mockAlmanac.factValue
            .mockResolvedValueOnce({
                fileName: 'test.ts',
                fileContent: 'function test() { console.log("test"); }',
                content: 'function test() { console.log("test"); }'
            })  // First call for fileData
            .mockResolvedValueOnce({
                tree: { type: 'program' }, // Mock AST structure
                rootNode: { type: 'program' }
            }); // Second call for AST

        const result: CodeRhythmMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.consistency).toBeDefined();
        expect(result.complexity).toBeDefined();
        expect(result.readability).toBeDefined();
        expect(typeof result.consistency).toBe('number');
        expect(typeof result.complexity).toBe('number');
        expect(typeof result.readability).toBe('number');
    });

    it('should return zero metrics when fileData is not available', async () => {
        mockAlmanac.factValue.mockResolvedValue(null);

        const result: CodeRhythmMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.consistency).toBe(0);
        expect(result.complexity).toBe(0);
        expect(result.readability).toBe(0);
    });

    it('should handle errors gracefully', async () => {
        mockAlmanac.factValue.mockRejectedValue(new Error('Test error'));

        const result: CodeRhythmMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.consistency).toBe(0);
        expect(result.complexity).toBe(0);
        expect(result.readability).toBe(0);
    });

    it('should return zero metrics when file content is not available', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts'
            // No fileContent or content
        });

        const result: CodeRhythmMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.consistency).toBe(0);
        expect(result.complexity).toBe(0);
        expect(result.readability).toBe(0);
    });
});
