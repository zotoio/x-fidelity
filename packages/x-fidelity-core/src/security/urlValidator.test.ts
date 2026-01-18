import { createSanitizedUrl, validateUrl, validateUrlAsync } from './urlValidator';

describe('urlValidator', () => {
    describe('createSanitizedUrl', () => {
        describe('valid URLs', () => {
            it('should accept HTTPS URLs to allowed domains', () => {
                expect(createSanitizedUrl('https://api.github.com/repos/owner/repo')).toBe(
                    'https://api.github.com/repos/owner/repo'
                );
                expect(createSanitizedUrl('https://raw.githubusercontent.com/owner/repo/main/file.txt')).toBe(
                    'https://raw.githubusercontent.com/owner/repo/main/file.txt'
                );
                expect(createSanitizedUrl('https://github.com/owner/repo')).toBe(
                    'https://github.com/owner/repo'
                );
            });

            it('should preserve query strings', () => {
                const result = createSanitizedUrl('https://api.github.com/search?q=test&page=1');
                expect(result).toBe('https://api.github.com/search?q=test&page=1');
            });

            it('should strip port numbers and credentials', () => {
                // URL constructor strips credentials, port is removed in reconstruction
                const result = createSanitizedUrl('https://api.github.com:443/path');
                expect(result).toBe('https://api.github.com/path');
            });

            it('should handle URLs with encoded characters', () => {
                const result = createSanitizedUrl('https://api.github.com/path%20with%20spaces');
                expect(result).toBe('https://api.github.com/path%20with%20spaces');
            });
        });

        describe('protocol enforcement', () => {
            it('should reject HTTP URLs (non-HTTPS)', () => {
                expect(() => createSanitizedUrl('http://api.github.com/repos'))
                    .toThrow('Only HTTPS allowed');
            });

            it('should reject FTP URLs', () => {
                expect(() => createSanitizedUrl('ftp://api.github.com/file'))
                    .toThrow('Only HTTPS allowed');
            });

            it('should reject file URLs', () => {
                expect(() => createSanitizedUrl('file:///etc/passwd'))
                    .toThrow('Only HTTPS allowed');
            });

            it('should reject javascript URLs', () => {
                expect(() => createSanitizedUrl('javascript:alert(1)'))
                    .toThrow('Only HTTPS allowed');
            });

            it('should reject data URLs', () => {
                expect(() => createSanitizedUrl('data:text/html,<script>evil</script>'))
                    .toThrow('Only HTTPS allowed');
            });
        });

        describe('localhost blocking', () => {
            it('should reject localhost', () => {
                expect(() => createSanitizedUrl('https://localhost/api'))
                    .toThrow('Blocked request to localhost');
            });

            it('should reject 0.0.0.0', () => {
                expect(() => createSanitizedUrl('https://0.0.0.0/api'))
                    .toThrow('Blocked request to localhost');
            });
        });

        describe('private IP blocking', () => {
            it('should reject 10.x.x.x addresses', () => {
                expect(() => createSanitizedUrl('https://10.0.0.1/api'))
                    .toThrow('private IP');
            });

            it('should reject 172.16-31.x.x addresses', () => {
                expect(() => createSanitizedUrl('https://172.16.0.1/api'))
                    .toThrow('private IP');
                expect(() => createSanitizedUrl('https://172.31.255.255/api'))
                    .toThrow('private IP');
            });

            it('should reject 192.168.x.x addresses', () => {
                expect(() => createSanitizedUrl('https://192.168.1.1/api'))
                    .toThrow('private IP');
            });

            it('should reject 127.x.x.x loopback addresses', () => {
                expect(() => createSanitizedUrl('https://127.0.0.1/api'))
                    .toThrow('private IP');
                expect(() => createSanitizedUrl('https://127.0.0.2/api'))
                    .toThrow('private IP');
            });

            it('should reject link-local addresses (169.254.x.x)', () => {
                expect(() => createSanitizedUrl('https://169.254.1.1/api'))
                    .toThrow('private IP');
            });
        });

        describe('domain allowlist', () => {
            it('should reject domains not in allowlist', () => {
                expect(() => createSanitizedUrl('https://evil.com/malicious'))
                    .toThrow('Domain not in allowlist');
            });

            it('should reject subdomains of allowed domains', () => {
                // Subdomains are not automatically allowed
                expect(() => createSanitizedUrl('https://sub.api.github.com/path'))
                    .toThrow('Domain not in allowlist');
            });

            it('should reject similar-looking domains', () => {
                expect(() => createSanitizedUrl('https://api-github.com/path'))
                    .toThrow('Domain not in allowlist');
                expect(() => createSanitizedUrl('https://github.com.evil.com/path'))
                    .toThrow('Domain not in allowlist');
            });
        });

        describe('URL length limits', () => {
            it('should reject URLs exceeding maximum length', () => {
                const longPath = 'a'.repeat(3000);
                expect(() => createSanitizedUrl(`https://api.github.com/${longPath}`))
                    .toThrow('URL too long');
            });
        });

        describe('invalid URL formats', () => {
            it('should reject malformed URLs', () => {
                expect(() => createSanitizedUrl('not-a-url')).toThrow('Invalid URL format');
                expect(() => createSanitizedUrl('://missing-protocol')).toThrow('Invalid URL format');
                expect(() => createSanitizedUrl('')).toThrow('Invalid URL format');
            });

            it('should reject URLs with only protocol', () => {
                expect(() => createSanitizedUrl('https://')).toThrow('Invalid URL format');
            });
        });
    });

    describe('validateUrl (synchronous)', () => {
        describe('valid URLs', () => {
            it('should return true for valid HTTPS GitHub URLs', () => {
                expect(validateUrl('https://api.github.com/repos/owner/repo')).toBe(true);
                expect(validateUrl('https://raw.githubusercontent.com/file')).toBe(true);
                expect(validateUrl('https://github.com/owner/repo')).toBe(true);
            });

            it('should return true for URLs with allowed subdomains', () => {
                // validateUrl allows subdomains ending with allowed domains
                expect(validateUrl('https://api.github.com/path')).toBe(true);
            });
        });

        describe('protocol checks', () => {
            it('should return false for HTTP URLs', () => {
                expect(validateUrl('http://api.github.com/repos')).toBe(false);
            });

            it('should return false for non-HTTP protocols', () => {
                expect(validateUrl('ftp://github.com/file')).toBe(false);
                expect(validateUrl('file:///etc/passwd')).toBe(false);
            });
        });

        describe('domain checks', () => {
            it('should return false for non-allowlisted domains', () => {
                expect(validateUrl('https://evil.com/path')).toBe(false);
                expect(validateUrl('https://google.com/path')).toBe(false);
            });
        });

        describe('private IP checks', () => {
            it('should return false for private IPs', () => {
                expect(validateUrl('https://10.0.0.1/api')).toBe(false);
                expect(validateUrl('https://192.168.1.1/api')).toBe(false);
                expect(validateUrl('https://127.0.0.1/api')).toBe(false);
            });

            it('should return false for localhost', () => {
                expect(validateUrl('https://localhost/api')).toBe(false);
                expect(validateUrl('https://0.0.0.0/api')).toBe(false);
            });
        });

        describe('invalid URLs', () => {
            it('should return false for malformed URLs', () => {
                expect(validateUrl('not-a-url')).toBe(false);
                expect(validateUrl('')).toBe(false);
                expect(validateUrl('://missing-protocol')).toBe(false);
            });
        });
    });

    describe('validateUrlAsync', () => {
        describe('valid URLs', () => {
            it('should resolve to true for valid HTTPS GitHub URLs', async () => {
                await expect(validateUrlAsync('https://api.github.com/repos')).resolves.toBe(true);
                await expect(validateUrlAsync('https://github.com/owner/repo')).resolves.toBe(true);
            });
        });

        describe('protocol checks', () => {
            it('should resolve to false for HTTP URLs', async () => {
                await expect(validateUrlAsync('http://api.github.com/repos')).resolves.toBe(false);
            });

            it('should resolve to false for non-HTTP protocols', async () => {
                await expect(validateUrlAsync('ftp://github.com/file')).resolves.toBe(false);
            });
        });

        describe('domain checks', () => {
            it('should resolve to false for non-allowlisted domains', async () => {
                await expect(validateUrlAsync('https://evil.com/path')).resolves.toBe(false);
            });
        });

        describe('private IP checks', () => {
            it('should resolve to false for private IPs', async () => {
                await expect(validateUrlAsync('https://10.0.0.1/api')).resolves.toBe(false);
                await expect(validateUrlAsync('https://192.168.1.1/api')).resolves.toBe(false);
            });

            it('should resolve to false for localhost', async () => {
                await expect(validateUrlAsync('https://localhost/api')).resolves.toBe(false);
            });
        });

        describe('invalid URLs', () => {
            it('should resolve to false for malformed URLs', async () => {
                await expect(validateUrlAsync('not-a-url')).resolves.toBe(false);
                await expect(validateUrlAsync('')).resolves.toBe(false);
            });
        });

        describe('DNS validation', () => {
            // Note: In test environment, DNS resolution is skipped
            it('should pass DNS validation in test environment', async () => {
                // Since NODE_ENV is 'test', DNS validation is skipped
                await expect(validateUrlAsync('https://api.github.com/repos')).resolves.toBe(true);
            });
        });
    });

    describe('SSRF attack vectors', () => {
        it('should block DNS rebinding attempts via redirect', () => {
            // We prevent redirects in the secure client, but validate here too
            expect(() => createSanitizedUrl('https://evil.com/redirect?to=http://localhost'))
                .toThrow('Domain not in allowlist');
        });

        it('should block URL encoding bypass attempts', () => {
            // URL-encoded localhost: %6c%6f%63%61%6c%68%6f%73%74
            // The URL parser normalizes this
            expect(validateUrl('https://%6c%6f%63%61%6c%68%6f%73%74/api')).toBe(false);
        });

        it('should block IPv6 addresses', () => {
            // IPv6 localhost
            expect(validateUrl('https://[::1]/api')).toBe(false);
        });

        it('should block URL shorteners pointing to internal services', () => {
            expect(() => createSanitizedUrl('https://bit.ly/internal'))
                .toThrow('Domain not in allowlist');
        });

        it('should block credentials in URL', () => {
            // Credentials in URL could be used for attacks
            // The sanitizer strips credentials during reconstruction
            const result = createSanitizedUrl('https://user:pass@api.github.com/path');
            expect(result).toBe('https://api.github.com/path');
            expect(result).not.toContain('user');
            expect(result).not.toContain('pass');
        });
    });
});
