import basicPlugin from './index';

describe('basicPlugin', () => {
  it('should have correct structure', () => {
    expect(basicPlugin.name).toBe('basic-plugin');
    expect(basicPlugin.version).toBe('1.0.0');
    expect(basicPlugin.operators).toHaveLength(1);
    expect(basicPlugin.facts).toHaveLength(1);
  });

  describe('customContains operator', () => {
    const operator = basicPlugin.operators![0];

    it('should correctly check if string contains substring', () => {
      expect(operator.fn('hello world', 'world')).toBe(true);
      expect(operator.fn('hello world', 'xyz')).toBe(false);
    });
  });

  describe('customFileInfo fact', () => {
    const fact = basicPlugin.facts![0];

    it('should return file info', async () => {
      const mockAlmanac = {
        factValue: jest.fn().mockResolvedValue({
          fileName: 'test.txt',
          fileContent: 'hello'
        })
      };

      const result = await fact.fn({}, mockAlmanac);
      expect(result).toMatchObject({
        fileName: 'test.txt',
        size: 5
      });
      expect(result.timestamp).toBeDefined();
    });
  });
});
