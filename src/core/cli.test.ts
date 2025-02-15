import { program } from 'commander';
import { options } from './cli';

describe('CLI Argument Parsing', () => {
    it('should parse directory argument', () => {
        process.argv = ['node', 'script.js', '/test/dir'];
        program.parse(process.argv);
        expect(options.dir).toBe('/test/dir');
    });

    it('should parse archetype option', () => {
        process.argv = ['node', 'script.js', '--archetype', 'test-archetype'];
        program.parse(process.argv);
        expect(options.archetype).toBe('test-archetype');
    });

    it('should parse configServer option', () => {
        process.argv = ['node', 'script.js', '--configServer', 'http://localhost:8888'];
        program.parse(process.argv);
        expect(options.configServer).toBe('http://localhost:8888');
    });

    it('should handle invalid paths gracefully', () => {
        process.argv = ['node', 'script.js', '--dir', '../invalid/path'];
        expect(() => program.parse(process.argv)).toThrow();
    });
});
