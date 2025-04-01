import { logger } from '../utils/logger';
import { FactDefn, FileData } from '../types/typeDefs';
import { maskSensitiveData } from '../utils/maskSensitiveData';

export const globalFileAnalysis: FactDefn = {
    name: 'globalFileAnalysis',
    fn: async (params: any, almanac: any) => {
        const result: any = { 
            matchCounts: {}, 
            fileMatches: {},
            fileResults: {},
            fileResultsArray: []
        };
        
        try {
            // Get all file data from the almanac
            const globalFileMetadata: FileData[] = await almanac.factValue('globalFileMetadata');
            if (!Array.isArray(globalFileMetadata)) {
                logger.error('Invalid globalFileMetadata');
                return result;
            }

            // Extract parameters
            const newPatterns = Array.isArray(params.newPatterns) ? params.newPatterns : (params.newPatterns ? [params.newPatterns] : []);
            const legacyPatterns = Array.isArray(params.legacyPatterns) ? params.legacyPatterns : (params.legacyPatterns ? [params.legacyPatterns] : []);
            // For backward compatibility
            const patterns = Array.isArray(params.patterns) ? params.patterns : (params.patterns ? [params.patterns] : []);
            
            const fileFilter = params.fileFilter || '.*';
            const fileFilterRegex = new RegExp(fileFilter);
            
            // New parameter to control output format - default to 'pattern' for backward compatibility
            const outputFormat = params.outputFormat || 'pattern'; // 'pattern' or 'file'
            
            // Combine all patterns for processing
            const allPatterns = [...newPatterns, ...legacyPatterns, ...patterns];
            
            logger.info(`Running global file analysis with ${newPatterns.length} new patterns, ${legacyPatterns.length} legacy patterns, and ${patterns.length} regular patterns across ${globalFileMetadata.length} files`);
            
            // Filter files based on fileFilter parameter
            const filteredFiles = globalFileMetadata.filter(file => 
                file.fileName !== 'REPO_GLOBAL_CHECK' && fileFilterRegex.test(file.filePath)
            );
            
            logger.info(`Analyzing ${filteredFiles.length} files after filtering`);
            
            // Initialize match counts for each pattern
            allPatterns.forEach((pattern: string) => {
                result.matchCounts[pattern] = 0;
                result.fileMatches[pattern] = [];
            });
            
            // For file-centric output
            const fileResults: Record<string, any> = {};
            
            // Process each file
            for (const file of filteredFiles) {
                const fileContent = file.fileContent;
                if (!fileContent) continue;
                
                const lines = fileContent.split('\n');
                
                // Initialize file entry for file-centric output
                if (outputFormat === 'file') {
                    fileResults[file.filePath] = {
                        fileName: file.fileName,
                        filePath: file.filePath,
                        patternMatches: {},
                        totalMatches: 0
                    };
                }
                
                // Check each pattern against the file
                for (const pattern of allPatterns) {
                    const regex = new RegExp(pattern, 'g');
                    let fileMatches = 0;
                    const matchDetails = [];
                    
                    // Check each line for matches
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        let match;
                        while ((match = regex.exec(line)) !== null) {
                            fileMatches++;
                            matchDetails.push({
                                lineNumber: i + 1,
                                match: pattern,
                                context: maskSensitiveData(line.trim())
                            });
                        }
                    }
                    
                    // Update results if matches found
                    if (fileMatches > 0) {
                        result.matchCounts[pattern] += fileMatches;
                        
                        if (outputFormat === 'pattern') {
                            // Pattern-centric output (original)
                            result.fileMatches[pattern].push({
                                filePath: file.filePath,
                                matchCount: fileMatches,
                                matches: matchDetails
                            });
                        } else {
                            // File-centric output
                            fileResults[file.filePath].patternMatches[pattern] = {
                                matchCount: fileMatches,
                                matches: matchDetails
                            };
                            fileResults[file.filePath].totalMatches += fileMatches;
                        }
                    }
                }
            }
            
            // Calculate totals for new and legacy patterns
            const newPatternsTotal = newPatterns.reduce((sum: number, pattern: string) => sum + (result.matchCounts[pattern] || 0), 0);
            const legacyPatternsTotal = legacyPatterns.reduce((sum: number, pattern: string) => sum + (result.matchCounts[pattern] || 0), 0);
            
            // Add summary to result
            result.summary = {
                totalFiles: filteredFiles.length,
                totalMatches: Object.values(result.matchCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0),
                //patternCounts: result.matchCounts,
                newPatternCounts: newPatterns.reduce((counts: Record<string, number>, pattern: string) => {
                    counts[pattern] = result.matchCounts[pattern] || 0;
                    return counts;
                }, {}),
                legacyPatternCounts: legacyPatterns.reduce((counts: Record<string, number>, pattern: string) => {
                    counts[pattern] = result.matchCounts[pattern] || 0;
                    return counts;
                }, {}),
                newPatternsTotal: newPatternsTotal,
                legacyPatternsTotal: legacyPatternsTotal
            };
            
            // Add file-centric results if that format was requested
            if (outputFormat === 'file') {
                result.fileResults = fileResults;
                result.fileResultsArray = Object.values(fileResults);
            }
            
            // Add the result to the almanac
            almanac.addRuntimeFact(params.resultFact, result);
            
            logger.info(`Global file analysis complete: ${JSON.stringify(result.summary)}`);
            
            return result;
        } catch (error) {
            logger.error(`Error in globalFileAnalysis: ${error}`);
            return result;
        }
    }
};
