import basicPlugin from './index';
import axios from 'axios';

jest.mock('axios');

describe('basicPlugin', () => {
  it('should have correct structure', () => {
    expect(basicPlugin.name).toBe('xfi-example-plugin');
    expect(basicPlugin.version).toBe('1.0.0');
    expect(basicPlugin.operators).toHaveLength(1);
    expect(basicPlugin.facts).toHaveLength(1);
    expect(basicPlugin.sampleRules).toHaveLength(1);
  });

  describe('regexExtract operator', () => {
    const operator = basicPlugin.operators![0];

    it('should return false for invalid input', () => {
      expect(operator.fn(undefined, 'pattern')).toBe(false);
      expect(operator.fn({}, 'pattern')).toBe(false);
      expect(operator.fn({ result: null }, 'pattern')).toBe(false);
    });

    it('should return true when matches are found', () => {
      expect(operator.fn({ result: ['match'] }, 'pattern')).toBe(true);
    });
  });

  describe('externalApiCall fact', () => {
    const fact = basicPlugin.facts![0];

    beforeEach(() => {
      (axios as jest.Mocked<typeof axios>).mockClear();
    });

    it('should handle successful API call', async () => {
      const mockResponse = { data: { status: 'success' } };
      (axios as jest.Mocked<typeof axios>).mockResolvedValueOnce(mockResponse);

      const mockAlmanac = {
        factValue: jest.fn().mockResolvedValue({
          fileContent: 'version: "1.0.0"'
        })
      };

      const params = {
        regex: 'version:\\s*["\']([^"\']+)["\']',
        url: 'https://api.example.com/test',
        method: 'POST',
        includeValue: true
      };

      const result = await fact.fn(params, mockAlmanac);
      expect(result.success).toBe(true);
      expect(result.extractedValue).toBe('1.0.0');
      expect(result.apiResponse).toEqual(mockResponse.data);
    });

    it('should handle regex match failure', async () => {
      const mockAlmanac = {
        factValue: jest.fn().mockResolvedValue({
          fileContent: 'no match here'
        })
      };

      const result = await fact.fn({
        regex: 'version:\\s*["\']([^"\']+)["\']'
      }, mockAlmanac);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('No match found');
    });

    it('should handle API call failure', async () => {
      (axios as jest.Mocked<typeof axios>).mockRejectedValueOnce(new Error('API Error'));

      const mockAlmanac = {
        factValue: jest.fn().mockResolvedValue({
          fileContent: 'version: "1.0.0"'
        })
      };

      const result = await fact.fn({
        regex: 'version:\\s*["\']([^"\']+)["\']',
        url: 'https://api.example.com/test'
      }, mockAlmanac);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });
});
