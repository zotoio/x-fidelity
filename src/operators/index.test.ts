import { loadOperators } from './index';
import { outdatedFramework } from './outdatedFramework';
import { fileContains } from './fileContains';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';

jest.mock('./outdatedFramework');
jest.mock('./fileContains');
jest.mock('./nonStandardDirectoryStructure');
jest.mock('./openaiAnalysisHighSeverity');

describe('loadOperators', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load specified operators', async () => {
        const operatorNames = ['outdatedFramework', 'fileContains'];
        const result = await loadOperators(operatorNames);

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(outdatedFramework);
        expect(result[1]).toBe(fileContains);
    });

    it('should load only non-openai operators when all names are specified', async () => {
        const operatorNames = ['outdatedFramework', 'fileContains', 'nonStandardDirectoryStructure', 'openaiAnalysisHighSeverity'];
        const result = await loadOperators(operatorNames);

        expect(result).toHaveLength(3);
        expect(result[0]).toBe(outdatedFramework);
        expect(result[1]).toBe(fileContains);
        expect(result[2]).toBe(nonStandardDirectoryStructure);
    });

    it('should return an empty array when no operator names are specified', async () => {
        const result = await loadOperators([]);

        expect(result).toHaveLength(0);
    });

    it('should ignore non-existent operators', async () => {
        const operatorNames = ['outdatedFramework', 'nonExistentOperator', 'fileContains'];
        const result = await loadOperators(operatorNames);

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(outdatedFramework);
        expect(result[1]).toBe(fileContains);
    });
});
