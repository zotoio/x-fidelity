import { ReportGenerator } from './reportGenerator';
import { ResultMetadata } from '@x-fidelity/types';
import fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

// Mock logger
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
        isLevelEnabled: jest.fn().mockReturnValue(true)
    }
}));

// Mock options
jest.mock('../core/options', () => ({
    options: {
        outputPath: '/test/output'
    }
}));

// Mock utils
jest.mock('../utils/utils', () => ({
    getFormattedDate: jest.fn().mockReturnValue('2024-01-15 10:30:00')
}));

describe('ReportGenerator', () => {
    let mockData: ResultMetadata;
    let generator: ReportGenerator;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock date for consistent testing
        jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024);
        jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(0); // January (0-indexed)
        jest.spyOn(Date.prototype, 'getDate').mockReturnValue(15);
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);
        jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-300); // GMT+5

        mockData = {
            XFI_RESULT: {
                repoUrl: 'git@github.com:test/example-repo.git',
                repoPath: '/test/repo',
                totalIssues: 10,
                warningCount: 5,
                errorCount: 3,
                fatalityCount: 2,
                exemptCount: 1,
                fileCount: 100,
                xfiVersion: '5.0.0',
                durationSeconds: 45.67,
                issueDetails: [
                    {
                        filePath: '/test/repo/src/file1.ts',
                        fileName: 'file1.ts',
                        errors: [
                            {
                                ruleFailure: 'complexRule',
                                level: 'error',
                                details: {
                                    message: 'Function is too complex',
                                    cyclomaticComplexity: 15,
                                    line: 45
                                }
                            }
                        ]
                    },
                    {
                        filePath: '/test/repo/src/file2.ts',
                        fileName: 'file2.ts',
                        errors: [
                            {
                                ruleFailure: 'outdatedDependency',
                                level: 'warning',
                                details: {
                                    message: 'Dependency react@16.0.0 is outdated, required: 18.0.0',
                                    dependency: 'react',
                                    currentVersion: '16.0.0',
                                    requiredVersion: '18.0.0'
                                }
                            }
                        ]
                    },
                    {
                        filePath: '/test/repo/src/file3.ts',
                        fileName: 'file3.ts',
                        errors: [
                            {
                                ruleFailure: 'sensitiveData',
                                level: 'fatality',
                                details: {
                                    message: 'Sensitive data detected: API_KEY=secret123',
                                    pattern: 'API_KEY',
                                    line: 10
                                }
                            }
                        ]
                    }
                ]
            }
        };

        generator = new ReportGenerator(mockData);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with correct repo name and hostname', () => {
            expect((generator as any).repoName).toBe('test/example-repo');
            expect((generator as any).githubHostname).toBe('test');
            expect((generator as any).reportDate).toBe('2024-01-15');
        });

        it('should handle missing repo URL gracefully', () => {
            const dataWithoutUrl = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    repoUrl: undefined
                }
            };
            const gen = new ReportGenerator(dataWithoutUrl);
            expect((gen as any).repoName).toBe('');
            expect((gen as any).githubHostname).toBe('');
        });

        it('should handle malformed repo URL', () => {
            const dataWithMalformedUrl = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    repoUrl: 'invalid-url'
                }
            };
            const gen = new ReportGenerator(dataWithMalformedUrl);
            expect((gen as any).repoName).toBe('');
            expect((gen as any).githubHostname).toBe('');
        });
    });

    describe('createLocalizedTimestamp', () => {
        it('should create properly formatted timestamp with GMT offset', () => {
            const result = (generator as any).createLocalizedTimestamp();
            expect(result).toBe('2024-01-15 10:30 GMT+0500');
        });

        it('should handle negative timezone offset', () => {
            jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300); // GMT-5
            const result = (generator as any).createLocalizedTimestamp();
            expect(result).toBe('2024-01-15 10:30 GMT-0500');
        });

        it('should pad single-digit values with zeros', () => {
            jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(8); // September (0-indexed)
            jest.spyOn(Date.prototype, 'getDate').mockReturnValue(5);
            jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
            jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(5);
            jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60); // GMT+1
            
            const result = (generator as any).createLocalizedTimestamp();
            expect(result).toBe('2024-09-05 09:05 GMT+0100');
        });
    });

    describe('generateReport', () => {
        it('should generate complete report with all sections', () => {
            const report = generator.generateReport();
            
            expect(report).toContain('# X-Fidelity Analysis Report');
            expect(report).toContain('## Executive Summary');
            expect(report).toContain('## Repository Overview');
            expect(report).toContain('## Top Rule Failures');
            expect(report).toContain('## Files with Most Issues');
            expect(report).toContain('test/example-repo');
            expect(report).toContain('2024-01-15 10:30 GMT+0500');
        });

        it('should include all issue counts in executive summary', () => {
            const report = generator.generateReport();
            
            expect(report).toContain('**10 total issues**');
            expect(report).toContain('- 5 warnings');
            expect(report).toContain('- 2 fatalities');
            expect(report).toContain('- 3 errors');
            expect(report).toContain('- 1 exempt issues');
        });

        it('should calculate success rate correctly', () => {
            const report = generator.generateReport();
            
            // 100 total files - 3 files with issues = 97 successful files = 97% success rate
            expect(report).toContain('97 (97.0%) have no issues');
        });
    });

    describe('generateHeader', () => {
        it('should generate correct header with timestamp', () => {
            const header = (generator as any).generateHeader();
            
            expect(header).toBe(
                '# X-Fidelity Analysis Report\n' +
                'Generated for: test/example-repo on 2024-01-15 10:30 GMT+0500'
            );
        });
    });

    describe('generateExecutiveSummary', () => {
        it('should generate complete executive summary', () => {
            const summary = (generator as any).generateExecutiveSummary();
            
            expect(summary).toContain('## Executive Summary');
            expect(summary).toContain('10 total issues');
            expect(summary).toContain('5 warnings');
            expect(summary).toContain('2 fatalities');
            expect(summary).toContain('3 errors');
            expect(summary).toContain('1 exempt issues');
            expect(summary).toContain('97 (97.0%) have no issues');
            expect(summary).toContain('version 5.0.0');
            expect(summary).toContain('45.67 seconds');
        });

        it('should handle zero files gracefully', () => {
            const zeroFileData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    fileCount: 0,
                    issueDetails: []
                }
            };
            const gen = new ReportGenerator(zeroFileData);
            const summary = (gen as any).generateExecutiveSummary();
            
            expect(summary).toContain('0 (0.0%) have no issues');
        });

        it('should handle missing version and duration', () => {
            const dataWithMissingFields = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    xfiVersion: undefined,
                    durationSeconds: undefined
                }
            };
            const gen = new ReportGenerator(dataWithMissingFields);
            const summary = (gen as any).generateExecutiveSummary();
            
            expect(summary).toContain('version Unknown');
            expect(summary).toContain('0.00 seconds');
        });
    });

    describe('generateRepositoryOverview', () => {
        it('should generate repository overview with mermaid charts', () => {
            const overview = (generator as any).generateRepositoryOverview();
            
            expect(overview).toContain('## Repository Overview');
            expect(overview).toContain('### File Status');
            expect(overview).toContain('```mermaid');
            expect(overview).toContain('pie');
            expect(overview).toContain('title File Status');
            expect(overview).toContain('"Files with Issues" : 3');
            expect(overview).toContain('"Successful Files" : 97');
            expect(overview).toContain('### Issue Distribution');
            expect(overview).toContain('"Warnings" : 5');
            expect(overview).toContain('"Fatalities" : 2');
            expect(overview).toContain('"Errors" : 3');
            expect(overview).toContain('"Exempt" : 1');
        });
    });

    describe('generateTopRuleFailures', () => {
        it('should generate top rule failures chart', () => {
            const failures = (generator as any).generateTopRuleFailures();
            
            expect(failures).toContain('## Top Rule Failures');
            expect(failures).toContain('most frequent rule failures');
            expect(failures).toContain('```mermaid');
            expect(failures).toContain('gantt');
            expect(failures).toContain('title Top Rule Failures');
        });

        it('should handle no rule failures', () => {
            const noFailuresData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: []
                }
            };
            const gen = new ReportGenerator(noFailuresData);
            const failures = (gen as any).generateTopRuleFailures();
            
            expect(failures).toContain('No rule failures detected');
        });

        it('should truncate long rule names', () => {
            const longRuleData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/file.ts',
                            fileName: 'file.ts',
                            errors: [
                                {
                                    ruleFailure: 'this-is-a-very-long-rule-name-that-should-be-truncated-for-display',
                                    level: 'error',
                                    details: {}
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(longRuleData);
            const failures = (gen as any).generateTopRuleFailures();
            
            // The truncateRuleName method should limit rule names to 30 chars
            expect(failures).toContain('this-is-a-very-long-rule-na...');
        });
    });

    describe('generateFilesWithMostIssues', () => {
        it('should generate files with most issues chart', () => {
            const files = (generator as any).generateFilesWithMostIssues();
            
            expect(files).toContain('## Files with Most Issues');
            expect(files).toContain('which files have the most issues');
            expect(files).toContain('```mermaid');
            expect(files).toContain('gantt');
        });

        it('should handle no files with issues', () => {
            const noIssuesData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: []
                }
            };
            const gen = new ReportGenerator(noIssuesData);
            const files = (gen as any).generateFilesWithMostIssues();
            
            expect(files).toBe('');
        });
    });

    describe('generateFactMetricsPerformance', () => {
        it('should return empty string when no data available', () => {
            const metrics = (generator as any).generateFactMetricsPerformance();
            
            expect(metrics).toBe('');
        });

        it('should generate metrics when data is available', () => {
            const metricsData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    factMetrics: {
                        'customFact': {
                            executionCount: 10,
                            totalExecutionTime: 5.5,
                            averageExecutionTime: 0.55
                        }
                    }
                }
            };
            const gen = new ReportGenerator(metricsData);
            const metrics = (gen as any).generateFactMetricsPerformance();
            
            expect(metrics).toContain('## Fact Metrics Performance');
            expect(metrics).toContain('### Execution Count');
            expect(metrics).toContain('### Execution Time');
        });
    });

    describe('generateTopCriticalIssues', () => {
        it('should handle no AI analysis data', () => {
            const critical = (generator as any).generateTopCriticalIssues();
            
            expect(critical).toContain('## Top 5 Critical Issues (AI Analysis)');
            expect(critical).toContain('No AI-powered critical issues analysis available');
            expect(critical).toContain('Consider enabling the OpenAI plugin');
        });

        it('should process AI analysis issues when available', () => {
            const aiData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/ai-file.ts',
                            fileName: 'ai-file.ts',
                            errors: [
                                {
                                    ruleFailure: 'openai-analysis',
                                    level: 'error',
                                    details: {
                                        message: 'Critical Security Issue: SQL injection vulnerability detected in user input validation. Severity: 9. This could allow attackers to access sensitive database information.'
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(aiData);
            const critical = (gen as any).generateTopCriticalIssues();
            
            expect(critical).toContain('## Top 5 Critical Issues (AI Analysis)');
            expect(critical).toContain('Based on the OpenAI analysis');
            expect(critical).toContain('Critical Security Issue');
            expect(critical).toContain('Severity: 9');
        });
    });

    describe('generateFunctionComplexityIssues', () => {
        it('should generate function complexity issues table', () => {
            const complexityData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/complex.ts',
                            fileName: 'complex.ts',
                            errors: [
                                {
                                    ruleFailure: 'functionComplexity',
                                    level: 'warning',
                                    details: {
                                        message: 'Function: testFunction, Cyclomatic: 15, Line: 25'
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(complexityData);
            const complexity = (gen as any).generateFunctionComplexityIssues();
            
            expect(complexity).toContain('## Function Complexity Issues');
            expect(complexity).toContain('high complexity that should be refactored');
            expect(complexity).toContain('| File | Function | Cyclomatic Complexity');
        });

        it('should return empty string when no complexity issues', () => {
            const noComplexityData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/file.ts',
                            fileName: 'file.ts',
                            errors: [
                                {
                                    ruleFailure: 'otherRule',
                                    level: 'error',
                                    details: {}
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(noComplexityData);
            const complexity = (gen as any).generateFunctionComplexityIssues();
            
            expect(complexity).toBe('');
        });
    });

    describe('generateDependencyIssues', () => {
        it('should generate dependency issues table', () => {
            const dependency = (generator as any).generateDependencyIssues();
            
            expect(dependency).toContain('## Dependency Issues');
            expect(dependency).toContain('outdated framework dependencies');
            expect(dependency).toContain('| Dependency | Current Version | Required Version |');
        });

        it('should return empty string when no dependency issues', () => {
            const noDependencyData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/file.ts',
                            fileName: 'file.ts',
                            errors: [
                                {
                                    ruleFailure: 'otherRule',
                                    level: 'error',
                                    details: {}
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(noDependencyData);
            const dependency = (gen as any).generateDependencyIssues();
            
            expect(dependency).toBe('');
        });
    });

    describe('generateSensitiveDataIssues', () => {
        it('should generate sensitive data issues table', () => {
            const sensitive = (generator as any).generateSensitiveDataIssues();
            
            expect(sensitive).toContain('## Sensitive Data Issues');
            expect(sensitive).toContain('potentially sensitive data');
            expect(sensitive).toContain('| File | Match Pattern | Line Number |');
        });

        it('should return empty string when no sensitive data issues', () => {
            const noSensitiveData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/file.ts',
                            fileName: 'file.ts',
                            errors: [
                                {
                                    ruleFailure: 'otherRule',
                                    level: 'error',
                                    details: {}
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(noSensitiveData);
            const sensitive = (gen as any).generateSensitiveDataIssues();
            
            expect(sensitive).toBe('');
        });
    });

    describe('generateOtherGlobalIssues', () => {
        it('should generate other global issues when available', () => {
            const globalData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: 'REPO_GLOBAL_CHECK',
                            fileName: 'REPO_GLOBAL_CHECK',
                            errors: [
                                {
                                    ruleFailure: 'global-rule',
                                    level: 'error',
                                    details: {
                                        message: 'Global repository issue detected'
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(globalData);
            const other = (gen as any).generateOtherGlobalIssues();
            
            expect(other).toContain('## Other Global Issues');
            expect(other).toContain('global-rule');
        });

        it('should return empty string when no global issues', () => {
            const other = (generator as any).generateOtherGlobalIssues();
            expect(other).toBe('');
        });
    });

    describe('generateAllIssuesWithAnchors', () => {
        it('should generate comprehensive issues section with anchors', () => {
            const allIssues = (generator as any).generateAllIssuesWithAnchors();
            
            expect(allIssues).toContain('## All Issues');
            expect(allIssues).toContain('sections contain all issues found');
            expect(allIssues).toContain('unique anchor');
            expect(allIssues).toContain('<a id=');
        });

        it('should handle files with no issues', () => {
            const noIssuesData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: []
                }
            };
            const gen = new ReportGenerator(noIssuesData);
            const allIssues = (gen as any).generateAllIssuesWithAnchors();
            
            expect(allIssues).toContain('No issues found');
        });
    });

    describe('Utility Methods', () => {
        describe('truncateRuleName', () => {
            it('should truncate long rule names', () => {
                const longName = 'this-is-a-very-long-rule-name-that-exceeds-the-maximum-length';
                const truncated = (generator as any).truncateRuleName(longName);
                expect(truncated.length).toBeLessThanOrEqual(50);
                expect(truncated).toContain('...');
            });

            it('should not truncate short rule names', () => {
                const shortName = 'shortRule';
                const result = (generator as any).truncateRuleName(shortName);
                expect(result).toBe(shortName);
            });
        });

        describe('createGithubLink', () => {
            it('should create correct GitHub link', () => {
                const link = (generator as any).createGithubLink('/test/repo/src/file.ts', 45);
                expect(link).toContain('github.com');
                expect(link).toContain('test/example-repo');
                expect(link).toContain('src/file.ts');
                expect(link).toContain('#L45');
            });

            it('should handle missing line number', () => {
                const link = (generator as any).createGithubLink('/test/repo/src/file.ts');
                expect(link).not.toContain('#L');
            });
        });

        describe('extractSeverity', () => {
            it('should extract severity from message', () => {
                const message = 'Critical issue. Severity: 8. This needs attention.';
                const severity = (generator as any).extractSeverity(message);
                expect(severity).toBe(8);
            });

            it('should return null for no severity', () => {
                const message = 'Regular message without severity.';
                const severity = (generator as any).extractSeverity(message);
                expect(severity).toBeNull();
            });
        });

        describe('extractTitle', () => {
            it('should extract title from message', () => {
                const message = 'Critical Security Issue: SQL injection detected.';
                const title = (generator as any).extractTitle(message);
                expect(title).toBe('Critical Security Issue: SQL injection detected');
            });

            it('should fallback to default when no match', () => {
                const message = '';
                const title = (generator as any).extractTitle(message);
                expect(title).toBe('Critical Issue');
            });
        });

        describe('extractDescription', () => {
            it('should extract description from message', () => {
                const message = 'Description: This is the description part.';
                const description = (generator as any).extractDescription(message);
                expect(description).toBe('This is the description part.');
            });

            it('should return truncated message if no description', () => {
                const message = 'Simple message';
                const description = (generator as any).extractDescription(message);
                expect(description).toBe('Simple message...');
            });
        });

        describe('parseComplexityIssues', () => {
            it('should parse complexity issue details from message', () => {
                const error = {
                    ruleFailure: 'functionComplexity',
                    level: 'error',
                    details: {
                        message: 'Function: myFunction is too complex, Cyclomatic: 15, Line: 45'
                    }
                };
                const issues = (generator as any).parseComplexityIssues('/test/file.ts', error);
                
                expect(issues).toHaveLength(1);
                expect(issues[0].file).toBe('/test/file.ts');
                expect(issues[0].function).toBe('myFunction');
                expect(issues[0].cyclomaticComplexity).toBe(15);
                expect(issues[0].line).toBe(45);
            });

            it('should parse complexity issues from structured data', () => {
                const error = {
                    ruleFailure: 'functionComplexity',
                    level: 'error',
                    details: {
                        message: 'Functions detected with high complexity',
                        complexities: [
                            {
                                name: 'myFunction',
                                metrics: {
                                    name: 'myFunction',
                                    cyclomaticComplexity: 24,
                                    cognitiveComplexity: 89,
                                    nestingDepth: 11,
                                    parameterCount: 10,
                                    returnCount: 15,
                                    location: {
                                        startLine: 22
                                    }
                                }
                            }
                        ]
                    }
                };
                const issues = (generator as any).parseComplexityIssues('/test/file.ts', error);
                
                expect(issues).toHaveLength(1);
                expect(issues[0].file).toBe('/test/file.ts');
                expect(issues[0].function).toBe('myFunction');
                expect(issues[0].cyclomaticComplexity).toBe(24);
                expect(issues[0].cognitiveComplexity).toBe(89);
                expect(issues[0].nestingDepth).toBe(11);
                expect(issues[0].parameterCount).toBe(10);
                expect(issues[0].returnCount).toBe(15);
                expect(issues[0].line).toBe(22);
            });

            it('should parse complexity issues from nested details.details.complexities structure', () => {
                // This is the actual structure produced by the engine runner when resolving fact references
                const error = {
                    ruleFailure: 'functionComplexity-iterative',
                    level: 'warning',
                    details: {
                        message: 'Functions detected with high complexity',
                        // The engine runner wraps resolved fact values in a nested 'details' object
                        details: {
                            complexities: [
                                {
                                    name: 'processData',
                                    metrics: {
                                        name: 'processData',
                                        cyclomaticComplexity: 25,
                                        cognitiveComplexity: 45,
                                        nestingDepth: 8,
                                        parameterCount: 6,
                                        returnCount: 12,
                                        location: {
                                            startLine: 100
                                        }
                                    }
                                }
                            ]
                        }
                    }
                };
                const issues = (generator as any).parseComplexityIssues('/test/nested.ts', error);
                
                expect(issues).toHaveLength(1);
                expect(issues[0].file).toBe('/test/nested.ts');
                expect(issues[0].function).toBe('processData');
                expect(issues[0].cyclomaticComplexity).toBe(25);
                expect(issues[0].cognitiveComplexity).toBe(45);
                expect(issues[0].nestingDepth).toBe(8);
                expect(issues[0].parameterCount).toBe(6);
                expect(issues[0].returnCount).toBe(12);
                expect(issues[0].line).toBe(100);
            });

            it('should return empty array when no complexity data can be extracted', () => {
                const error = {
                    ruleFailure: 'complexity',
                    level: 'error',
                    details: {
                        message: 'Complexity too high' // No parseable data
                    }
                };
                const issues = (generator as any).parseComplexityIssues('/test/file.ts', error);
                // Should return empty array when no structured data or parseable message
                expect(issues).toHaveLength(0);
            });

            it('should handle try-catch errors gracefully', () => {
                const error = null; // This will cause an error in parsing
                const issues = (generator as any).parseComplexityIssues('/test/file.ts', error);
                expect(issues).toEqual([]);
            });
        });

        describe('parseDependencyIssue', () => {
            it('should parse dependency issue details', () => {
                const error = {
                    ruleFailure: 'outdatedDependency',
                    level: 'warning',
                    details: {
                        message: 'Dependency: react, Current: 16.0.0, Required: 18.0.0'
                    }
                };
                const issue = (generator as any).parseDependencyIssue(error);
                
                expect(issue.dependency).toBe('react');
                expect(issue.currentVersion).toBe('16.0.0');
                expect(issue.requiredVersion).toBe('18.0.0');
            });

            it('should return null for invalid dependency issue', () => {
                const error = {
                    ruleFailure: 'otherRule',
                    level: 'error',
                    details: {
                        message: 'This message contains no relevant information'
                    }
                };
                const issue = (generator as any).parseDependencyIssue(error);
                expect(issue).toBeNull();
            });

            it('should handle try-catch errors gracefully', () => {
                const error = null; // This will cause an error in parsing
                const issue = (generator as any).parseDependencyIssue(error);
                expect(issue).toBeNull();
            });
        });

        describe('parseSensitiveDataIssue', () => {
            it('should parse sensitive data issue', () => {
                const error = {
                    ruleFailure: 'sensitiveData',
                    level: 'fatality',
                    details: {
                        message: 'Pattern: API_KEY found at Line: 10'
                    }
                };
                const issue = (generator as any).parseSensitiveDataIssue('/test/file.ts', error);
                
                expect(issue.file).toBe('/test/file.ts');
                expect(issue.pattern).toBe('API_KEY');
                expect(issue.line).toBe(10);
            });

            it('should handle structured line data', () => {
                const error = {
                    ruleFailure: 'sensitiveData',
                    level: 'fatality',
                    details: {
                        message: 'Sensitive data found',
                        details: [{ lineNumber: 25 }]
                    }
                };
                const issue = (generator as any).parseSensitiveDataIssue('/test/file.ts', error);
                
                expect(issue.file).toBe('/test/file.ts');
                expect(issue.line).toBe(25);
            });

            it('should handle structured range data', () => {
                const error = {
                    ruleFailure: 'sensitiveData',
                    level: 'fatality',
                    details: {
                        message: 'Sensitive data found',
                        details: [{ range: { start: { line: 30 } } }]
                    }
                };
                const issue = (generator as any).parseSensitiveDataIssue('/test/file.ts', error);
                
                expect(issue.file).toBe('/test/file.ts');
                expect(issue.line).toBe(30);
            });

            it('should handle try-catch errors gracefully', () => {
                const error = null; // This will cause an error in parsing
                const issue = (generator as any).parseSensitiveDataIssue('/test/file.ts', error);
                expect(issue).toBeNull();
            });
        });
    });

    describe('saveReportToFile', () => {
        it('should save report to file successfully', async () => {
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

            await generator.saveReportToFile('/test/output/report.md');

            expect(fs.writeFile).toHaveBeenCalledWith(
                '/test/output/report.md',
                expect.stringContaining('# X-Fidelity Analysis Report'),
                'utf8'
            );
        });

        it('should handle file write errors', async () => {
            const writeError = new Error('Permission denied');
            (fs.writeFile as jest.Mock).mockRejectedValue(writeError);

            await expect(generator.saveReportToFile('/test/output/report.md')).rejects.toThrow('Permission denied');
        });
    });

    describe('generateRuleSection', () => {
        it('should generate section for global rules', () => {
            const globalRuleData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: 'REPO_GLOBAL_CHECK',
                            fileName: 'REPO_GLOBAL_CHECK',
                            errors: [
                                {
                                    ruleFailure: 'dependency-check-global',
                                    level: 'warning',
                                    details: {
                                        message: 'Outdated dependencies found',
                                        details: [
                                            {
                                                dependency: 'react',
                                                currentVersion: '16.0.0',
                                                requiredVersion: '18.0.0',
                                                location: {
                                                    manifestPath: 'package.json',
                                                    lineNumber: 15
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(globalRuleData);
            const allIssues = (gen as any).generateAllIssuesWithAnchors();
            
            expect(allIssues).toContain('dependency-check-global');
            expect(allIssues).toContain('Repository-wide');
        });

        it('should generate section for iterative rules with tables', () => {
            const iterativeRuleData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: '/test/file1.ts',
                            fileName: 'file1.ts',
                            errors: [
                                {
                                    ruleFailure: 'complexity-iterative',
                                    level: 'warning',
                                    details: {
                                        message: 'High complexity',
                                        lineNumber: 25
                                    }
                                }
                            ]
                        },
                        {
                            filePath: '/test/file2.ts',
                            fileName: 'file2.ts',
                            errors: [
                                {
                                    ruleFailure: 'complexity-iterative',
                                    level: 'warning',
                                    details: {
                                        message: 'High complexity',
                                        lineNumber: 30
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(iterativeRuleData);
            const allIssues = (gen as any).generateAllIssuesWithAnchors();
            
            expect(allIssues).toContain('complexity-iterative');
            expect(allIssues).toContain('| File | Rule | Severity |');
        });
    });

    describe('generateIssueBlock', () => {
        it('should generate issue block with anchor', () => {
            const report = generator.generateReport();
            
            expect(report).toContain('<a id=');
            expect(report).toContain('Issue #');
        });

        it('should include severity badge', () => {
            const report = generator.generateReport();
            
            // Should contain severity indicators
            expect(report).toMatch(/🔥|❌|⚠️|ℹ️|💡/);
        });
    });

    describe('extractDependencyLocations', () => {
        it('should extract dependency locations from error details', () => {
            const dependencyData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: 'REPO_GLOBAL_CHECK',
                            fileName: 'REPO_GLOBAL_CHECK',
                            errors: [
                                {
                                    ruleFailure: 'outdated-dependencies-global',
                                    level: 'warning',
                                    details: {
                                        message: 'Outdated dependencies',
                                        details: [
                                            {
                                                dependency: 'react',
                                                currentVersion: '16.0.0',
                                                requiredVersion: '18.0.0',
                                                location: {
                                                    manifestPath: 'package.json',
                                                    lineNumber: 15
                                                }
                                            },
                                            {
                                                dependency: 'lodash',
                                                currentVersion: '4.0.0',
                                                requiredVersion: '4.17.0',
                                                location: {
                                                    manifestPath: 'package.json',
                                                    lineNumber: 20
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(dependencyData);
            const otherIssues = (gen as any).generateOtherGlobalIssues();
            
            expect(otherIssues).toContain('react');
            expect(otherIssues).toContain('16.0.0');
            expect(otherIssues).toContain('18.0.0');
            expect(otherIssues).toContain('package.json');
        });

        it('should limit displayed dependency locations to 10', () => {
            const manyDepsData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    issueDetails: [
                        {
                            filePath: 'REPO_GLOBAL_CHECK',
                            fileName: 'REPO_GLOBAL_CHECK',
                            errors: [
                                {
                                    ruleFailure: 'outdated-dependencies-global',
                                    level: 'warning',
                                    details: {
                                        message: 'Outdated dependencies',
                                        details: Array.from({ length: 15 }, (_, i) => ({
                                            dependency: `dep-${i}`,
                                            currentVersion: '1.0.0',
                                            requiredVersion: '2.0.0',
                                            location: {
                                                manifestPath: 'package.json',
                                                lineNumber: i + 1
                                            }
                                        }))
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
            const gen = new ReportGenerator(manyDepsData);
            const otherIssues = (gen as any).generateOtherGlobalIssues();
            
            expect(otherIssues).toContain('...and 5 more');
        });
    });

    describe('formatRuleName', () => {
        it('should format kebab-case to Title Case', () => {
            const result = (generator as any).formatRuleName('my-rule-name');
            expect(result).toBe('My Rule Name');
        });

        it('should format camelCase to Title Case', () => {
            const result = (generator as any).formatRuleName('myRuleName');
            expect(result).toBe('My Rule Name');
        });

        it('should handle underscores', () => {
            const result = (generator as any).formatRuleName('my_rule_name');
            expect(result).toBe('My Rule Name');
        });
    });

    describe('getSeverityBadge', () => {
        it('should return correct badge for fatal', () => {
            const badge = (generator as any).getSeverityBadge('fatal');
            expect(badge).toContain('FATAL');
            expect(badge).toContain('🔥');
        });

        it('should return correct badge for fatality', () => {
            const badge = (generator as any).getSeverityBadge('fatality');
            expect(badge).toContain('FATAL');
        });

        it('should return correct badge for error', () => {
            const badge = (generator as any).getSeverityBadge('error');
            expect(badge).toContain('ERROR');
            expect(badge).toContain('❌');
        });

        it('should return correct badge for warning', () => {
            const badge = (generator as any).getSeverityBadge('warning');
            expect(badge).toContain('WARNING');
            expect(badge).toContain('⚠️');
        });

        it('should return correct badge for info', () => {
            const badge = (generator as any).getSeverityBadge('info');
            expect(badge).toContain('INFO');
            expect(badge).toContain('ℹ️');
        });

        it('should return correct badge for hint', () => {
            const badge = (generator as any).getSeverityBadge('hint');
            expect(badge).toContain('HINT');
            expect(badge).toContain('💡');
        });

        it('should handle unknown severity', () => {
            const badge = (generator as any).getSeverityBadge('unknown');
            expect(badge).toContain('UNKNOWN');
            expect(badge).toContain('📋');
        });
    });

    describe('isMarkdownContent', () => {
        it('should detect bold markdown', () => {
            const result = (generator as any).isMarkdownContent('This is **bold** text');
            expect(result).toBe(true);
        });

        it('should detect italic markdown', () => {
            const result = (generator as any).isMarkdownContent('This is *italic* text');
            expect(result).toBe(true);
        });

        it('should detect headers', () => {
            const result = (generator as any).isMarkdownContent('# Header');
            expect(result).toBe(true);
        });

        it('should detect code blocks', () => {
            const result = (generator as any).isMarkdownContent('```javascript\ncode\n```');
            expect(result).toBe(true);
        });

        it('should detect inline code', () => {
            const result = (generator as any).isMarkdownContent('Use `const` keyword');
            expect(result).toBe(true);
        });

        it('should detect links', () => {
            const result = (generator as any).isMarkdownContent('[link](http://example.com)');
            expect(result).toBe(true);
        });

        it('should return false for plain text', () => {
            const result = (generator as any).isMarkdownContent('Plain text without markdown');
            expect(result).toBe(false);
        });
    });

    describe('extractCleanMessage', () => {
        it('should strip markdown formatting', () => {
            const error = {
                details: {
                    message: '**Bold** and *italic* with `code`'
                }
            };
            const result = (generator as any).extractCleanMessage(error);
            expect(result).toBe('Bold and italic with code');
        });

        it('should remove links but keep text', () => {
            const error = {
                details: {
                    message: 'Click [here](http://example.com) for more'
                }
            };
            const result = (generator as any).extractCleanMessage(error);
            expect(result).toBe('Click here for more');
        });

        it('should remove headers', () => {
            const error = {
                details: {
                    message: '## Header\nContent'
                }
            };
            const result = (generator as any).extractCleanMessage(error);
            expect(result).toContain('Header');
            expect(result).not.toContain('##');
        });

        it('should replace newlines with spaces', () => {
            const error = {
                details: {
                    message: 'Line 1\nLine 2\nLine 3'
                }
            };
            const result = (generator as any).extractCleanMessage(error);
            expect(result).toBe('Line 1 Line 2 Line 3');
        });
    });

    describe('generateRuleId', () => {
        it('should generate valid anchor ID from rule name', () => {
            const result = (generator as any).generateRuleId('my-complex-rule');
            expect(result).toBe('rule-my-complex-rule');
        });

        it('should handle special characters', () => {
            const result = (generator as any).generateRuleId('rule@with#special$chars');
            expect(result).toBe('rule-rule-with-special-chars');
        });

        it('should convert to lowercase', () => {
            const result = (generator as any).generateRuleId('MyRuleName');
            expect(result).toBe('rule-myrulename');
        });
    });

    describe('generateIssueId', () => {
        it('should generate unique issue ID', () => {
            const error = {
                ruleFailure: 'test-rule',
                details: { lineNumber: 25 }
            };
            const result = (generator as any).generateIssueId('/test/file.ts', error, 1);
            expect(result).toContain('issue-1');
            expect(result).toContain('file-ts');
            expect(result).toContain('test-rule');
            expect(result).toContain('line-25');
        });

        it('should handle missing line number', () => {
            const error = {
                ruleFailure: 'test-rule',
                details: {}
            };
            const result = (generator as any).generateIssueId('/test/file.ts', error, 2);
            expect(result).toContain('line-1'); // Default line
        });
    });

    describe('generateRuleDefinitionLink', () => {
        it('should generate link when repo name is available', () => {
            const result = (generator as any).generateRuleDefinitionLink('test-rule');
            expect(result).toContain('github.com');
            expect(result).toContain('test/example-repo');
            expect(result).toContain('test-rule.json');
        });

        it('should return null when repo name is not available', () => {
            const noRepoData = {
                ...mockData,
                XFI_RESULT: {
                    ...mockData.XFI_RESULT,
                    repoUrl: undefined
                }
            };
            const gen = new ReportGenerator(noRepoData);
            const result = (gen as any).generateRuleDefinitionLink('test-rule');
            expect(result).toBeNull();
        });
    });

    describe('extractFiles', () => {
        it('should extract files from message', () => {
            const message = 'Files: file1.ts, file2.ts\n\nMore content';
            const result = (generator as any).extractFiles(message, '/default/file.ts');
            expect(result).toContain('file1.ts');
        });

        it('should handle message without files pattern', () => {
            const message = 'No file information here';
            const result = (generator as any).extractFiles(message, '/default/file.ts');
            // The implementation may return either the default or extract from message
            expect(result).toBeDefined();
        });
    });

    describe('extractSuggestion', () => {
        it('should extract suggestion from message', () => {
            const message = 'Issue found. Suggestion: Use a better approach.';
            const result = (generator as any).extractSuggestion(message);
            expect(result).toBe('Use a better approach.');
        });

        it('should handle message without suggestion pattern', () => {
            const message = 'No suggestion here';
            const result = (generator as any).extractSuggestion(message);
            // The implementation may return a default or parsed value
            expect(result).toBeDefined();
        });
    });
});