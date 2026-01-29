import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileSourceTranslator } from './fileSourceTranslator';

// Use platform-appropriate mock workspace path
const MOCK_WORKSPACE =
  process.platform === 'win32' ? 'C:\\mock\\workspace' : '/mock/workspace';

// Mock modules
jest.mock('fs');
jest.mock('vscode', () => {
  const mockWorkspace =
    process.platform === 'win32' ? 'C:\\mock\\workspace' : '/mock/workspace';
  return {
    workspace: {
      workspaceFolders: [
        {
          uri: {
            fsPath: mockWorkspace
          }
        }
      ]
    },
    Uri: {
      file: (filePath: string) => ({
        fsPath: filePath,
        toString: () => `file://${filePath}`
      })
    }
  };
});

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
      const expectedReadmePath = path.join(MOCK_WORKSPACE, 'README.md');
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath.toString() === expectedReadmePath;
      });

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');

      expect(result).toEqual({
        fsPath: expectedReadmePath,
        toString: expect.any(Function)
      });
    });

    test('should fallback to other files when README.md does not exist', async () => {
      const expectedPackageJsonPath = path.join(MOCK_WORKSPACE, 'package.json');
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath.toString() === expectedPackageJsonPath;
      });

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');

      expect(result).toEqual({
        fsPath: expectedPackageJsonPath,
        toString: expect.any(Function)
      });
    });

    test('should resolve regular relative paths', async () => {
      const result = await FileSourceTranslator.resolveFileUri('src/index.ts');
      const expectedPath = path.join(MOCK_WORKSPACE, 'src', 'index.ts');

      expect(result).toEqual({
        fsPath: expectedPath,
        toString: expect.any(Function)
      });
    });

    test('should resolve absolute paths', async () => {
      const absolutePath =
        process.platform === 'win32'
          ? 'C:\\absolute\\path\\file.ts'
          : '/absolute/path/file.ts';
      const result = await FileSourceTranslator.resolveFileUri(absolutePath);

      expect(result).toEqual({
        fsPath: absolutePath,
        toString: expect.any(Function)
      });
    });

    test('should return null when no workspace folder is available', async () => {
      (vscode.workspace as any).workspaceFolders = null;

      const result =
        await FileSourceTranslator.resolveFileUri('REPO_GLOBAL_CHECK');
      expect(result).toBeNull();
    });
  });
});
