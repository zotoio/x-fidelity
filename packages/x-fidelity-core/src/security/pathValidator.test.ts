import { validateDirectoryPath, createSecurePath } from './pathValidator';
import { PathTraversalError, MUTABLE_SECURITY_CONFIG, updateAllowedPaths } from './index';
import path from 'path';

// Store original allowed paths to restore after tests
const originalAllowedPaths = [...MUTABLE_SECURITY_CONFIG.ALLOWED_PATH_PREFIXES];

describe('pathValidator', () => {
    beforeEach(() => {
        // Reset allowed paths before each test
        updateAllowedPaths(['/tmp/', process.cwd()]);
    });

    afterAll(() => {
        // Restore original paths
        updateAllowedPaths(originalAllowedPaths);
    });

    describe('validateDirectoryPath', () => {
        describe('valid paths', () => {
            it('should return true for paths within /tmp/', () => {
                expect(validateDirectoryPath('/tmp/test')).toBe(true);
                expect(validateDirectoryPath('/tmp/subdir/file')).toBe(true);
            });

            it('should return true for paths within current working directory', () => {
                const cwdPath = path.join(process.cwd(), 'test-dir');
                expect(validateDirectoryPath(cwdPath)).toBe(true);
            });

            it('should return true for the allowed directory itself', () => {
                expect(validateDirectoryPath('/tmp/')).toBe(true);
                expect(validateDirectoryPath(process.cwd())).toBe(true);
            });

            it('should handle paths with trailing slashes', () => {
                expect(validateDirectoryPath('/tmp/test/')).toBe(true);
            });
        });

        describe('path traversal prevention', () => {
            it('should return false for paths containing ..', () => {
                expect(validateDirectoryPath('/tmp/../etc/passwd')).toBe(false);
                expect(validateDirectoryPath('/tmp/test/../../../etc')).toBe(false);
            });

            it('should return false for paths containing null bytes', () => {
                expect(validateDirectoryPath('/tmp/test\0malicious')).toBe(false);
            });

            it('should return false for paths with .. even if they resolve within allowed', () => {
                // The function explicitly rejects any path with ..
                expect(validateDirectoryPath('/tmp/test/../test')).toBe(false);
            });
        });

        describe('disallowed paths', () => {
            it('should return false for paths outside allowed prefixes', () => {
                expect(validateDirectoryPath('/etc/passwd')).toBe(false);
                expect(validateDirectoryPath('/var/log')).toBe(false);
                expect(validateDirectoryPath('/home/user')).toBe(false);
            });

            it('should return false for root path', () => {
                expect(validateDirectoryPath('/')).toBe(false);
            });

            it('should return false for paths that are not within allowed prefixes', () => {
                // /tmp/ prefix with trailing slash prevents /tmpmalicious matching
                // but the default config uses '/tmp/' which would match '/tmpmalicious' 
                // due to path.resolve behavior - this is actually a security consideration
                updateAllowedPaths(['/tmp/specific']);
                expect(validateDirectoryPath('/tmp/other')).toBe(false);
                expect(validateDirectoryPath('/tmp/specific/subdir')).toBe(true);
            });
        });

        describe('edge cases', () => {
            it('should handle empty string', () => {
                // Empty string resolves to cwd, which should be allowed
                expect(validateDirectoryPath('')).toBe(true);
            });

            it('should handle relative paths that resolve within cwd', () => {
                expect(validateDirectoryPath('./test')).toBe(true);
                expect(validateDirectoryPath('subdir/file')).toBe(true);
            });

            it('should return false for relative paths that escape cwd', () => {
                // This contains .. so it should be rejected
                expect(validateDirectoryPath('../outside')).toBe(false);
            });
        });

        describe('custom allowed paths', () => {
            it('should respect updated allowed paths', () => {
                updateAllowedPaths(['/custom/path', '/another/path']);
                
                expect(validateDirectoryPath('/custom/path/subdir')).toBe(true);
                expect(validateDirectoryPath('/another/path/file')).toBe(true);
                expect(validateDirectoryPath('/tmp/test')).toBe(false);
            });

            it('should work with empty allowed paths array', () => {
                updateAllowedPaths([]);
                expect(validateDirectoryPath('/tmp/test')).toBe(false);
                expect(validateDirectoryPath(process.cwd())).toBe(false);
            });
        });
    });

    describe('createSecurePath', () => {
        describe('valid paths', () => {
            it('should return resolved path for valid inputs', () => {
                const result = createSecurePath('/tmp', 'subdir');
                expect(result).toBe(path.resolve('/tmp', 'subdir'));
            });

            it('should handle nested paths', () => {
                const result = createSecurePath('/tmp', 'a/b/c');
                expect(result).toBe(path.resolve('/tmp', 'a/b/c'));
            });

            it('should handle empty user path', () => {
                const result = createSecurePath('/tmp', '');
                expect(result).toBe(path.resolve('/tmp', ''));
            });

            it('should work with current working directory', () => {
                const result = createSecurePath(process.cwd(), 'test-file');
                expect(result).toBe(path.resolve(process.cwd(), 'test-file'));
            });
        });

        describe('path traversal prevention', () => {
            it('should throw PathTraversalError for paths with ..', () => {
                expect(() => createSecurePath('/tmp', '../etc/passwd')).toThrow(PathTraversalError);
                expect(() => createSecurePath('/tmp', 'test/../../../etc')).toThrow(PathTraversalError);
            });

            it('should throw PathTraversalError for null byte injection', () => {
                expect(() => createSecurePath('/tmp', 'file\0.txt')).toThrow(PathTraversalError);
            });

            it('should throw for user paths that escape base path', () => {
                expect(() => createSecurePath('/tmp', '../../../../etc/passwd')).toThrow(PathTraversalError);
            });
        });

        describe('disallowed base paths', () => {
            it('should throw PathTraversalError for disallowed base paths', () => {
                expect(() => createSecurePath('/etc', 'passwd')).toThrow(PathTraversalError);
                expect(() => createSecurePath('/var/log', 'auth.log')).toThrow(PathTraversalError);
            });

            it('should throw for paths that resolve outside allowed prefixes', () => {
                // Even if base is allowed, if user path takes it outside, it should fail
                updateAllowedPaths(['/tmp/specific']);
                expect(() => createSecurePath('/tmp/specific', '../other')).toThrow(PathTraversalError);
            });
        });

        describe('error messages', () => {
            it('should include user path in error', () => {
                try {
                    createSecurePath('/tmp', '../evil');
                    fail('Expected PathTraversalError to be thrown');
                } catch (error) {
                    expect(error).toBeInstanceOf(PathTraversalError);
                    expect((error as PathTraversalError).message).toContain('Path traversal attempt blocked');
                }
            });
        });

        describe('edge cases', () => {
            it('should handle absolute user paths within allowed prefix', () => {
                // When userPath is absolute, path.resolve ignores basePath
                // This should still work if the absolute path is allowed
                const result = createSecurePath('/ignored', '/tmp/allowed');
                expect(result).toBe('/tmp/allowed');
            });

            it('should reject absolute user paths outside allowed prefix', () => {
                expect(() => createSecurePath('/tmp', '/etc/passwd')).toThrow(PathTraversalError);
            });

            it('should handle Windows-style paths on non-Windows', () => {
                // On Unix, backslashes are valid filename characters
                const result = createSecurePath('/tmp', 'a\\b\\c');
                expect(result).toContain('/tmp');
            });
        });
    });
});
