import { missingRequiredFilesFact } from './missingRequiredFiles';
import { FileData } from '@x-fidelity/types';
import { glob } from 'glob';

// Mock dependencies
jest.mock('@x-fidelity/core', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('glob');
jest.mock('path');

const mockGlob = glob as jest.MockedFunction<typeof glob>;

describe('missingRequiredFilesFact', () => {
  let mockParams: any;
  let mockAlmanac: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockParams = {
      requiredFiles: ['README.md', 'package.json', '.gitignore', 'LICENSE'],
      repoPath: '/test/repo'
    };

    mockAlmanac = {
      factValue: jest.fn()
    };

    // Default mock for glob - all files exist
    mockGlob.mockResolvedValue([
      'README.md',
      'package.json',
      '.gitignore',
      'LICENSE',
      'src/index.ts',
      'tests/test.js'
    ]);
  });

  describe('fact definition', () => {
    it('should have correct metadata', () => {
      expect(missingRequiredFilesFact.name).toBe('missingRequiredFiles');
      expect(missingRequiredFilesFact.description).toBe('Checks for required files in the repository');
      expect(missingRequiredFilesFact.type).toBe('global');
      expect(typeof missingRequiredFilesFact.fn).toBe('function');
    });
  });

  describe('fact function execution', () => {
    it('should return no missing files when all required files exist', async () => {
      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 4,
        found: 4
      });

      expect(mockGlob).toHaveBeenCalledWith('**/*', {
        cwd: '/test/repo',
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });
    });

    it('should detect missing files', async () => {
      // Mock that LICENSE is missing
      mockGlob.mockResolvedValue([
        'README.md',
        'package.json',
        '.gitignore',
        'src/index.ts'
      ]);

      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['LICENSE'],
        total: 4,
        found: 3
      });
    });

    it('should detect multiple missing files', async () => {
      // Mock that README.md and LICENSE are missing
      mockGlob.mockResolvedValue([
        'package.json',
        '.gitignore',
        'src/index.ts'
      ]);

      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['README.md', 'LICENSE'],
        total: 4,
        found: 2
      });
    });

    it('should handle case insensitive matching', async () => {
      mockGlob.mockResolvedValue([
        'readme.md', // lowercase
        'PACKAGE.JSON', // uppercase
        '.gitignore',
        'license' // no extension
      ]);

      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 4,
        found: 4
      });
    });

    it('should handle files in subdirectories', async () => {
      const paramsWithSubdirFiles = {
        ...mockParams,
        requiredFiles: ['docs/README.md', 'config/app.json', 'LICENSE']
      };

      mockGlob.mockResolvedValue([
        'docs/README.md',
        'config/app.json',
        'LICENSE',
        'src/index.ts'
      ]);

      const result = await missingRequiredFilesFact.fn(paramsWithSubdirFiles, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 3,
        found: 3
      });
    });

    it('should handle missing subdirectory files', async () => {
      const paramsWithSubdirFiles = {
        ...mockParams,
        requiredFiles: ['docs/README.md', 'config/app.json', 'tests/unit.test.js']
      };

      mockGlob.mockResolvedValue([
        'README.md',
        'config/app.json',
        'src/index.ts'
      ]);

      const result = await missingRequiredFilesFact.fn(paramsWithSubdirFiles, mockAlmanac);

      expect(result).toEqual({
        missing: ['docs/README.md', 'tests/unit.test.js'],
        total: 3,
        found: 1
      });
    });

    it('should use default values when params are missing', async () => {
      const emptyParams = {};

      const result = await missingRequiredFilesFact.fn(emptyParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });

      expect(mockGlob).toHaveBeenCalledWith('**/*', {
        cwd: '.',
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });
    });

    it('should handle empty required files array', async () => {
      const emptyRequiredFiles = {
        requiredFiles: [],
        repoPath: '/test/repo'
      };

      const result = await missingRequiredFilesFact.fn(emptyRequiredFiles, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });
    });

    it('should handle FileData input format', async () => {
      const fileDataParams: FileData = {
        fileName: 'test.ts',
        filePath: '/test/repo/test.ts',
        fileContent: 'test content',
        fileAst: null
      };

      const result = await missingRequiredFilesFact.fn(fileDataParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });
    });

    it('should handle errors gracefully', async () => {
      mockGlob.mockRejectedValue(new Error('File system error'));

      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });

      const { logger } = require('@x-fidelity/core');
      expect(logger.error).toHaveBeenCalledWith('Error in missingRequiredFiles fact:', expect.any(Error));
    });
  });

  describe('file pattern matching', () => {
    it('should match exact file names', async () => {
      const exactParams = {
        requiredFiles: ['package.json', 'tsconfig.json'],
        repoPath: '/test/repo'
      };

      mockGlob.mockResolvedValue([
        'package.json',
        'src/package.json', // Should also match this
        'tsconfig.json'
      ]);

      const result = await missingRequiredFilesFact.fn(exactParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 2,
        found: 2
      });
    });

    it('should match files with path endings', async () => {
      const pathParams = {
        requiredFiles: ['config.json'],
        repoPath: '/test/repo'
      };

      mockGlob.mockResolvedValue([
        'src/config.json',
        'app/settings/config.json',
        'other.json'
      ]);

      const result = await missingRequiredFilesFact.fn(pathParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 1,
        found: 1
      });
    });

    it('should handle special file extensions', async () => {
      const specialParams = {
        requiredFiles: ['.env', '.dockerignore', 'Dockerfile'],
        repoPath: '/test/repo'
      };

      mockGlob.mockResolvedValue([
        '.env',
        '.env.example',
        '.dockerignore',
        'Dockerfile',
        'docker-compose.yml'
      ]);

      const result = await missingRequiredFilesFact.fn(specialParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 3,
        found: 3
      });
    });

    it('should handle complex directory structures', async () => {
      const complexParams = {
        requiredFiles: ['jest.config.js', 'webpack.config.js', 'babel.config.json'],
        repoPath: '/test/complex-repo'
      };

      mockGlob.mockResolvedValue([
        'jest.config.js',
        'config/webpack.config.js',
        'src/components/Component.tsx',
        'tests/setup.js',
        'docs/README.md'
      ]);

      const result = await missingRequiredFilesFact.fn(complexParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['babel.config.json'],
        total: 3,
        found: 2
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null params', async () => {
      const result = await missingRequiredFilesFact.fn(null, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });
    });

    it('should handle undefined params', async () => {
      const result = await missingRequiredFilesFact.fn(undefined, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 0,
        found: 0
      });
    });

    it('should handle very large file lists', async () => {
      const largeFileList = Array(1000).fill(0).map((_, i) => `file${i}.js`);
      const largeParams = {
        requiredFiles: largeFileList,
        repoPath: '/test/repo'
      };

      mockGlob.mockResolvedValue(largeFileList);

      const result = await missingRequiredFilesFact.fn(largeParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 1000,
        found: 1000
      });
    });

    it('should handle files with special characters', async () => {
      const specialParams = {
        requiredFiles: ['特殊文件.txt', 'file with spaces.md', 'file@symbol.json'],
        repoPath: '/test/repo'
      };

      mockGlob.mockResolvedValue([
        '特殊文件.txt',
        'file with spaces.md',
        'file@symbol.json'
      ]);

      const result = await missingRequiredFilesFact.fn(specialParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 3,
        found: 3
      });
    });

    it('should handle empty glob results', async () => {
      mockGlob.mockResolvedValue([]);

      const result = await missingRequiredFilesFact.fn(mockParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['README.md', 'package.json', '.gitignore', 'LICENSE'],
        total: 4,
        found: 0
      });
    });

    it('should handle repo path with trailing slash', async () => {
      const trailingSlashParams = {
        requiredFiles: ['README.md'],
        repoPath: '/test/repo/'
      };

      mockGlob.mockResolvedValue(['README.md']);

      const result = await missingRequiredFilesFact.fn(trailingSlashParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 1,
        found: 1
      });

      expect(mockGlob).toHaveBeenCalledWith('**/*', {
        cwd: '/test/repo/',
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });
    });

    it('should handle relative repo paths', async () => {
      const relativeParams = {
        requiredFiles: ['package.json'],
        repoPath: './my-project'
      };

      mockGlob.mockResolvedValue(['package.json']);

      const result = await missingRequiredFilesFact.fn(relativeParams, mockAlmanac);

      expect(result).toEqual({
        missing: [],
        total: 1,
        found: 1
      });

      expect(mockGlob).toHaveBeenCalledWith('**/*', {
        cwd: './my-project',
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical Node.js project requirements', async () => {
      const nodeProjectParams = {
        requiredFiles: [
          'package.json',
          'package-lock.json',
          'README.md',
          '.gitignore',
          'tsconfig.json',
          'jest.config.js'
        ],
        repoPath: '/test/node-project'
      };

      mockGlob.mockResolvedValue([
        'package.json',
        'package-lock.json',
        'README.md',
        '.gitignore',
        'src/index.ts',
        'tests/index.test.ts'
      ]);

      const result = await missingRequiredFilesFact.fn(nodeProjectParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['tsconfig.json', 'jest.config.js'],
        total: 6,
        found: 4
      });
    });

    it('should handle React project requirements', async () => {
      const reactProjectParams = {
        requiredFiles: [
          'package.json',
          'public/index.html',
          'src/index.tsx',
          'src/App.tsx',
          '.env.example'
        ],
        repoPath: '/test/react-project'
      };

      mockGlob.mockResolvedValue([
        'package.json',
        'public/index.html',
        'public/manifest.json',
        'src/index.tsx',
        'src/App.tsx',
        'src/components/Button.tsx'
      ]);

      const result = await missingRequiredFilesFact.fn(reactProjectParams, mockAlmanac);

      expect(result).toEqual({
        missing: ['.env.example'],
        total: 5,
        found: 4
      });
    });
  });
}); 