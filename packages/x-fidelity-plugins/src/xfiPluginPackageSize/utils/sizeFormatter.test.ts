/**
 * Tests for Size Formatter Utilities
 *
 * Comprehensive tests for byte formatting, parsing, and breakdown formatting.
 */

import { formatBytes, parseBytes, formatBreakdown } from './sizeFormatter';

describe('sizeFormatter', () => {
    describe('formatBytes', () => {
        it('should format 0 bytes correctly', () => {
            expect(formatBytes({ bytes: 0 })).toBe('0 Bytes');
        });

        it('should format small byte values', () => {
            expect(formatBytes({ bytes: 1 })).toBe('1 Bytes');
            expect(formatBytes({ bytes: 100 })).toBe('100 Bytes');
            expect(formatBytes({ bytes: 512 })).toBe('512 Bytes');
            expect(formatBytes({ bytes: 1023 })).toBe('1023 Bytes');
        });

        it('should format KB values', () => {
            expect(formatBytes({ bytes: 1024 })).toBe('1 KB');
            expect(formatBytes({ bytes: 1536 })).toBe('1.5 KB');
            expect(formatBytes({ bytes: 10240 })).toBe('10 KB');
            expect(formatBytes({ bytes: 1024 * 1023 })).toBe('1023 KB');
        });

        it('should format MB values', () => {
            expect(formatBytes({ bytes: 1024 * 1024 })).toBe('1 MB');
            expect(formatBytes({ bytes: 1024 * 1024 * 1.5 })).toBe('1.5 MB');
            expect(formatBytes({ bytes: 1024 * 1024 * 100 })).toBe('100 MB');
        });

        it('should format GB values', () => {
            expect(formatBytes({ bytes: 1024 * 1024 * 1024 })).toBe('1 GB');
            expect(formatBytes({ bytes: 1024 * 1024 * 1024 * 2.5 })).toBe('2.5 GB');
        });

        it('should format TB values', () => {
            expect(formatBytes({ bytes: 1024 * 1024 * 1024 * 1024 })).toBe('1 TB');
            expect(formatBytes({ bytes: 1024 * 1024 * 1024 * 1024 * 5.5 })).toBe('5.5 TB');
        });

        it('should handle very large values (beyond TB)', () => {
            // Values beyond TB should still show as TB
            const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
            expect(formatBytes({ bytes: petabyte })).toBe('1024 TB');
        });

        it('should handle negative values', () => {
            expect(formatBytes({ bytes: -1024 })).toBe('-1 KB');
            expect(formatBytes({ bytes: -1024 * 1024 })).toBe('-1 MB');
        });

        it('should respect decimal places parameter', () => {
            expect(formatBytes({ bytes: 1536, decimals: 0 })).toBe('2 KB');
            expect(formatBytes({ bytes: 1536, decimals: 1 })).toBe('1.5 KB');
            expect(formatBytes({ bytes: 1536, decimals: 3 })).toBe('1.5 KB');
            expect(formatBytes({ bytes: 1234567, decimals: 3 })).toBe('1.177 MB');
        });

        it('should handle fractional bytes by rounding', () => {
            expect(formatBytes({ bytes: 1.5 })).toBe('1.5 Bytes');
            expect(formatBytes({ bytes: 0.5 })).toBe('0.5 Bytes');
        });
    });

    describe('parseBytes', () => {
        it('should parse Byte values', () => {
            expect(parseBytes({ sizeStr: '0 Bytes' })).toBe(0);
            expect(parseBytes({ sizeStr: '1 Byte' })).toBe(1);
            expect(parseBytes({ sizeStr: '100 Bytes' })).toBe(100);
            expect(parseBytes({ sizeStr: '512 BYTES' })).toBe(512);
        });

        it('should parse KB values', () => {
            expect(parseBytes({ sizeStr: '1 KB' })).toBe(1024);
            expect(parseBytes({ sizeStr: '1.5 KB' })).toBe(1536);
            expect(parseBytes({ sizeStr: '10 kb' })).toBe(10240);
        });

        it('should parse MB values', () => {
            expect(parseBytes({ sizeStr: '1 MB' })).toBe(1024 * 1024);
            expect(parseBytes({ sizeStr: '1.5 MB' })).toBe(Math.round(1024 * 1024 * 1.5));
            expect(parseBytes({ sizeStr: '100 mb' })).toBe(1024 * 1024 * 100);
        });

        it('should parse GB values', () => {
            expect(parseBytes({ sizeStr: '1 GB' })).toBe(1024 * 1024 * 1024);
            expect(parseBytes({ sizeStr: '2.5 GB' })).toBe(Math.round(1024 * 1024 * 1024 * 2.5));
        });

        it('should parse TB values', () => {
            expect(parseBytes({ sizeStr: '1 TB' })).toBe(1024 * 1024 * 1024 * 1024);
            expect(parseBytes({ sizeStr: '2 TB' })).toBe(1024 * 1024 * 1024 * 1024 * 2);
        });

        it('should be case insensitive', () => {
            expect(parseBytes({ sizeStr: '1 kb' })).toBe(1024);
            expect(parseBytes({ sizeStr: '1 Kb' })).toBe(1024);
            expect(parseBytes({ sizeStr: '1 KB' })).toBe(1024);
            expect(parseBytes({ sizeStr: '1 kB' })).toBe(1024);
        });

        it('should handle whitespace', () => {
            expect(parseBytes({ sizeStr: '  1 KB  ' })).toBe(1024);
            expect(parseBytes({ sizeStr: '1  KB' })).toBe(1024);
        });

        it('should throw on invalid size strings', () => {
            expect(() => parseBytes({ sizeStr: '' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: 'invalid' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: '1' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: 'KB' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: '1 XB' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: '-1 KB' })).toThrow('Invalid size string');
        });
        
        it('should throw when regex matches but parseFloat returns NaN', () => {
            // The regex [\d.]+ can match just "." which parseFloat returns NaN for
            expect(() => parseBytes({ sizeStr: '. KB' })).toThrow('Invalid size string');
            // Just dots also result in NaN
            expect(() => parseBytes({ sizeStr: '.. KB' })).toThrow('Invalid size string');
            expect(() => parseBytes({ sizeStr: '... MB' })).toThrow('Invalid size string');
        });

        it('should handle decimal values', () => {
            expect(parseBytes({ sizeStr: '1.5 KB' })).toBe(1536);
            expect(parseBytes({ sizeStr: '0.5 MB' })).toBe(Math.round(1024 * 1024 * 0.5));
        });
    });

    describe('formatBreakdown', () => {
        it('should return empty string for empty breakdown', () => {
            expect(formatBreakdown({ breakdown: {} })).toBe('');
        });

        it('should format single entry', () => {
            const breakdown = { '.ts': 1024 };
            expect(formatBreakdown({ breakdown })).toBe('.ts: 1 KB');
        });

        it('should format multiple entries sorted by size descending', () => {
            const breakdown = {
                '.ts': 1024,
                '.json': 2048,
                '.md': 512
            };
            expect(formatBreakdown({ breakdown })).toBe('.json: 2 KB, .ts: 1 KB, .md: 512 Bytes');
        });

        it('should respect limit parameter', () => {
            const breakdown = {
                '.ts': 5000,
                '.json': 4000,
                '.md': 3000,
                '.yml': 2000,
                '.txt': 1000,
                '.css': 500
            };
            expect(formatBreakdown({ breakdown, limit: 3 })).toBe('.ts: 4.88 KB, .json: 3.91 KB, .md: 2.93 KB');
            expect(formatBreakdown({ breakdown, limit: 1 })).toBe('.ts: 4.88 KB');
        });

        it('should handle limit larger than entries', () => {
            const breakdown = {
                '.ts': 1024,
                '.json': 2048
            };
            expect(formatBreakdown({ breakdown, limit: 10 })).toBe('.json: 2 KB, .ts: 1 KB');
        });

        it('should use default limit of 5', () => {
            const breakdown = {
                a: 7000,
                b: 6000,
                c: 5000,
                d: 4000,
                e: 3000,
                f: 2000,
                g: 1000
            };
            const result = formatBreakdown({ breakdown });
            const parts = result.split(', ');
            expect(parts.length).toBe(5);
        });

        it('should handle entries with same size', () => {
            const breakdown = {
                '.ts': 1024,
                '.js': 1024
            };
            const result = formatBreakdown({ breakdown });
            expect(result).toContain('.ts: 1 KB');
            expect(result).toContain('.js: 1 KB');
        });

        it('should format zero-size entries', () => {
            const breakdown = {
                '.ts': 0,
                '.json': 1024
            };
            expect(formatBreakdown({ breakdown })).toBe('.json: 1 KB, .ts: 0 Bytes');
        });
    });

    describe('round-trip conversion', () => {
        it('should round-trip common values', () => {
            const values = [0, 1024, 1024 * 1024, 1024 * 1024 * 100];
            for (const original of values) {
                const formatted = formatBytes({ bytes: original });
                const parsed = parseBytes({ sizeStr: formatted });
                expect(parsed).toBe(original);
            }
        });

        it('should approximate round-trip for fractional values', () => {
            // Due to rounding in parseBytes, fractional values may not round-trip exactly
            const formatted = formatBytes({ bytes: 1536 });
            expect(formatted).toBe('1.5 KB');
            const parsed = parseBytes({ sizeStr: formatted });
            expect(parsed).toBe(1536);
        });
    });
});
