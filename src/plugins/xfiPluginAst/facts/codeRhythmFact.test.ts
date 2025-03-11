import { codeRhythmFact } from './codeRhythmFact';
import { logger } from '../../../utils/logger';
import fs from 'fs';
import path from 'path';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
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

        const params = {
            resultFact: 'rhythmResult'
        };

        const result = await codeRhythmFact.fn(params, mockAlmanac);

        expect(result.metrics).toBeDefined();
        expect(result.metrics.flowDensity).toBeLessThan(0.7);
        expect(result.metrics.operationalSymmetry).toBeGreaterThan(0.6);
        expect(result.metrics.syntacticDiscontinuity).toBeLessThan(0.4);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('rhythmResult', result.metrics);
    });

    it('should identify poor code rhythm', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'poorCodeRhythm.ts',
            fileContent: poorCodeContent
        });

        const params = {
            resultFact: 'rhythmResult'
        };

        const result = await codeRhythmFact.fn(params, mockAlmanac);

        expect(result.metrics).toBeDefined();
        expect(result.metrics.flowDensity).toBeGreaterThan(0.7);
        expect(result.metrics.operationalSymmetry).toBeLessThan(0.6);
        expect(result.metrics.syntacticDiscontinuity).toBeGreaterThan(0.4);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('rhythmResult', result.metrics);
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

    it('should respect minimum complexity threshold', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'goodCodeRhythm.ts',
            fileContent: goodCodeContent
        });

        const params = {
            resultFact: 'rhythmResult',
            minimumComplexityLogged: 5
        };

        const result = await codeRhythmFact.fn(params, mockAlmanac);

        expect(result.metrics).toBeDefined();
        expect(logger.debug).toHaveBeenCalledWith(
            expect.objectContaining({
                threshold: 5
            }),
            expect.any(String)
        );
    });
});
