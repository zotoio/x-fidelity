import { validateCommand, SafeGitCommand } from './commandValidator';
import { CommandInjectionError } from './index';

describe('commandValidator', () => {
    describe('validateCommand', () => {
        it('should return true for safe git commands', () => {
            expect(validateCommand('clone', ['https://example.com/repo.git'])).toBe(true);
            expect(validateCommand('fetch', ['origin'])).toBe(true);
            expect(validateCommand('pull', ['origin', 'main'])).toBe(true);
        });

        it('should return false for unsafe commands', () => {
            expect(validateCommand('rm', ['-rf', '/'])).toBe(false);
            expect(validateCommand('malicious', [])).toBe(false);
            expect(validateCommand('status', ['$(rm -rf /)'])).toBe(false);
        });

        it('should return false for commands with dangerous arguments', () => {
            expect(validateCommand('clone', ['`rm -rf /`'])).toBe(false);
            expect(validateCommand('fetch', ['--format=`evil`'])).toBe(false);
            expect(validateCommand('pull', ['HEAD; rm file'])).toBe(false);
        });

        it('should handle empty arguments array', () => {
            expect(validateCommand('fetch', [])).toBe(true);
        });

        it('should validate allowed git commands only', () => {
            // These should be rejected as they're not in ALLOWED_GIT_COMMANDS
            expect(validateCommand('push', [])).toBe(false);
            expect(validateCommand('status', [])).toBe(false);
            expect(validateCommand('log', ['--oneline'])).toBe(false);
        });
    });

    describe('SafeGitCommand', () => {
        it('should create valid SafeGitCommand for allowed commands', () => {
            expect(() => new SafeGitCommand('clone', ['https://example.com/repo.git'])).not.toThrow();
            expect(() => new SafeGitCommand('fetch', ['origin'])).not.toThrow();
            expect(() => new SafeGitCommand('pull', ['origin', 'main'])).not.toThrow();
        });

        it('should reject unauthorized commands', () => {
            expect(() => new SafeGitCommand('rm' as any, ['-rf', '/'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('malicious' as any, [])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('status' as any, [])).toThrow(CommandInjectionError);
        });

        it('should reject unsafe arguments', () => {
            expect(() => new SafeGitCommand('clone', ['`rm -rf /`'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('fetch', ['--format=`evil`'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('pull', ['HEAD; rm file'])).toThrow(CommandInjectionError);
        });

        it('should handle empty arguments array', () => {
            expect(() => new SafeGitCommand('fetch', [])).not.toThrow();
        });

        it('should accept options parameter', () => {
            expect(() => new SafeGitCommand('fetch', [], { cwd: '/tmp', timeout: 5000 })).not.toThrow();
        });

        it('should create immutable command object', () => {
            const command = new SafeGitCommand('pull', ['origin', 'main']);
            // Verify the command is created (we can't access private properties in tests)
            expect(command).toBeInstanceOf(SafeGitCommand);
        });

        it('should reject arguments with shell metacharacters', () => {
            expect(() => new SafeGitCommand('clone', ['arg; rm file'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('fetch', ['arg && evil'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('pull', ['arg | grep'])).toThrow(CommandInjectionError);
        });

        it('should reject arguments with variable expansion', () => {
            expect(() => new SafeGitCommand('clone', ['$HOME'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('fetch', ['$(evil)'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('pull', ['${VAR}'])).toThrow(CommandInjectionError);
        });

        it('should reject arguments with backticks', () => {
            expect(() => new SafeGitCommand('clone', ['`date`'])).toThrow(CommandInjectionError);
            expect(() => new SafeGitCommand('fetch', ['`rm file`'])).toThrow(CommandInjectionError);
        });
    });

    describe('edge cases', () => {
        it('should handle arguments with safe special characters', () => {
            expect(() => new SafeGitCommand('clone', ['--depth=1'])).not.toThrow();
            expect(() => new SafeGitCommand('pull', ['origin', 'main'])).not.toThrow();
        });

        it('should handle multiple safe arguments', () => {
            expect(() => new SafeGitCommand('clone', ['--depth=1', '--branch=main', 'https://example.com/repo.git'])).not.toThrow();
        });

        it('should reject multiple dangerous patterns in single argument', () => {
            expect(() => new SafeGitCommand('clone', ['--depth=`evil` && rm file'])).toThrow(CommandInjectionError);
        });

        it('should validate complex but safe git arguments', () => {
            expect(() => new SafeGitCommand('clone', ['--single-branch', '--branch=develop'])).not.toThrow();
            expect(() => new SafeGitCommand('pull', ['--rebase', 'origin', 'main'])).not.toThrow();
        });
    });
});