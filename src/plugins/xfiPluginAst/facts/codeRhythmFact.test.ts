import { CodeMetrics, codeRhythmFact } from './codeRhythmFact';
import { logger } from '../../../utils/logger';
import fs from 'fs';
import path from 'path';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn()
    }
}));

describe('codeRhythmFact', () => {
    let goodCodeContent: string;
    let poorCodeContent: string;
    
    beforeAll(() => {
        goodCodeContent = fs.readFileSync(path.join(__dirname, '../../../exampleTriggerFiles/goodCodeRhythm.ts'), 'utf8');
        poorCodeContent = fs.readFileSync(path.join(__dirname, '../../../exampleTriggerFiles/poorCodeRhythm.ts'), 'utf8');
    });

    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should identify good code rhythm', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'goodCodeRhythm.ts',
            fileContent: goodCodeContent
        });

        const result: { metrics: CodeMetrics } = await codeRhythmFact.fn({ resultFact: 'rhythmResult' }, mockAlmanac);

        expect(result.metrics).toBeDefined();
        expect(result.metrics.consistency).toBeGreaterThan(0.5);
        expect(result.metrics.complexity).toBeGreaterThan(0.5);
        expect(result.metrics.readability).toBeGreaterThan(0.5);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('rhythmResult', result.metrics);
    });

    it('should identify poor code rhythm', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'poorCodeRhythm.ts',
            fileContent: poorCodeContent
        });

        const result: { metrics: CodeMetrics } = await codeRhythmFact.fn({ resultFact: 'rhythmResult' }, mockAlmanac);

        expect(result.metrics).toBeDefined();
        expect(result.metrics.consistency).toBeLessThanOrEqual(0.76);
        expect(result.metrics.complexity).toBeLessThanOrEqual(0.76);
        expect(result.metrics.readability).toBeLessThanOrEqual(0.76);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('rhythmResult', Object.assign({}, result.metrics));
    });

    it('should handle missing AST gracefully', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'empty.ts',
            fileContent: ''
        });

        const result = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result.metrics).toBeNull();
        expect(logger.debug).toHaveBeenCalledWith('No AST available for rhythm analysis');
    });

    it('should handle errors gracefully', async () => {
        mockAlmanac.factValue.mockRejectedValue(new Error('Test error'));

        const result = await codeRhythmFact.fn({}, mockAlmanac);

        expect(result.metrics).toBeNull();
        expect(logger.error).toHaveBeenCalledWith('Error in code rhythm analysis: Error: Test error');
    });
});
