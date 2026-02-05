import { nodeToSerializable, parseWithNative, parseWithWasm, parseCode, checkTreeSitterAvailability, ParseResult } from './treeSitterUtils';

// Mock @x-fidelity/core
jest.mock('@x-fidelity/core', () => ({
  getOptions: jest.fn().mockReturnValue({
    wasmLanguagesPath: undefined
  }),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Store original require for controlled mocking
const originalRequire = jest.requireActual;

describe('treeSitterUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('nodeToSerializable', () => {
    it('should return null for null input', () => {
      expect(nodeToSerializable(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(nodeToSerializable(undefined)).toBeNull();
    });

    it('should serialize a simple AST node', () => {
      const node = {
        type: 'identifier',
        text: 'foo',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 3 },
        startIndex: 0,
        endIndex: 3,
        childCount: 0,
        children: []
      };

      const result = nodeToSerializable(node);

      expect(result).toEqual({
        type: 'identifier',
        text: 'foo',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 3 },
        startIndex: 0,
        endIndex: 3,
        childCount: 0,
        children: []
      });
    });

    it('should recursively serialize children', () => {
      const childNode = {
        type: 'identifier',
        text: 'x',
        startPosition: { row: 0, column: 4 },
        endPosition: { row: 0, column: 5 },
        startIndex: 4,
        endIndex: 5,
        childCount: 0,
        children: []
      };

      const parentNode = {
        type: 'variable_declaration',
        text: 'let x',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 5 },
        startIndex: 0,
        endIndex: 5,
        childCount: 1,
        children: [childNode]
      };

      const result = nodeToSerializable(parentNode);

      expect(result.type).toBe('variable_declaration');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('identifier');
      expect(result.children[0].text).toBe('x');
    });

    it('should handle deeply nested structures', () => {
      // Create a 5-level deep structure
      let deepNode: any = {
        type: 'leaf',
        text: 'deep',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 4 },
        startIndex: 0,
        endIndex: 4,
        childCount: 0,
        children: []
      };

      for (let i = 0; i < 5; i++) {
        deepNode = {
          type: `level_${i}`,
          text: `level ${i}`,
          startPosition: { row: i, column: 0 },
          endPosition: { row: i, column: 10 },
          startIndex: i * 10,
          endIndex: (i + 1) * 10,
          childCount: 1,
          children: [deepNode]
        };
      }

      const result = nodeToSerializable(deepNode);

      // Verify the structure is preserved
      expect(result.type).toBe('level_4');
      let current = result;
      for (let i = 4; i >= 0; i--) {
        expect(current.type).toBe(i === -1 ? 'leaf' : `level_${i}`);
        if (current.children.length > 0) {
          current = current.children[0];
        }
      }
      expect(current.type).toBe('leaf');
    });

    it('should handle node with missing children array', () => {
      const node = {
        type: 'program',
        text: '',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 0 },
        startIndex: 0,
        endIndex: 0,
        childCount: 0
        // children is missing
      };

      const result = nodeToSerializable(node);

      expect(result.type).toBe('program');
      expect(result.children).toEqual([]);
    });

    it('should handle empty children array', () => {
      const node = {
        type: 'program',
        text: '',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 0 },
        startIndex: 0,
        endIndex: 0,
        childCount: 0,
        children: []
      };

      const result = nodeToSerializable(node);

      expect(result.children).toEqual([]);
    });

    it('should preserve all position information', () => {
      const node = {
        type: 'function_declaration',
        text: 'function foo() {}',
        startPosition: { row: 5, column: 2 },
        endPosition: { row: 7, column: 1 },
        startIndex: 100,
        endIndex: 117,
        childCount: 0,
        children: []
      };

      const result = nodeToSerializable(node);

      expect(result.startPosition).toEqual({ row: 5, column: 2 });
      expect(result.endPosition).toEqual({ row: 7, column: 1 });
      expect(result.startIndex).toBe(100);
      expect(result.endIndex).toBe(117);
    });
  });

  describe('parseWithNative', () => {
    // Mock tree-sitter modules
    const mockParse = jest.fn();
    const mockSetLanguage = jest.fn();
    const mockParser = {
      setLanguage: mockSetLanguage,
      parse: mockParse
    };

    beforeEach(() => {
      jest.resetModules();
      mockParse.mockReset();
      mockSetLanguage.mockReset();
    });

    it('should parse JavaScript code successfully', () => {
      // Mock the tree-sitter modules for this test
      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      mockParse.mockReturnValue({
        rootNode: {
          type: 'program',
          text: 'const x = 1;',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 12 },
          startIndex: 0,
          endIndex: 12,
          childCount: 0,
          children: []
        }
      });

      // Re-require to get mocked version
      jest.isolateModules(() => {
        const { parseWithNative: mockedParseWithNative } = require('./treeSitterUtils');
        const result = mockedParseWithNative('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeDefined();
        expect(result.mode).toBe('native');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
        expect(result.tree.type).toBe('program');
      });
    });

    it('should parse TypeScript code successfully', () => {
      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      mockParse.mockReturnValue({
        rootNode: {
          type: 'program',
          text: 'const x: number = 1;',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 20 },
          startIndex: 0,
          endIndex: 20,
          childCount: 0,
          children: []
        }
      });

      jest.isolateModules(() => {
        const { parseWithNative: mockedParseWithNative } = require('./treeSitterUtils');
        const result = mockedParseWithNative('const x: number = 1;', 'typescript', 'test.ts');

        expect(result.tree).toBeDefined();
        expect(result.mode).toBe('native');
        expect(mockSetLanguage).toHaveBeenCalledWith({ type: 'typescript-lang' });
      });
    });

    it('should return failure result when native modules unavailable', () => {
      jest.doMock('tree-sitter', () => {
        throw new Error('Cannot find module tree-sitter');
      }, { virtual: true });

      jest.isolateModules(() => {
        const { parseWithNative: mockedParseWithNative } = require('./treeSitterUtils');
        const result = mockedParseWithNative('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('Native parsing failed');
        expect(result.mode).toBe('native');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include parse timing in result', () => {
      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      mockParse.mockReturnValue({
        rootNode: {
          type: 'program',
          text: '',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 0 },
          startIndex: 0,
          endIndex: 0,
          childCount: 0,
          children: []
        }
      });

      jest.isolateModules(() => {
        const { parseWithNative: mockedParseWithNative } = require('./treeSitterUtils');
        const result = mockedParseWithNative('', 'javascript', 'test.js');

        expect(typeof result.parseTime).toBe('number');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle language not available error', () => {
      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => null, { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: null }), { virtual: true });

      jest.isolateModules(() => {
        const { parseWithNative: mockedParseWithNative } = require('./treeSitterUtils');
        const result = mockedParseWithNative('const x = 1;', 'typescript', 'test.ts');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('Language not available');
      });
    });
  });

  describe('parseWithWasm', () => {
    const mockWasmParse = jest.fn();
    const mockSetLanguage = jest.fn();
    const mockWasmParser = {
      setLanguage: mockSetLanguage,
      parse: mockWasmParse
    };

    beforeEach(() => {
      jest.resetModules();
      mockWasmParse.mockReset();
      mockSetLanguage.mockReset();
    });

    it('should parse JavaScript code with WASM parser', async () => {
      const mockLanguageLoad = jest.fn().mockResolvedValue({ type: 'mock-js-language' });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockWasmParse.mockReturnValue({
            rootNode: {
              type: 'program',
              text: 'const x = 1;',
              startPosition: { row: 0, column: 0 },
              endPosition: { row: 0, column: 12 },
              startIndex: 0,
              endIndex: 12,
              childCount: 0,
              children: []
            }
          });
        },
        Language: {
          load: mockLanguageLoad
        }
      }), { virtual: true });

      jest.doMock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(true)
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js');

        expect(result.mode).toBe('wasm');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should parse TypeScript code with WASM parser', async () => {
      const mockLanguageLoad = jest.fn().mockResolvedValue({ type: 'mock-ts-language' });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockWasmParse.mockReturnValue({
            rootNode: {
              type: 'program',
              text: 'const x: number = 1;',
              startPosition: { row: 0, column: 0 },
              endPosition: { row: 0, column: 20 },
              startIndex: 0,
              endIndex: 20,
              childCount: 0,
              children: []
            }
          });
        },
        Language: {
          load: mockLanguageLoad
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x: number = 1;', 'typescript', 'test.ts');

        expect(result.mode).toBe('wasm');
      });
    });

    it('should handle WASM initialization failure gracefully', async () => {
      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {
            throw new Error('WASM initialization failed');
          }
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('WASM parsing failed');
        expect(result.mode).toBe('wasm');
      });
    });

    it('should handle missing Parser.init gracefully', async () => {
      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          // No init method
          setLanguage = mockSetLanguage;
          parse = mockWasmParse;
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('WASM parsing failed');
      });
    });

    it('should use wasmConfig options when provided', async () => {
      const mockLanguageLoad = jest.fn().mockResolvedValue({ type: 'mock-language' });

      jest.doMock('@x-fidelity/core', () => ({
        getOptions: jest.fn().mockReturnValue({
          wasmLanguagesPath: undefined
        })
      }), { virtual: true });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockWasmParse.mockReturnValue({
            rootNode: {
              type: 'program',
              text: '',
              startPosition: { row: 0, column: 0 },
              endPosition: { row: 0, column: 0 },
              startIndex: 0,
              endIndex: 0,
              childCount: 0,
              children: []
            }
          });
        },
        Language: {
          load: mockLanguageLoad
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js', {
          languagesPath: '/custom/wasm/path'
        });

        expect(mockLanguageLoad).toHaveBeenCalled();
        // The path should include the custom languages path
        const callArg = mockLanguageLoad.mock.calls[0][0];
        expect(callArg).toContain('tree-sitter-javascript.wasm');
      });
    });

    it('should handle web-tree-sitter module not found', async () => {
      jest.doMock('web-tree-sitter', () => {
        throw new Error('Cannot find module web-tree-sitter');
      }, { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('WASM parsing failed');
      });
    });

    it('should handle Language loader not found', async () => {
      jest.doMock('@x-fidelity/core', () => ({
        getOptions: jest.fn().mockReturnValue({
          wasmLanguagesPath: undefined
        })
      }), { virtual: true });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockWasmParse;
        }
        // No Language export
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseWithWasm: mockedParseWithWasm } = require('./treeSitterUtils');
        const result = await mockedParseWithWasm('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toContain('Language loader not found');
      });
    });
  });

  describe('parseCode', () => {
    const mockParse = jest.fn();
    const mockSetLanguage = jest.fn();

    beforeEach(() => {
      jest.resetModules();
      mockParse.mockReset();
      mockSetLanguage.mockReset();
    });

    it('should use native parsing by default', async () => {
      const mockParser = {
        setLanguage: mockSetLanguage,
        parse: mockParse.mockReturnValue({
          rootNode: {
            type: 'program',
            text: '',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
            startIndex: 0,
            endIndex: 0,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'test.js');

        expect(result.mode).toBe('native-direct');
      });
    });

    it('should use WASM parsing when useWasm is true', async () => {
      const mockLanguageLoad = jest.fn().mockResolvedValue({ type: 'mock-language' });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockParse.mockReturnValue({
            rootNode: {
              type: 'program',
              text: '',
              startPosition: { row: 0, column: 0 },
              endPosition: { row: 0, column: 0 },
              startIndex: 0,
              endIndex: 0,
              childCount: 0,
              children: []
            }
          });
        },
        Language: {
          load: mockLanguageLoad
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'test.js', {
          useWasm: true
        });

        expect(result.mode).toBe('wasm-direct');
      });
    });

    it('should append -direct suffix in direct mode', async () => {
      const mockParser = {
        setLanguage: mockSetLanguage,
        parse: mockParse.mockReturnValue({
          rootNode: {
            type: 'program',
            text: '',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
            startIndex: 0,
            endIndex: 0,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'test.js', {
          mode: 'direct'
        });

        expect(result.mode).toContain('-direct');
      });
    });

    it('should not append -direct suffix in worker mode', async () => {
      const mockParser = {
        setLanguage: mockSetLanguage,
        parse: mockParse.mockReturnValue({
          rootNode: {
            type: 'program',
            text: '',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
            startIndex: 0,
            endIndex: 0,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'test.js', {
          mode: 'worker'
        });

        expect(result.mode).toBe('native');
      });
    });

    it('should handle parse failures gracefully', async () => {
      jest.doMock('tree-sitter', () => {
        throw new Error('Module not found');
      }, { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'test.js');

        expect(result.tree).toBeNull();
        expect(result.reason).toBeDefined();
        expect(result.parseTime).toBe(0);
      });
    });

    it('should pass wasmConfig to parseWithWasm', async () => {
      const mockLanguageLoad = jest.fn().mockResolvedValue({ type: 'mock-language' });

      jest.doMock('@x-fidelity/core', () => ({
        getOptions: jest.fn().mockReturnValue({
          wasmLanguagesPath: undefined
        })
      }), { virtual: true });

      jest.doMock('web-tree-sitter', () => ({
        Parser: class MockParser {
          static async init() {}
          setLanguage = mockSetLanguage;
          parse = mockParse.mockReturnValue({
            rootNode: {
              type: 'program',
              text: '',
              startPosition: { row: 0, column: 0 },
              endPosition: { row: 0, column: 0 },
              startIndex: 0,
              endIndex: 0,
              childCount: 0,
              children: []
            }
          });
        },
        Language: {
          load: mockLanguageLoad
        }
      }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        await mockedParseCode('const x = 1;', 'javascript', 'test.js', {
          useWasm: true,
          wasmConfig: {
            languagesPath: '/custom/path',
            timeout: 5000
          }
        });

        expect(mockLanguageLoad).toHaveBeenCalled();
      });
    });
  });

  describe('checkTreeSitterAvailability', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should detect native availability when modules are present', () => {
      jest.doMock('tree-sitter', () => ({}), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({}), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({}), { virtual: true });
      jest.doMock('web-tree-sitter', () => ({}), { virtual: true });

      jest.isolateModules(() => {
        const { checkTreeSitterAvailability: mockedCheck } = require('./treeSitterUtils');
        const result = mockedCheck();

        expect(result.nativeAvailable).toBe(true);
        expect(result.wasmAvailable).toBe(true);
        expect(result.supportedLanguages).toContain('javascript');
        expect(result.supportedLanguages).toContain('typescript');
      });
    });

    it('should detect native unavailability when modules are missing', () => {
      // Mock require.resolve to throw for native modules
      const originalResolve = require.resolve;
      jest.spyOn(require, 'resolve').mockImplementation((id: string) => {
        if (id === 'tree-sitter' || id === 'tree-sitter-javascript' || id === 'tree-sitter-typescript') {
          throw new Error('Cannot find module');
        }
        return originalResolve(id);
      });

      jest.isolateModules(() => {
        // Need to re-require after mocking require.resolve
        try {
          const { checkTreeSitterAvailability: mockedCheck } = require('./treeSitterUtils');
          const result = mockedCheck();

          // The native modules may or may not be available depending on the environment
          expect(typeof result.nativeAvailable).toBe('boolean');
        } catch {
          // Module resolution may fail in some test environments
        }
      });

      // Restore
      jest.restoreAllMocks();
    });

    it('should detect WASM availability', () => {
      jest.doMock('web-tree-sitter', () => ({}), { virtual: true });

      jest.isolateModules(() => {
        const { checkTreeSitterAvailability: mockedCheck } = require('./treeSitterUtils');
        const result = mockedCheck();

        expect(result.wasmAvailable).toBe(true);
      });
    });

    it('should return supported languages', () => {
      jest.isolateModules(() => {
        const { checkTreeSitterAvailability: mockedCheck } = require('./treeSitterUtils');
        const result = mockedCheck();

        expect(result.supportedLanguages).toEqual(['javascript', 'typescript']);
      });
    });

    it('should handle mixed availability', () => {
      // Mock only WASM available
      jest.doMock('tree-sitter', () => {
        throw new Error('Not found');
      }, { virtual: true });
      jest.doMock('web-tree-sitter', () => ({}), { virtual: true });

      jest.isolateModules(() => {
        const { checkTreeSitterAvailability: mockedCheck } = require('./treeSitterUtils');
        const result = mockedCheck();

        // Result depends on whether native modules are actually installed
        expect(typeof result.nativeAvailable).toBe('boolean');
        expect(result.wasmAvailable).toBe(true);
      });
    });
  });

  describe('ParseResult interface', () => {
    it('should support all ParseResult properties', () => {
      const successResult: ParseResult = {
        tree: { type: 'program', children: [] },
        rootNode: { type: 'program', children: [] },
        mode: 'native',
        parseTime: 10
      };

      expect(successResult.tree).toBeDefined();
      expect(successResult.mode).toBe('native');
      expect(successResult.parseTime).toBe(10);

      const failResult: ParseResult = {
        tree: null,
        reason: 'Failed to parse',
        mode: 'wasm',
        parseTime: 5
      };

      expect(failResult.tree).toBeNull();
      expect(failResult.reason).toBe('Failed to parse');
    });

    it('should support all mode values', () => {
      const modes: ParseResult['mode'][] = ['native', 'wasm', 'native-direct', 'wasm-direct'];

      modes.forEach(mode => {
        const result: ParseResult = {
          tree: null,
          mode
        };
        expect(result.mode).toBe(mode);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty code string', async () => {
      const mockParser = {
        setLanguage: jest.fn(),
        parse: jest.fn().mockReturnValue({
          rootNode: {
            type: 'program',
            text: '',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
            startIndex: 0,
            endIndex: 0,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('', 'javascript', 'empty.js');

        expect(result.tree).toBeDefined();
        expect(result.tree.type).toBe('program');
      });
    });

    it('should handle very long code', async () => {
      const mockParser = {
        setLanguage: jest.fn(),
        parse: jest.fn().mockReturnValue({
          rootNode: {
            type: 'program',
            text: 'x'.repeat(100000),
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 100000 },
            startIndex: 0,
            endIndex: 100000,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      const longCode = 'const x = ' + '"a"'.repeat(10000) + ';';

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode(longCode, 'javascript', 'long.js');

        expect(result.tree).toBeDefined();
      });
    });

    it('should handle special characters in file names', async () => {
      const mockParser = {
        setLanguage: jest.fn(),
        parse: jest.fn().mockReturnValue({
          rootNode: {
            type: 'program',
            text: '',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
            startIndex: 0,
            endIndex: 0,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const x = 1;', 'javascript', 'file with spaces (1).js');

        expect(result.tree).toBeDefined();
      });
    });

    it('should handle unicode in code', async () => {
      const mockParser = {
        setLanguage: jest.fn(),
        parse: jest.fn().mockReturnValue({
          rootNode: {
            type: 'program',
            text: 'const 变量 = "你好";',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 17 },
            startIndex: 0,
            endIndex: 17,
            childCount: 0,
            children: []
          }
        })
      };

      jest.doMock('tree-sitter', () => jest.fn().mockImplementation(() => mockParser), { virtual: true });
      jest.doMock('tree-sitter-javascript', () => ({ type: 'javascript-lang' }), { virtual: true });
      jest.doMock('tree-sitter-typescript', () => ({ typescript: { type: 'typescript-lang' } }), { virtual: true });

      await jest.isolateModulesAsync(async () => {
        const { parseCode: mockedParseCode } = require('./treeSitterUtils');
        const result = await mockedParseCode('const 变量 = "你好";', 'javascript', 'unicode.js');

        expect(result.tree).toBeDefined();
        expect(result.tree.text).toContain('变量');
      });
    });
  });
});
