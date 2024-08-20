import { generateLogPrefix, setLogPrefix, getLogPrefix, resetLogPrefix } from './logger';

describe('Logger utilities', () => {
    describe('generateLogPrefix', () => {
        it('should generate a string of length 8', () => {
            const prefix = generateLogPrefix();
            expect(prefix.length).toBe(8);
        });

        it('should generate unique prefixes', () => {
            const prefix1 = generateLogPrefix();
            const prefix2 = generateLogPrefix();
            expect(prefix1).not.toBe(prefix2);
        });
    });

    describe('setLogPrefix and getLogPrefix', () => {
        it('should set and get the log prefix', () => {
            const testPrefix = 'testPrefix';
            setLogPrefix(testPrefix);
            expect(getLogPrefix()).toBe(testPrefix);
        });
    });

    describe('resetLogPrefix', () => {
        it('should reset the log prefix to a new value', () => {
            const oldPrefix = getLogPrefix();
            resetLogPrefix();
            const newPrefix = getLogPrefix();
            expect(newPrefix).not.toBe(oldPrefix);
            expect(newPrefix.length).toBe(8);
        });
    });
});
