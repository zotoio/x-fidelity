import { CodeMetrics, codeRhythmFact } from './codeRhythmFact';

describe('codeRhythmFact', () => {
    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return basic metrics when AST is available', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            program: { body: [] } // Mock AST structure
        });

        const result: CodeMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.cyclomaticComplexity).toBe(1);
        expect(result.cognitiveComplexity).toBe(1);
        expect(result.nestingDepth).toBe(1);
        expect(result.parameterCount).toBe(0);
        expect(result.returnCount).toBe(0);
        expect(result.lineCount).toBe(0);
    });

    it('should return zero metrics when AST is not available', async () => {
        mockAlmanac.factValue.mockResolvedValue(null);

        const result: CodeMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.cyclomaticComplexity).toBe(0);
        expect(result.cognitiveComplexity).toBe(0);
        expect(result.nestingDepth).toBe(0);
        expect(result.parameterCount).toBe(0);
        expect(result.returnCount).toBe(0);
        expect(result.lineCount).toBe(0);
    });

    it('should handle errors gracefully', async () => {
        mockAlmanac.factValue.mockRejectedValue(new Error('Test error'));

        const result: CodeMetrics = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result).toBeDefined();
        expect(result.cyclomaticComplexity).toBe(0);
        expect(result.cognitiveComplexity).toBe(0);
        expect(result.nestingDepth).toBe(0);
        expect(result.parameterCount).toBe(0);
        expect(result.returnCount).toBe(0);
        expect(result.lineCount).toBe(0);
    });
});
