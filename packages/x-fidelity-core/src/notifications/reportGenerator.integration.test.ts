import { ReportGenerator } from './reportGenerator';
import { ResultMetadata } from '@x-fidelity/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration test for ReportGenerator
 * 
 * This test validates that the markdown report correctly correlates with the JSON data:
 * - All issues in JSON are represented in the markdown
 * - Complexity data is extracted correctly
 * - Dependency locations are shown
 * - No data gaps between JSON and markdown
 */
describe('ReportGenerator Integration Test', () => {
    const fixtureResultsPath = path.resolve(__dirname, '../../../x-fidelity-fixtures/node-fullstack/.xfiResults');
    const jsonResultPath = path.join(fixtureResultsPath, 'XFI_RESULT.json');
    
    let jsonData: ResultMetadata;
    let markdownReport: string;
    let generator: ReportGenerator;

    beforeAll(() => {
        // Check if the fixture results exist
        if (!fs.existsSync(jsonResultPath)) {
            console.warn(`⚠️ Fixture results not found at ${jsonResultPath}. Run CLI analysis first.`);
            return;
        }

        // Load the JSON result
        const jsonContent = fs.readFileSync(jsonResultPath, 'utf8');
        jsonData = JSON.parse(jsonContent);

        // Generate the markdown report
        generator = new ReportGenerator(jsonData);
        markdownReport = generator.generateReport();
    });

    describe('Issue Count Correlation', () => {
        it('should have matching total issue count in summary', () => {
            if (!jsonData) return;

            const totalIssues = jsonData.XFI_RESULT.totalIssues;
            
            // Check that the executive summary mentions the correct total
            expect(markdownReport).toContain(`**${totalIssues} total issues**`);
        });

        it('should have matching warning count', () => {
            if (!jsonData) return;

            const warningCount = jsonData.XFI_RESULT.warningCount;
            expect(markdownReport).toContain(`${warningCount} warnings`);
        });

        it('should have matching fatality count', () => {
            if (!jsonData) return;

            const fatalityCount = jsonData.XFI_RESULT.fatalityCount;
            expect(markdownReport).toContain(`${fatalityCount} fatalities`);
        });

        it('should have matching file count', () => {
            if (!jsonData) return;

            const fileCount = jsonData.XFI_RESULT.fileCount;
            expect(markdownReport).toContain(`${fileCount} total files`);
        });
    });

    describe('Rule Coverage', () => {
        it('should include all rules from JSON in the report', () => {
            if (!jsonData) return;

            // Extract unique rule names from JSON
            const rulesInJson = new Set<string>();
            jsonData.XFI_RESULT.issueDetails.forEach(detail => {
                detail.errors.forEach(error => {
                    if (error.ruleFailure) {
                        rulesInJson.add(error.ruleFailure);
                    }
                });
            });

            // Verify each rule appears in the markdown
            rulesInJson.forEach(rule => {
                expect(markdownReport).toContain(rule);
            });

            console.log(`✅ All ${rulesInJson.size} rules from JSON are present in markdown report`);
        });

        it('should correctly categorize global vs iterative rules', () => {
            if (!jsonData) return;

            // Global rules should show "This rule applies globally to the repository"
            const globalRules = new Set<string>();
            jsonData.XFI_RESULT.issueDetails.forEach(detail => {
                if (detail.filePath === 'REPO_GLOBAL_CHECK') {
                    detail.errors.forEach(error => {
                        if (error.ruleFailure && error.ruleFailure.endsWith('-global')) {
                            globalRules.add(error.ruleFailure);
                        }
                    });
                }
            });

            // Verify global rules are marked as such in the report
            if (globalRules.size > 0) {
                expect(markdownReport).toContain('This rule applies globally to the repository');
                console.log(`✅ Found ${globalRules.size} global rules marked correctly`);
            }
        });
    });

    describe('File Coverage', () => {
        it('should include all files with issues in the report', () => {
            if (!jsonData) return;

            // Extract unique file paths from JSON (excluding global checks)
            const filesInJson = new Set<string>();
            jsonData.XFI_RESULT.issueDetails.forEach(detail => {
                if (detail.filePath && detail.filePath !== 'REPO_GLOBAL_CHECK') {
                    // Get just the filename for checking
                    const fileName = path.basename(detail.filePath);
                    filesInJson.add(fileName);
                }
            });

            // Verify each file appears in the markdown (at least as a filename)
            let foundCount = 0;
            filesInJson.forEach(file => {
                if (markdownReport.includes(file)) {
                    foundCount++;
                }
            });

            // All files should be mentioned
            expect(foundCount).toBe(filesInJson.size);
            console.log(`✅ All ${filesInJson.size} files from JSON are present in markdown report`);
        });
    });

    describe('Dependency Issue Correlation', () => {
        it('should include dependency version details from JSON', () => {
            if (!jsonData) return;

            // Find dependency issues in JSON
            const dependencyIssues = jsonData.XFI_RESULT.issueDetails.flatMap(detail =>
                detail.errors.filter(error => 
                    error.ruleFailure?.includes('outdated') || 
                    error.ruleFailure?.includes('dependency')
                )
            );

            if (dependencyIssues.length === 0) {
                console.log('ℹ️ No dependency issues in JSON to verify');
                return;
            }

            // Check for dependency details in markdown
            dependencyIssues.forEach(error => {
                const details = error.details?.details;
                if (Array.isArray(details)) {
                    details.forEach((dep: any) => {
                        if (dep.dependency && dep.location?.manifestPath) {
                            // Dependency name should appear
                            expect(markdownReport).toContain(dep.dependency);
                            // Manifest file should appear
                            expect(markdownReport).toContain(dep.location.manifestPath);
                        }
                    });
                }
            });

            console.log(`✅ Dependency details from JSON are present in markdown report`);
        });
    });

    describe('Complexity Data Correlation', () => {
        it('should include complexity metrics from JSON', () => {
            if (!jsonData) return;

            // Find complexity issues in JSON
            const complexityIssues = jsonData.XFI_RESULT.issueDetails.flatMap(detail =>
                detail.errors.filter(error => 
                    error.ruleFailure?.includes('functionComplexity') ||
                    error.ruleFailure?.includes('complexity')
                )
            );

            if (complexityIssues.length === 0) {
                console.log('ℹ️ No complexity issues in JSON to verify');
                return;
            }

            // Extract complexity data from JSON
            const complexityData: Array<{
                file: string;
                cyclomatic?: number;
                cognitive?: number;
            }> = [];

            complexityIssues.forEach(error => {
                const complexities = error.details?.details?.complexities;
                if (Array.isArray(complexities)) {
                    complexities.forEach((c: any) => {
                        const metrics = c.metrics || c;
                        if (metrics.cyclomaticComplexity !== undefined) {
                            complexityData.push({
                                file: error.details?.filePath || '',
                                cyclomatic: metrics.cyclomaticComplexity,
                                cognitive: metrics.cognitiveComplexity
                            });
                        }
                    });
                }
            });

            // Verify complexity values appear in markdown
            let foundCount = 0;
            complexityData.forEach(data => {
                if (data.cyclomatic !== undefined) {
                    const cyclomaticStr = `${data.cyclomatic}`;
                    if (markdownReport.includes(cyclomaticStr)) {
                        foundCount++;
                    }
                }
            });

            if (complexityData.length > 0) {
                // At least some complexity values should be found
                expect(foundCount).toBeGreaterThan(0);
                console.log(`✅ ${foundCount}/${complexityData.length} complexity metrics from JSON are present in markdown report`);
            }
        });

        it('should not show N/A for valid complexity values', () => {
            if (!jsonData) return;

            // Find complexity issues with actual data
            const hasComplexityData = jsonData.XFI_RESULT.issueDetails.some(detail =>
                detail.errors.some(error => {
                    const complexities = error.details?.details?.complexities;
                    return Array.isArray(complexities) && complexities.length > 0;
                })
            );

            if (hasComplexityData) {
                // The Function Complexity Issues table should have actual values, not all N/A
                const complexitySection = markdownReport.match(/## Function Complexity Issues[\s\S]*?(?=##|$)/);
                if (complexitySection) {
                    const section = complexitySection[0];
                    // Should have numeric values in the table
                    const hasNumericValues = /\| \d+ \|/.test(section);
                    expect(hasNumericValues).toBe(true);
                    console.log('✅ Function complexity table has numeric values');
                }
            }
        });
    });

    describe('Individual Issue Anchors', () => {
        it('should generate unique anchors for each issue', () => {
            if (!jsonData) return;

            // Count issues in JSON
            let issueCount = 0;
            jsonData.XFI_RESULT.issueDetails.forEach(detail => {
                issueCount += detail.errors.length;
            });

            // Count issue anchors in markdown (Issue #N pattern)
            const issueAnchors = markdownReport.match(/<a id="issue-\d+-/g) || [];
            
            // Should have an anchor for each issue
            expect(issueAnchors.length).toBe(issueCount);
            console.log(`✅ ${issueAnchors.length} issue anchors match ${issueCount} issues in JSON`);
        });
    });

    describe('Severity Badge Correlation', () => {
        it('should correctly map severity levels to badges', () => {
            if (!jsonData) return;

            // Check for severity badges
            const hasFatality = jsonData.XFI_RESULT.fatalityCount > 0;
            const hasWarning = jsonData.XFI_RESULT.warningCount > 0;

            if (hasFatality) {
                expect(markdownReport).toContain('🔥 **FATAL**');
            }
            if (hasWarning) {
                expect(markdownReport).toContain('⚠️ **WARNING**');
            }
        });
    });

    describe('No Data Gaps', () => {
        it('should not have empty sections when data exists', () => {
            if (!jsonData) return;

            const hasIssues = jsonData.XFI_RESULT.totalIssues > 0;
            
            if (hasIssues) {
                // Should not say "No issues found"
                expect(markdownReport).not.toContain('No issues found in the analysis. Great job! 🎉');
                
                // All Issues section should have content
                expect(markdownReport).toContain('## All Issues');
                expect(markdownReport).toContain('Individual Issues');
            }
        });

        it('should include line numbers when available in JSON', () => {
            if (!jsonData) return;

            // Find issues with line numbers
            const issuesWithLines = jsonData.XFI_RESULT.issueDetails.filter(detail =>
                detail.errors.some(error => 
                    error.details?.lineNumber || 
                    error.details?.details?.[0]?.lineNumber ||
                    error.details?.details?.[0]?.location?.lineNumber
                )
            );

            if (issuesWithLines.length > 0) {
                // Report should contain line number references
                const hasLineRefs = /Line \d+|#L\d+/.test(markdownReport);
                expect(hasLineRefs).toBe(true);
                console.log('✅ Line number references found in markdown report');
            }
        });
    });

    describe('Report Structure Validation', () => {
        it('should have all required sections', () => {
            if (!jsonData) return;

            const requiredSections = [
                '# X-Fidelity Analysis Report',
                '## Executive Summary',
                '## Repository Overview',
                '## Top Rule Failures',
                '## Files with Most Issues'
            ];

            requiredSections.forEach(section => {
                expect(markdownReport).toContain(section);
            });
        });

        it('should have valid mermaid charts when data exists', () => {
            if (!jsonData) return;

            if (jsonData.XFI_RESULT.totalIssues > 0) {
                expect(markdownReport).toContain('```mermaid');
                expect(markdownReport).toContain('pie');
            }
        });

        it('should include xfi version from JSON', () => {
            if (!jsonData) return;

            const version = jsonData.XFI_RESULT.xfiVersion;
            if (version) {
                expect(markdownReport).toContain(version);
            }
        });
    });
});
