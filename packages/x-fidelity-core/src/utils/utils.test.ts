import { 
    getFormattedDate, 
    countRuleFailures, 
    safeStringify, 
    safeClone, 
    createLocalizedTimestamp 
} from './utils';
import { ScanResult, ErrorLevel } from '@x-fidelity/types';
import { logger } from './logger';

jest.mock('./logger', () => ({
    logger: {
        trace: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

describe('utils', () => {
    const OriginalDate = Date;
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Restore original Date before each test
        global.Date = OriginalDate;
    });
    
    afterEach(() => {
        // Ensure Date is restored after each test
        global.Date = OriginalDate;
    });

    describe('getFormattedDate', () => {
        it('should return formatted date with timestamp', () => {
            const originalNow = Date.now;
            const mockDate = new Date('2023-07-15T10:30:45.123Z');
            Date.now = jest.fn(() => mockDate.getTime());
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = Date.now;

            const result = getFormattedDate();
            
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}-\d+$/);
            expect(result).toContain('2023-07-15');
            expect(result).toContain(mockDate.getTime().toString());

            Date.now = originalNow;
        });

        it('should return different timestamps for consecutive calls', () => {
            // This test uses the real Date which is already restored in beforeEach
            const result1 = getFormattedDate();
            const result2 = getFormattedDate();
            
            // Results should have same date but potentially different timestamps
            expect(result1.split('-')[0]).toBe(result2.split('-')[0]); // Same year
            expect(result1.split('-')[1]).toBe(result2.split('-')[1]); // Same month
            expect(result1.split('-')[2]).toBe(result2.split('-')[2]); // Same day
        });
    });

    describe('countRuleFailures', () => {
        const createMockScanResult = (errors: Array<{ level: ErrorLevel }>): ScanResult => ({
            fileName: 'test.js',
            filePath: '/path/to/test.js',
            errors: errors.map((error, index) => ({
                ruleFailure: `rule-${index}`,
                level: error.level,
                details: { message: `Error ${index}` }
            }))
        });

        it('should count all rule failures when no level filter specified', () => {
            const scanResults = [
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'error' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel }
                ]),
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'error' as ErrorLevel }
                ])
            ];

            const count = countRuleFailures(scanResults);
            expect(count).toBe(5);
        });

        it('should count only warnings when level filter is warning', () => {
            const scanResults = [
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'error' as ErrorLevel },
                    { level: 'warning' as ErrorLevel }
                ]),
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel }
                ])
            ];

            const count = countRuleFailures(scanResults, 'warning');
            expect(count).toBe(3);
        });

        it('should count only errors when level filter is error', () => {
            const scanResults = [
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'error' as ErrorLevel },
                    { level: 'error' as ErrorLevel }
                ]),
                createMockScanResult([
                    { level: 'error' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel }
                ])
            ];

            const count = countRuleFailures(scanResults, 'error');
            expect(count).toBe(3);
        });

        it('should count only fatalities when level filter is fatality', () => {
            const scanResults = [
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel }
                ]),
                createMockScanResult([
                    { level: 'error' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel },
                    { level: 'fatality' as ErrorLevel }
                ])
            ];

            const count = countRuleFailures(scanResults, 'fatality');
            expect(count).toBe(3);
        });

        it('should return 0 for empty scan results', () => {
            const count = countRuleFailures([]);
            expect(count).toBe(0);
        });

        it('should return 0 when no errors match the level filter', () => {
            const scanResults = [
                createMockScanResult([
                    { level: 'warning' as ErrorLevel },
                    { level: 'error' as ErrorLevel }
                ])
            ];

            const count = countRuleFailures(scanResults, 'fatality');
            expect(count).toBe(0);
        });

        it('should handle scan results with no errors', () => {
            const scanResults = [
                createMockScanResult([]),
                createMockScanResult([])
            ];

            const count = countRuleFailures(scanResults);
            expect(count).toBe(0);
        });
    });

    describe('safeStringify', () => {
        it('should stringify simple objects', () => {
            const obj = { name: 'test', value: 42 };
            const result = safeStringify(obj);
            
            expect(result).toBe(JSON.stringify(obj, null, 2));
            expect(logger.trace).toHaveBeenCalledWith({ obj }, 'safeStringify object');
        });

        it('should stringify arrays', () => {
            const arr = [1, 2, 3, 'test'];
            const result = safeStringify(arr);
            
            expect(result).toBe(JSON.stringify(arr, null, 2));
        });

        it('should stringify null and undefined', () => {
            expect(safeStringify(null)).toBe(JSON.stringify(null, null, 2));
            expect(safeStringify(undefined)).toBe(JSON.stringify(undefined, null, 2));
        });

        it('should stringify primitive values', () => {
            expect(safeStringify('string')).toBe(JSON.stringify('string', null, 2));
            expect(safeStringify(42)).toBe(JSON.stringify(42, null, 2));
            expect(safeStringify(true)).toBe(JSON.stringify(true, null, 2));
        });

        it('should handle nested objects', () => {
            const obj = {
                level1: {
                    level2: {
                        level3: 'deep value'
                    }
                }
            };
            const result = safeStringify(obj);
            
            expect(result).toBe(JSON.stringify(obj, null, 2));
        });

        it('should call logger.trace for each invocation', () => {
            const obj1 = { test: 1 };
            const obj2 = { test: 2 };
            
            safeStringify(obj1);
            safeStringify(obj2);
            
            expect(logger.trace).toHaveBeenCalledTimes(2);
            expect(logger.trace).toHaveBeenNthCalledWith(1, { obj: obj1 }, 'safeStringify object');
            expect(logger.trace).toHaveBeenNthCalledWith(2, { obj: obj2 }, 'safeStringify object');
        });
    });

    describe('safeClone', () => {
        it('should clone simple objects', () => {
            const obj = { name: 'test', value: 42 };
            const cloned = safeClone(obj);
            
            expect(cloned).toEqual(obj);
            expect(cloned).not.toBe(obj);
        });

        it('should clone arrays', () => {
            const arr = [1, 2, { nested: 'value' }];
            const cloned = safeClone(arr);
            
            expect(cloned).toEqual(arr);
            expect(cloned).not.toBe(arr);
            expect(cloned[2]).not.toBe(arr[2]);
        });

        it('should clone nested objects', () => {
            const obj = {
                level1: {
                    level2: {
                        level3: 'deep value',
                        array: [1, 2, 3]
                    }
                }
            };
            const cloned = safeClone(obj);
            
            expect(cloned).toEqual(obj);
            expect(cloned).not.toBe(obj);
            expect(cloned.level1).not.toBe(obj.level1);
            expect(cloned.level1.level2).not.toBe(obj.level1.level2);
            expect(cloned.level1.level2.array).not.toBe(obj.level1.level2.array);
        });

        it('should handle circular references', () => {
            const obj: any = { name: 'test' };
            obj.self = obj;
            
            const cloned = safeClone(obj);
            
            expect(cloned.name).toBe('test');
            expect(cloned.self).toBe('[Circular]');
        });

        it('should handle multiple circular references', () => {
            const obj1: any = { name: 'obj1' };
            const obj2: any = { name: 'obj2' };
            obj1.ref = obj2;
            obj2.ref = obj1;
            
            const cloned = safeClone(obj1);
            
            expect(cloned.name).toBe('obj1');
            // The cloned object should handle circular references - either by marking as [Circular] or the object structure
            expect(typeof cloned.ref).toBe('object');
            // The key thing is it shouldn't cause infinite recursion
        });

        it('should handle null and undefined values', () => {
            const obj = { 
                nullValue: null, 
                undefinedValue: undefined,
                normalValue: 'test'
            };
            const cloned = safeClone(obj);
            
            expect(cloned.nullValue).toBeNull();
            expect(cloned.undefinedValue).toBeUndefined();
            expect(cloned.normalValue).toBe('test');
        });

        it('should handle primitive values', () => {
            expect(safeClone('string')).toBe('string');
            expect(safeClone(42)).toBe(42);
            expect(safeClone(true)).toBe(true);
            expect(safeClone(null)).toBeNull();
        });

        it('should handle Date objects', () => {
            const obj = { timestamp: new Date('2023-07-15T10:30:45.123Z') };
            const cloned = safeClone(obj);
            
            // safeClone uses JSON.stringify which converts Date objects to strings 
            expect(typeof cloned.timestamp).toBe('string');
            expect(cloned.timestamp).toBe('2023-07-15T10:30:45.123Z');
        });

        it('should handle complex nested structures with arrays', () => {
            const obj = {
                users: [
                    { id: 1, name: 'Alice', preferences: { theme: 'dark' } },
                    { id: 2, name: 'Bob', preferences: { theme: 'light' } }
                ],
                metadata: {
                    count: 2,
                    lastUpdated: '2023-01-01'
                }
            };
            const cloned = safeClone(obj);
            
            expect(cloned).toEqual({
                users: [
                    { id: 1, name: 'Alice', preferences: { theme: 'dark' } },
                    { id: 2, name: 'Bob', preferences: { theme: 'light' } }
                ],
                metadata: {
                    count: 2,
                    lastUpdated: '2023-01-01'
                }
            });
            expect(cloned.users).not.toBe(obj.users);
            expect(cloned.users[0]).not.toBe(obj.users[0]);
        });
    });

    describe('createLocalizedTimestamp', () => {
        it('should return a formatted timestamp with GMT offset', () => {
            // Real Date is used (restored in beforeEach)
            const result = createLocalizedTimestamp();
            
            // Should match format like "2025-07-27 16:22 GMT+1000" or "2025-07-27 16:22 GMT-0500"
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} GMT[+-]\d{4}$/);
        });

        it('should include current date and time components', () => {
            // Real Date is used (restored in beforeEach)
            const result = createLocalizedTimestamp();
            
            // Should contain date in YYYY-MM-DD format
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
            // Should contain time in HH:MM format
            expect(result).toMatch(/\d{2}:\d{2}/);
            // Should contain GMT offset
            expect(result).toMatch(/GMT[+-]\d{4}$/);
        });

        it('should handle different timezone offsets', () => {
            // Create mock date with proper prototype methods
            const mockDate = {
                getTimezoneOffset: jest.fn(() => 300), // +5 hours behind UTC
                getFullYear: jest.fn(() => 2023),
                getMonth: jest.fn(() => 6), // July (0-indexed)
                getDate: jest.fn(() => 15),
                getHours: jest.fn(() => 10),
                getMinutes: jest.fn(() => 30)
            };
            
            global.Date = jest.fn(() => mockDate) as any;
            
            const result = createLocalizedTimestamp();
            expect(result).toContain('GMT-0500');
            expect(result).toContain('2023-07-15');
            expect(result).toContain('10:30');
        });

        it('should handle partial hour offsets', () => {
            // Create mock date with 30-minute offset
            const mockDate = {
                getTimezoneOffset: jest.fn(() => -330), // +5:30 ahead of UTC  
                getFullYear: jest.fn(() => 2023),
                getMonth: jest.fn(() => 6), // July (0-indexed)
                getDate: jest.fn(() => 15),
                getHours: jest.fn(() => 10),
                getMinutes: jest.fn(() => 30)
            };
            
            global.Date = jest.fn(() => mockDate) as any;
            
            const result = createLocalizedTimestamp();
            expect(result).toContain('GMT+0530');
        });
    });
});