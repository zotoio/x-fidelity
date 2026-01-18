import {
    getLanguageFromPath,
    isSupportedFile,
    getSupportedExtensions,
    getLanguageInfo,
    isExtensionSupported,
    SUPPORTED_LANGUAGES
} from './languageUtils';

describe('languageUtils', () => {
    describe('SUPPORTED_LANGUAGES constant', () => {
        it('should have javascript language info', () => {
            expect(SUPPORTED_LANGUAGES.javascript).toBeDefined();
            expect(SUPPORTED_LANGUAGES.javascript.language).toBe('javascript');
            expect(SUPPORTED_LANGUAGES.javascript.treeSitterLanguage).toBe('javascript');
            expect(SUPPORTED_LANGUAGES.javascript.extensions).toContain('.js');
            expect(SUPPORTED_LANGUAGES.javascript.extensions).toContain('.jsx');
            expect(SUPPORTED_LANGUAGES.javascript.extensions).toContain('.mjs');
            expect(SUPPORTED_LANGUAGES.javascript.extensions).toContain('.cjs');
        });

        it('should have typescript language info', () => {
            expect(SUPPORTED_LANGUAGES.typescript).toBeDefined();
            expect(SUPPORTED_LANGUAGES.typescript.language).toBe('typescript');
            expect(SUPPORTED_LANGUAGES.typescript.treeSitterLanguage).toBe('typescript');
            expect(SUPPORTED_LANGUAGES.typescript.extensions).toContain('.ts');
            expect(SUPPORTED_LANGUAGES.typescript.extensions).toContain('.tsx');
        });
    });

    describe('getLanguageFromPath', () => {
        describe('JavaScript files', () => {
            it('should return javascript for .js files', () => {
                expect(getLanguageFromPath('file.js')).toBe('javascript');
                expect(getLanguageFromPath('/path/to/file.js')).toBe('javascript');
            });

            it('should return javascript for .jsx files', () => {
                expect(getLanguageFromPath('component.jsx')).toBe('javascript');
                expect(getLanguageFromPath('/src/components/Button.jsx')).toBe('javascript');
            });

            it('should return javascript for .mjs files', () => {
                expect(getLanguageFromPath('module.mjs')).toBe('javascript');
            });

            it('should return javascript for .cjs files', () => {
                expect(getLanguageFromPath('config.cjs')).toBe('javascript');
            });
        });

        describe('TypeScript files', () => {
            it('should return typescript for .ts files', () => {
                expect(getLanguageFromPath('file.ts')).toBe('typescript');
                expect(getLanguageFromPath('/src/utils/helper.ts')).toBe('typescript');
            });

            it('should return typescript for .tsx files', () => {
                expect(getLanguageFromPath('component.tsx')).toBe('typescript');
                expect(getLanguageFromPath('/src/components/Button.tsx')).toBe('typescript');
            });
        });

        describe('unsupported files', () => {
            it('should return null for unsupported extensions', () => {
                expect(getLanguageFromPath('file.py')).toBeNull();
                expect(getLanguageFromPath('file.java')).toBeNull();
                expect(getLanguageFromPath('file.rs')).toBeNull();
                expect(getLanguageFromPath('file.go')).toBeNull();
                expect(getLanguageFromPath('file.css')).toBeNull();
                expect(getLanguageFromPath('file.html')).toBeNull();
            });

            it('should return null for files without extension', () => {
                expect(getLanguageFromPath('Makefile')).toBeNull();
                expect(getLanguageFromPath('README')).toBeNull();
            });

            it('should return null for hidden files', () => {
                expect(getLanguageFromPath('.gitignore')).toBeNull();
                expect(getLanguageFromPath('.eslintrc')).toBeNull();
            });
        });

        describe('case sensitivity', () => {
            it('should handle uppercase extensions', () => {
                expect(getLanguageFromPath('file.TS')).toBe('typescript');
                expect(getLanguageFromPath('file.JS')).toBe('javascript');
            });

            it('should handle mixed case extensions', () => {
                expect(getLanguageFromPath('file.Ts')).toBe('typescript');
                expect(getLanguageFromPath('file.Js')).toBe('javascript');
            });
        });
    });

    describe('isSupportedFile', () => {
        it('should return true for supported files', () => {
            expect(isSupportedFile('file.js')).toBe(true);
            expect(isSupportedFile('file.jsx')).toBe(true);
            expect(isSupportedFile('file.ts')).toBe(true);
            expect(isSupportedFile('file.tsx')).toBe(true);
            expect(isSupportedFile('file.mjs')).toBe(true);
            expect(isSupportedFile('file.cjs')).toBe(true);
        });

        it('should return false for unsupported files', () => {
            expect(isSupportedFile('file.py')).toBe(false);
            expect(isSupportedFile('file.java')).toBe(false);
            expect(isSupportedFile('file.css')).toBe(false);
            expect(isSupportedFile('file.json')).toBe(false);
            expect(isSupportedFile('file.md')).toBe(false);
        });

        it('should handle paths with directories', () => {
            expect(isSupportedFile('/src/components/Button.tsx')).toBe(true);
            expect(isSupportedFile('/src/styles/main.css')).toBe(false);
        });
    });

    describe('getSupportedExtensions', () => {
        it('should return all supported extensions', () => {
            const extensions = getSupportedExtensions();
            
            expect(extensions).toContain('.js');
            expect(extensions).toContain('.jsx');
            expect(extensions).toContain('.mjs');
            expect(extensions).toContain('.cjs');
            expect(extensions).toContain('.ts');
            expect(extensions).toContain('.tsx');
        });

        it('should return array of strings', () => {
            const extensions = getSupportedExtensions();
            
            expect(Array.isArray(extensions)).toBe(true);
            extensions.forEach(ext => {
                expect(typeof ext).toBe('string');
                expect(ext.startsWith('.')).toBe(true);
            });
        });

        it('should have at least 6 extensions', () => {
            const extensions = getSupportedExtensions();
            expect(extensions.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('getLanguageInfo', () => {
        it('should return javascript info for javascript', () => {
            const info = getLanguageInfo('javascript');
            
            expect(info).not.toBeNull();
            expect(info?.language).toBe('javascript');
            expect(info?.treeSitterLanguage).toBe('javascript');
            expect(info?.extensions).toContain('.js');
        });

        it('should return typescript info for typescript', () => {
            const info = getLanguageInfo('typescript');
            
            expect(info).not.toBeNull();
            expect(info?.language).toBe('typescript');
            expect(info?.treeSitterLanguage).toBe('typescript');
            expect(info?.extensions).toContain('.ts');
        });

        it('should return null for unknown language', () => {
            expect(getLanguageInfo('python' as any)).toBeNull();
            expect(getLanguageInfo('java' as any)).toBeNull();
        });
    });

    describe('isExtensionSupported', () => {
        it('should return true for supported extensions with dot', () => {
            expect(isExtensionSupported('.js')).toBe(true);
            expect(isExtensionSupported('.jsx')).toBe(true);
            expect(isExtensionSupported('.ts')).toBe(true);
            expect(isExtensionSupported('.tsx')).toBe(true);
            expect(isExtensionSupported('.mjs')).toBe(true);
            expect(isExtensionSupported('.cjs')).toBe(true);
        });

        it('should return true for supported extensions without dot', () => {
            expect(isExtensionSupported('js')).toBe(true);
            expect(isExtensionSupported('jsx')).toBe(true);
            expect(isExtensionSupported('ts')).toBe(true);
            expect(isExtensionSupported('tsx')).toBe(true);
        });

        it('should handle case-insensitive matching', () => {
            expect(isExtensionSupported('.JS')).toBe(true);
            expect(isExtensionSupported('.TS')).toBe(true);
            expect(isExtensionSupported('JS')).toBe(true);
            expect(isExtensionSupported('TS')).toBe(true);
        });

        it('should return false for unsupported extensions', () => {
            expect(isExtensionSupported('.py')).toBe(false);
            expect(isExtensionSupported('.java')).toBe(false);
            expect(isExtensionSupported('.css')).toBe(false);
            expect(isExtensionSupported('py')).toBe(false);
        });
    });
});
