import { effectCleanupFactFn } from './effectCleanupFact';

describe('effectCleanupFact', () => {
  
  describe('basic functionality', () => {
    it('should identify useEffect without cleanup', async () => {
      const mockFiles = [
        {
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          fileContent: `
            import React, { useEffect } from 'react';
            
            const Component = () => {
              useEffect(() => {
                console.log('effect without cleanup');
              }, []);
              
              return <div>Test</div>;
            };
          `,
          fileAst: null
        }
      ];

      const result = await effectCleanupFactFn(mockFiles);
      
      expect(result).toBeDefined();
      expect(result.effectsWithoutCleanup).toHaveLength(1);
      expect(result.effectsWithoutCleanup[0]).toEqual(
        expect.objectContaining({
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          hasCleanup: false
        })
      );
    });

    it('should identify useEffect with cleanup', async () => {
      const mockFiles = [
        {
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          fileContent: `
            import React, { useEffect } from 'react';
            
            const Component = () => {
              useEffect(() => {
                const subscription = subscribe();
                return () => {
                  subscription.unsubscribe();
                };
              }, []);
              
              return <div>Test</div>;
            };
          `,
          fileAst: null
        }
      ];

      const result = await effectCleanupFactFn(mockFiles);
      
      expect(result).toBeDefined();
      expect(result.effectsWithCleanup).toHaveLength(1);
      expect(result.effectsWithCleanup[0]).toEqual(
        expect.objectContaining({
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          hasCleanup: true
        })
      );
    });

    it('should handle files with no useEffect', async () => {
      const mockFiles = [
        {
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          fileContent: `
            import React from 'react';
            
            const Component = () => {
              return <div>Test</div>;
            };
          `,
          fileAst: null
        }
      ];

      const result = await effectCleanupFactFn(mockFiles);
      
      expect(result).toBeDefined();
      expect(result.effectsWithoutCleanup).toHaveLength(0);
      expect(result.effectsWithCleanup).toHaveLength(0);
    });

    it('should handle empty files array', async () => {
      const result = await effectCleanupFactFn([]);
      
      expect(result).toBeDefined();
      expect(result.effectsWithoutCleanup).toHaveLength(0);
      expect(result.effectsWithCleanup).toHaveLength(0);
    });
  });

  describe('complex scenarios', () => {
    it('should identify multiple useEffect hooks in same file', async () => {
      const mockFiles = [
        {
          fileName: 'Component.tsx',
          filePath: '/src/Component.tsx',
          fileContent: `
            import React, { useEffect } from 'react';
            
            const Component = () => {
              useEffect(() => {
                console.log('effect 1 without cleanup');
              }, []);
              
              useEffect(() => {
                const timer = setInterval(() => {}, 1000);
                return () => clearInterval(timer);
              }, []);
              
              useEffect(() => {
                document.title = 'New Title';
              }, []);
              
              return <div>Test</div>;
            };
          `,
          fileAst: null
        }
      ];

      const result = await effectCleanupFactFn(mockFiles);
      
      expect(result.effectsWithoutCleanup).toHaveLength(2);
      expect(result.effectsWithCleanup).toHaveLength(1);
    });

    it('should handle empty file content', async () => {
      const mockFiles = [
        {
          fileName: 'Empty.tsx',
          filePath: '/src/Empty.tsx',
          fileContent: '',
          fileAst: null
        }
      ];

      const result = await effectCleanupFactFn(mockFiles);
      expect(result.effectsWithoutCleanup).toHaveLength(0);
      expect(result.effectsWithCleanup).toHaveLength(0);
    });
  });
}); 