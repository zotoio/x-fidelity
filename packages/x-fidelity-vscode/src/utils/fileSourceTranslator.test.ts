import * as vscode from 'vscode';
import * as fs from 'fs';
import { FileSourceTranslator } from './fileSourceTranslator';

// Mock modules
jest.mock('fs');
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      {
        uri: {
          fsPath: '/mock/workspace'
        }
      }
    ]
  },
  Uri: {
    file: (path: string) => ({ fsPath: path, toString: () => `file://${path}` })
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileSourceTranslator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('translateFileSourceForDisplay', () => {
    test('should translate REPO_GLOBAL_CHECK to README.md', () => {
      const result =
        FileSourceTranslator.translateFileSourceForDisplay('REPO_GLOBAL_CHECK');
      expect(result).toBe('README.md');
    });

    test('should translate paths ending with REPO_GLOBAL_CHECK to README.md', () => {
      const result = FileSourceTranslator.translateFileSourceForDisplay(
        '/some/path/REPO_GLOBAL_CHECK'
      );
      expect(result).toBe('README.md');
    });

    test('should return original path for non-global check files', () => {
      const result =
        FileSourceTranslator.translateFileSourceForDisplay('src/index.ts');
      expect(result).toBe('src/index.ts');
    });
  });

  describe('getDisplayName', () => {
    test('should return README.md for REPO_GLOBAL_CHECK', () => {
      const result = FileSourceTranslator.getDisplayName('REPO_GLOBAL_CHECK');
      expect(result).toBe('README.md');
    });

    test('should return basename for regular files', () => {
      const result = FileSourceTranslator.getDisplayName(
        'src/components/Button.tsx'
      );
      expect(result).toBe('Button.tsx');
    });
  });

  describe('isGlobalCheck', () => {
    test('should return true for REPO_GLOBAL_CHECK', () => {
      expect(FileSourceTranslator.isGlobalCheck('REPO_GLOBAL_CHECK')).toBe(
        true
      );
    });

    test('should return true for paths ending with REPO_GLOBAL_CHECK', () => {
      expect(
        FileSourceTranslator.isGlobalCheck('/some/path/REPO_GLOBAL_CHECK')
      ).toBe(true);
    });

    test('should return false for regular files', () => {
      expect(FileSourceTranslator.isGlobalCheck('src/index.ts')).toBe(false);
    });
  });

  describe('resolveFileUri', () => {
    test('should resolve REPO_GLOBAL_CHECK to README.md when it exists', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path.toString() === '/mock/workspace/README.md';
      });

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');

      expect(result).toEqual({
        fsPath: '/mock/workspace/README.md',
        toString: expect.any(Function)
      });
    });

    test('should fallback to other files when README.md does not exist', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path.toString() === '/mock/workspace/package.json';
      });

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');

      expect(result).toEqual({
        fsPath: '/mock/workspace/package.json',
        toString: expect.any(Function)
      });
    });

    test('should resolve regular relative paths', async () => {
      const result = await FileSourceTranslator.resolveFileUri('src/index.ts');

      expect(result).toEqual({
        fsPath: '/mock/workspace/src/index.ts',
        toString: expect.any(Function)
      });
    });

    test('should resolve absolute paths', async () => {
      const result = await FileSourceTranslator.resolveFileUri(
        '/absolute/path/file.ts'
      );

      expect(result).toEqual({
        fsPath: '/absolute/path/file.ts',
        toString: expect.any(Function)
      });
    });

    test('should return null for invalid input', async () => {
      const result = await FileSourceTranslator.resolveFileUri('');
      expect(result).toBeNull();
    });

    test('should return null when no workspace folder is available', async () => {
      (vscode.workspace as any).workspaceFolders = null;

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');
      expect(result).toBeNull();
    });
  });
});
