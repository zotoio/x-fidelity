import { options, setOptions, getOptions, CoreOptions } from './options';

describe('options', () => {
    // Store original options to restore after tests
    let originalOptions: CoreOptions;

    beforeEach(() => {
        // Capture current options state
        originalOptions = getOptions();
    });

    afterEach(() => {
        // Restore original options
        setOptions(originalOptions);
    });

    describe('default options', () => {
        it('should have expected default values', () => {
            const defaultOptions = getOptions();
            
            expect(defaultOptions.archetype).toBe('node-fullstack');
            expect(defaultOptions.jsonTTL).toBe('60');
            expect(defaultOptions.logLevel).toBe('info');
            expect(defaultOptions.telemetryEnabled).toBe(true);
            expect(defaultOptions.openaiEnabled).toBe(false);
            expect(defaultOptions.maxFileSize).toBe(1024 * 1024); // 1MB
            expect(defaultOptions.timeout).toBe(60000); // 60 seconds
            expect(defaultOptions.fileCacheTTL).toBe(60);
            expect(defaultOptions.enableTreeSitterWasm).toBe(true);
            expect(defaultOptions.wasmTimeout).toBe(60000);
            expect(defaultOptions.enableFileLogging).toBe(false);
        });

        it('should have undefined values for optional config paths', () => {
            const defaultOptions = getOptions();
            
            expect(defaultOptions.localConfigPath).toBeUndefined();
            expect(defaultOptions.githubConfigLocation).toBeUndefined();
            expect(defaultOptions.configServer).toBeUndefined();
            expect(defaultOptions.dir).toBeUndefined();
            expect(defaultOptions.telemetryCollector).toBeUndefined();
        });

        it('should have empty array for extraPlugins', () => {
            const defaultOptions = getOptions();
            expect(defaultOptions.extraPlugins).toEqual([]);
        });
    });

    describe('setOptions', () => {
        it('should update options with provided values', () => {
            setOptions({ logLevel: 'debug', telemetryEnabled: false });
            
            const updatedOptions = getOptions();
            expect(updatedOptions.logLevel).toBe('debug');
            expect(updatedOptions.telemetryEnabled).toBe(false);
        });

        it('should preserve existing options when updating partial values', () => {
            const before = getOptions();
            const originalArchetype = before.archetype;
            
            setOptions({ logLevel: 'warn' });
            
            const after = getOptions();
            expect(after.archetype).toBe(originalArchetype);
            expect(after.logLevel).toBe('warn');
        });

        it('should update multiple options at once', () => {
            setOptions({
                archetype: 'java-microservice',
                configServer: 'https://config.example.com',
                port: 8080,
                openaiEnabled: true
            });
            
            const updatedOptions = getOptions();
            expect(updatedOptions.archetype).toBe('java-microservice');
            expect(updatedOptions.configServer).toBe('https://config.example.com');
            expect(updatedOptions.port).toBe(8080);
            expect(updatedOptions.openaiEnabled).toBe(true);
        });

        it('should handle undefined values in update', () => {
            setOptions({ localConfigPath: '/path/to/config' });
            expect(getOptions().localConfigPath).toBe('/path/to/config');
            
            setOptions({ localConfigPath: undefined });
            expect(getOptions().localConfigPath).toBeUndefined();
        });

        it('should update extraPlugins array', () => {
            setOptions({ extraPlugins: ['plugin1', 'plugin2'] });
            expect(getOptions().extraPlugins).toEqual(['plugin1', 'plugin2']);
        });

        it('should update WASM options', () => {
            setOptions({
                enableTreeSitterWasm: false,
                wasmPath: '/custom/wasm/path',
                wasmLanguagesPath: '/custom/languages',
                wasmTimeout: 120000
            });
            
            const updated = getOptions();
            expect(updated.enableTreeSitterWasm).toBe(false);
            expect(updated.wasmPath).toBe('/custom/wasm/path');
            expect(updated.wasmLanguagesPath).toBe('/custom/languages');
            expect(updated.wasmTimeout).toBe(120000);
        });

        it('should update config set options', () => {
            setOptions({
                writeConfigSet: 'my-config-set',
                readConfigSet: 'another-config-set',
                outputFormat: 'json',
                outputFile: 'output.json'
            });
            
            const updated = getOptions();
            expect(updated.writeConfigSet).toBe('my-config-set');
            expect(updated.readConfigSet).toBe('another-config-set');
            expect(updated.outputFormat).toBe('json');
            expect(updated.outputFile).toBe('output.json');
        });

        it('should update zapFiles array', () => {
            setOptions({ zapFiles: ['zap1.json', 'zap2.json'] });
            expect(getOptions().zapFiles).toEqual(['zap1.json', 'zap2.json']);
        });
    });

    describe('getOptions', () => {
        it('should return a copy of options, not the original reference', () => {
            const options1 = getOptions();
            const options2 = getOptions();
            
            // Should be equal but not the same reference
            expect(options1).toEqual(options2);
            expect(options1).not.toBe(options2);
        });

        it('should not allow modification of internal options through returned object', () => {
            const retrieved = getOptions();
            retrieved.logLevel = 'error';
            
            const freshRetrieve = getOptions();
            // Original should be unchanged
            expect(freshRetrieve.logLevel).not.toBe('error');
        });
    });

    describe('mode handling', () => {
        it('should accept valid execution modes', () => {
            setOptions({ mode: 'cli' });
            expect(getOptions().mode).toBe('cli');
            
            setOptions({ mode: 'vscode' });
            expect(getOptions().mode).toBe('vscode');
            
            setOptions({ mode: 'server' });
            expect(getOptions().mode).toBe('server');
        });

        it('should disable worker in cli mode by default', () => {
            setOptions({ mode: 'cli', enableTreeSitterWorker: true });
            
            // Worker should be disabled in cli mode
            const updated = getOptions();
            expect(updated.enableTreeSitterWorker).toBe(false);
        });

        it('should disable worker in vscode mode by default', () => {
            setOptions({ mode: 'vscode', enableTreeSitterWorker: true });
            
            // Worker should be disabled in vscode mode
            const updated = getOptions();
            expect(updated.enableTreeSitterWorker).toBe(false);
        });
    });

    describe('type safety', () => {
        it('should accept valid log levels', () => {
            const validLevels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
            
            for (const level of validLevels) {
                setOptions({ logLevel: level });
                expect(getOptions().logLevel).toBe(level);
            }
        });

        it('should accept boolean values for feature flags', () => {
            setOptions({
                openaiEnabled: true,
                telemetryEnabled: false,
                enableTreeSitterWorker: false,
                enableTreeSitterWasm: true,
                enableFileLogging: true,
                examine: true
            });
            
            const updated = getOptions();
            expect(updated.openaiEnabled).toBe(true);
            expect(updated.telemetryEnabled).toBe(false);
            expect(updated.enableTreeSitterWasm).toBe(true);
            expect(updated.enableFileLogging).toBe(true);
            expect(updated.examine).toBe(true);
        });

        it('should accept numeric values for timeouts and limits', () => {
            setOptions({
                maxFileSize: 5 * 1024 * 1024,
                timeout: 120000,
                port: 3000,
                fileCacheTTL: 120,
                wasmTimeout: 30000
            });
            
            const updated = getOptions();
            expect(updated.maxFileSize).toBe(5 * 1024 * 1024);
            expect(updated.timeout).toBe(120000);
            expect(updated.port).toBe(3000);
            expect(updated.fileCacheTTL).toBe(120);
            expect(updated.wasmTimeout).toBe(30000);
        });
    });
});
