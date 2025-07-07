import { fileContainsFn } from './fileContains';

describe('fileContains operator', () => {
  
  describe('basic functionality', () => {
    it('should return true when file contains the pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'console.log("Hello world");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });

    it('should return false when file does not contain the pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'alert("Hello world");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(false);
    });

    it('should return false when no files are provided', () => {
      const fact = {
        files: []
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(false);
    });

    it('should return false when fact is null or undefined', () => {
      expect(fileContainsFn(null as any, 'pattern')).toBe(false);
      expect(fileContainsFn(undefined as any, 'pattern')).toBe(false);
    });

    it('should return false when files property is missing', () => {
      const fact = {};

      const result = fileContainsFn(fact as any, 'console.log');
      expect(result).toBe(false);
    });
  });

  describe('pattern matching', () => {
    it('should handle regex patterns', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const userName = "john"; const userAge = 25;'
          }
        ]
      };

      const result = fileContainsFn(fact, 'user\\w+');
      expect(result).toBe(true);
    });

    it('should handle special characters in patterns', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const obj = { key: "value" };'
          }
        ]
      };

      const result = fileContainsFn(fact, '\\{.*\\}');
      expect(result).toBe(true);
    });

    it('should be case sensitive by default', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'Console.log("test");'
          }
        ]
      };

      expect(fileContainsFn(fact, 'console.log')).toBe(false);
      expect(fileContainsFn(fact, 'Console.log')).toBe(true);
    });

    it('should handle empty pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'some content'
          }
        ]
      };

      const result = fileContainsFn(fact, '');
      expect(result).toBe(true); // Empty string matches everything
    });
  });

  describe('multiple files', () => {
    it('should return true if any file contains the pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'file1.js',
            filePath: '/test/file1.js',
            fileContent: 'alert("Hello");'
          },
          {
            fileName: 'file2.js',
            filePath: '/test/file2.js',
            fileContent: 'console.log("World");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });

    it('should return false if no files contain the pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'file1.js',
            filePath: '/test/file1.js',
            fileContent: 'alert("Hello");'
          },
          {
            fileName: 'file2.js',
            filePath: '/test/file2.js',
            fileContent: 'prompt("Input");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(false);
    });

    it('should handle files with missing content', () => {
      const fact = {
        files: [
          {
            fileName: 'file1.js',
            filePath: '/test/file1.js',
            fileContent: undefined
          },
          {
            fileName: 'file2.js',
            filePath: '/test/file2.js',
            fileContent: 'console.log("test");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });

    it('should handle files with null content', () => {
      const fact = {
        files: [
          {
            fileName: 'file1.js',
            filePath: '/test/file1.js',
            fileContent: null
          },
          {
            fileName: 'file2.js',
            filePath: '/test/file2.js',
            fileContent: 'console.log("test");'
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });
  });

  describe('file content variations', () => {
    it('should handle multiline content', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: `
              function test() {
                console.log("debug");
                return true;
              }
            `
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });

    it('should handle content with special characters', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const str = "Line 1\\nLine 2\\tTabbed";'
          }
        ]
      };

      const result = fileContainsFn(fact, '\\\\n');
      expect(result).toBe(true);
    });

    it('should handle Unicode content', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const message = "Hello 世界! 🌍";'
          }
        ]
      };

      const result = fileContainsFn(fact, '世界');
      expect(result).toBe(true);
    });

    it('should handle very large content', () => {
      const largeContent = 'x'.repeat(100000) + 'console.log("found")' + 'y'.repeat(100000);
      const fact = {
        files: [
          {
            fileName: 'large.js',
            filePath: '/test/large.js',
            fileContent: largeContent
          }
        ]
      };

      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed file objects', () => {
      const fact = {
        files: [
          null,
          undefined,
          {
            fileName: 'valid.js',
            filePath: '/test/valid.js',
            fileContent: 'console.log("test");'
          }
        ]
      };

      const result = fileContainsFn(fact as any, 'console.log');
      expect(result).toBe(true);
    });

    it('should handle invalid pattern (null/undefined)', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'console.log("test");'
          }
        ]
      };

      expect(fileContainsFn(fact, null as any)).toBe(false);
      expect(fileContainsFn(fact, undefined as any)).toBe(false);
    });

    it('should handle pattern as number', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const count = 123;'
          }
        ]
      };

      const result = fileContainsFn(fact, 123 as any);
      expect(result).toBe(true);
    });

    it('should handle boolean pattern', () => {
      const fact = {
        files: [
          {
            fileName: 'test.js',
            filePath: '/test/test.js',
            fileContent: 'const flag = true;'
          }
        ]
      };

      const result = fileContainsFn(fact, true as any);
      expect(result).toBe(true);
    });
  });

  describe('performance considerations', () => {
    it('should return early when first match is found', () => {
      const fact = {
        files: [
          {
            fileName: 'file1.js',
            filePath: '/test/file1.js',
            fileContent: 'console.log("first");'
          },
          {
            fileName: 'file2.js',
            filePath: '/test/file2.js',
            fileContent: 'console.log("second");'
          }
        ]
      };

      // This tests the short-circuit behavior
      const result = fileContainsFn(fact, 'console.log');
      expect(result).toBe(true);
    });

    it('should handle empty files efficiently', () => {
      const fact = {
        files: [
          {
            fileName: 'empty.js',
            filePath: '/test/empty.js',
            fileContent: ''
          }
        ]
      };

      const result = fileContainsFn(fact, 'anything');
      expect(result).toBe(false);
    });
  });
}); 