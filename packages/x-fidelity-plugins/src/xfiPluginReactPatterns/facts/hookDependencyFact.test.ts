import { hookDependencyFact } from './hookDependencyFact';
import { FileData, AstResult } from '@x-fidelity/types';

// Mock logger
jest.mock('@x-fidelity/core', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('hookDependencyFact', () => {
  let mockFileData: FileData;
  let mockAlmanac: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFileData = {
      fileName: 'TestComponent.tsx',
      filePath: '/src/components/TestComponent.tsx',
      fileContent: `
        import React, { useState, useEffect } from 'react';
        
        const TestComponent = () => {
          const [count, setCount] = useState(0);
          const [data, setData] = useState(null);
          
          useEffect(() => {
            console.log(count);
          }, []); // Missing count dependency
          
          useEffect(() => {
            setData(count * 2);
          }, [count, data]); // Unnecessary data dependency
          
          return <div>{count}</div>;
        };
      `,
      fileAst: null
    };

    mockAlmanac = {
      factValue: jest.fn()
    };
  });

  describe('fact definition', () => {
    it('should have correct metadata', () => {
      expect(hookDependencyFact.name).toBe('hookDependency');
      expect(hookDependencyFact.description).toBe('Analyzes React hook dependencies using precomputed AST');
      expect(hookDependencyFact.type).toBe('iterative-function');
      expect(hookDependencyFact.priority).toBe(2);
      expect(typeof hookDependencyFact.fn).toBe('function');
    });
  });

  describe('fact function execution', () => {
    it('should return empty results when AST is not available', async () => {
      mockAlmanac.factValue.mockResolvedValue(null);

      const result = await hookDependencyFact.fn(mockFileData, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should return empty results when AST tree is not available', async () => {
      const astResult: AstResult = {
        tree: null,
        hasErrors: true,
        language: 'tsx',
        generationTime: 100
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(mockFileData, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should analyze hook dependencies with valid AST', async () => {
      const mockAstTree = {
        type: 'program',
        children: [
          {
            type: 'function_declaration',
            children: [
              {
                type: 'call_expression',
                text: 'useEffect',
                children: [
                  {
                    type: 'arrow_function',
                    children: [
                      {
                        type: 'identifier',
                        text: 'count'
                      }
                    ]
                  },
                  {
                    type: 'array',
                    children: [] // Empty dependency array
                  }
                ]
              }
            ]
          }
        ]
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'tsx',
        generationTime: 150
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(mockFileData, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
      expect(Array.isArray(result.missingDependencies)).toBe(true);
      expect(Array.isArray(result.unnecessaryDependencies)).toBe(true);
    });

    it('should handle TypeScript React component', async () => {
      const tsxFileData: FileData = {
        fileName: 'TypedComponent.tsx',
        filePath: '/src/components/TypedComponent.tsx',
        fileContent: `
          interface Props {
            initialValue: number;
          }
          
          const TypedComponent: React.FC<Props> = ({ initialValue }) => {
            const [value, setValue] = useState(initialValue);
            
            useEffect(() => {
              setValue(initialValue);
            }, []); // Missing initialValue dependency
            
            return <div>{value}</div>;
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'tsx',
        generationTime: 200
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(tsxFileData, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
    });

    it('should handle JavaScript React component', async () => {
      const jsxFileData: FileData = {
        fileName: 'JSComponent.jsx',
        filePath: '/src/components/JSComponent.jsx',
        fileContent: `
          const JSComponent = ({ data }) => {
            const [state, setState] = useState(data);
            
            useEffect(() => {
              setState(data);
            }, [data]); // Correct dependency
            
            return <div>{state}</div>;
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'jsx',
        generationTime: 120
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(jsxFileData, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
    });

    it('should handle non-React files gracefully', async () => {
      const nonReactFile: FileData = {
        fileName: 'utils.ts',
        filePath: '/src/utils/utils.ts',
        fileContent: `
          export const calculateSum = (a: number, b: number) => {
            return a + b;
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'typescript',
        generationTime: 80
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(nonReactFile, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should handle errors gracefully', async () => {
      mockAlmanac.factValue.mockRejectedValue(new Error('AST generation failed'));

      const result = await hookDependencyFact.fn(mockFileData, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
      
      const { logger } = require('@x-fidelity/core');
      expect(logger.error).toHaveBeenCalledWith('Error in hookDependency fact:', expect.any(Error));
    });

    it('should handle invalid file data', async () => {
      const invalidFileData = null;
      
      const result = await hookDependencyFact.fn(invalidFileData, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should handle missing almanac', async () => {
      const result = await hookDependencyFact.fn(mockFileData, null);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });
  });

  describe('complex React patterns', () => {
    it('should analyze custom hooks', async () => {
      const customHookFile: FileData = {
        fileName: 'useCounter.ts',
        filePath: '/src/hooks/useCounter.ts',
        fileContent: `
          import { useState, useEffect } from 'react';
          
          export const useCounter = (initialValue: number, step: number) => {
            const [count, setCount] = useState(initialValue);
            
            useEffect(() => {
              console.log('Count changed:', count);
            }, [count]);
            
            const increment = useCallback(() => {
              setCount(prev => prev + step);
            }, [step]);
            
            return { count, increment };
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'typescript',
        generationTime: 180
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(customHookFile, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
    });

    it('should handle complex dependency scenarios', async () => {
      const complexFile: FileData = {
        fileName: 'ComplexComponent.tsx',
        filePath: '/src/components/ComplexComponent.tsx',
        fileContent: `
          const ComplexComponent = ({ data, config }) => {
            const [state, setState] = useState(data);
            const [loading, setLoading] = useState(false);
            
            const processData = useCallback((input) => {
              return input.map(item => ({ ...item, processed: true }));
            }, []); // Missing dependencies
            
            useEffect(() => {
              if (data && config.enabled) {
                setLoading(true);
                const processed = processData(data);
                setState(processed);
                setLoading(false);
              }
            }, [data]); // Missing config, processData
            
            return loading ? <div>Loading...</div> : <div>{state.length}</div>;
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'tsx',
        generationTime: 250
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(complexFile, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file content', async () => {
      const emptyFile: FileData = {
        fileName: 'Empty.tsx',
        filePath: '/src/components/Empty.tsx',
        fileContent: '',
        fileAst: null
      };

      const astResult: AstResult = {
        tree: { type: 'program', children: [] },
        hasErrors: false,
        language: 'tsx',
        generationTime: 10
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(emptyFile, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should handle malformed AST', async () => {
      const malformedAst: AstResult = {
        tree: { type: 'invalid', children: null },
        hasErrors: true,
        language: 'tsx',
        generationTime: 0
      };
      mockAlmanac.factValue.mockResolvedValue(malformedAst);

      const result = await hookDependencyFact.fn(mockFileData, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });

    it('should handle large files gracefully', async () => {
      const largeContent = 'const Component = () => {\n' + '  const [state, setState] = useState(0);\n'.repeat(1000) + '  return <div />;\n};';
      
      const largeFile: FileData = {
        fileName: 'LargeComponent.tsx',
        filePath: '/src/components/LargeComponent.tsx',
        fileContent: largeContent,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: Array(1000).fill({
          type: 'variable_declaration',
          children: []
        })
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'tsx',
        generationTime: 5000
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(largeFile, mockAlmanac);

      expect(result).toHaveProperty('missingDependencies');
      expect(result).toHaveProperty('unnecessaryDependencies');
    });

    it('should handle special characters in file content', async () => {
      const specialFile: FileData = {
        fileName: '特殊Component.tsx',
        filePath: '/src/components/特殊Component.tsx',
        fileContent: `
          const SpecialComponent = () => {
            const [emoji, setEmoji] = useState('🚀');
            
            useEffect(() => {
              console.log('Special chars: 特殊字符', emoji);
            }, [emoji]);
            
            return <div>{emoji}</div>;
          };
        `,
        fileAst: null
      };

      const mockAstTree = {
        type: 'program',
        children: []
      };

      const astResult: AstResult = {
        tree: mockAstTree,
        hasErrors: false,
        language: 'tsx',
        generationTime: 100
      };
      mockAlmanac.factValue.mockResolvedValue(astResult);

      const result = await hookDependencyFact.fn(specialFile, mockAlmanac);

      expect(result).toEqual({
        missingDependencies: [],
        unnecessaryDependencies: []
      });
    });
  });
}); 