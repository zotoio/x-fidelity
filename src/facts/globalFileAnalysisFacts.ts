import { logger } from '../utils/logger';
import { FactDefn, FileData } from '../types/typeDefs';
import { maskSensitiveData } from '../utils/maskSensitiveData';

export const globalFileAnalysis: FactDefn = {
    name: 'globalFileAnalysis',
    fn: async (params: any, almanac: any) => {
        const result: any = { 
            matchCounts: {},
            fileMatches: {},
            fileResults: [],
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
            
            // parameter to control output format
            const outputGrouping = params.outputGrouping || 'file'; // 'pattern' or 'file'
            
            // Combine all patterns for processing
            const allPatterns = [...newPatterns, ...legacyPatterns, ...patterns];
            
            logger.info(`Running global file analysis with ${newPatterns.length} new patterns, ${legacyPatterns.length} legacy patterns, and ${patterns.length} regular patterns across ${globalFileMetadata.length} files`);
            
            // Filter files based on fileFilter parameter
            const filteredFiles = globalFileMetadata.filter(file => 
                file.fileName !== 'REPO_GLOBAL_CHECK' && fileFilterRegex.test(file.filePath)
            );
            
            logger.info(`Analyzing ${filteredFiles.length} files after filtering`);
            
            // Initialize match counts and file matches as arrays
            result.patternData = allPatterns.map((pattern: string) => ({
                pattern,
                count: 0,
                files: []
            }));
            
            // For file-centric output
            const fileResults: Record<string, any> = {};
            
            // Process each file
            for (const file of filteredFiles) {
                const fileContent = file.fileContent;
                if (!fileContent) continue;
                
                const lines = fileContent.split('\n');
                
                // We'll initialize the file entry only if we find matches
                let fileHasMatches = false;
                let fileEntry: any;
                
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
                                line: maskSensitiveData(line.trim())
                            });
                        }
                    }
                    
                    // Update results if matches found
                    if (fileMatches > 0) {
                        // Find the pattern data entry
                        const patternEntry = result.patternData.find((p: any) => p.pattern === pattern);
                        if (patternEntry) {
                            patternEntry.count += fileMatches;
                            
                            if (outputGrouping === 'pattern') {
                                // Pattern-centric output
                                patternEntry.files.push({
                                    filePath: file.filePath,
                                    matchCount: fileMatches,
                                    matches: matchDetails
                                });
                            } else {
                                // File-centric output - initialize file entry if this is the first match
                                if (!fileHasMatches) {
                                    fileHasMatches = true;
                                    fileEntry = {
                                        fileName: file.fileName,
                                        filePath: file.filePath,
                                        patternMatches: [],
                                        totalMatches: 0
                                    };
                                }
                                
                                fileEntry.patternMatches.push({
                                    pattern,
                                    matchCount: fileMatches,
                                    matches: matchDetails
                                });
                                fileEntry.totalMatches += fileMatches;
                            }
                        }
                    }
                }
                
                // Add the file entry to fileResults if matches were found
                if (outputGrouping === 'file' && fileHasMatches) {
                    fileResults[file.filePath] = fileEntry;
                }
            }
            
            // Calculate totals for new and legacy patterns
            const newPatternsTotal = newPatterns.reduce((sum: number, pattern: string) => {
                const patternEntry = result.patternData.find((p: any) => p.pattern === pattern);
                return sum + (patternEntry?.count || 0);
            }, 0);
            
            const legacyPatternsTotal = legacyPatterns.reduce((sum: number, pattern: string) => {
                const patternEntry = result.patternData.find((p: any) => p.pattern === pattern);
                return sum + (patternEntry?.count || 0);
            }, 0);
            
            // Create backward-compatible matchCounts and fileMatches
            result.matchCounts = {};
            result.fileMatches = {};
            result.patternData.forEach((entry: any) => {
                result.matchCounts[entry.pattern] = entry.count;
                result.fileMatches[entry.pattern] = entry.files;
            });
            
            // Add summary to result
            result.summary = {
                totalFiles: filteredFiles.length,
                totalMatches: result.patternData.reduce((sum: number, entry: any) => sum + entry.count, 0),
                newPatternCounts: newPatterns.reduce((counts: Record<string, number>, pattern: string) => {
                    const patternEntry = result.patternData.find((p: any) => p.pattern === pattern);
                    counts[pattern] = patternEntry?.count || 0;
                    return counts;
                }, {}),
                legacyPatternCounts: legacyPatterns.reduce((counts: Record<string, number>, pattern: string) => {
                    const patternEntry = result.patternData.find((p: any) => p.pattern === pattern);
                    counts[pattern] = patternEntry?.count || 0;
                    return counts;
                }, {}),
                newPatternsTotal: newPatternsTotal,
                legacyPatternsTotal: legacyPatternsTotal
            };
            
            // Add file-centric results if that format was requested
            if (outputGrouping === 'file' && fileResults) {
                result.fileResults = Object.values(fileResults);
            }
            
            // Add the result to the almanac
            almanac.addRuntimeFact(params.resultFact, result);
            
            logger.info(`Global file analysis complete: ${JSON.stringify(result.summary)}`);
            
            return result;
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error(error.stack, `Error in globalFileAnalysis: ${error}`);
            } else {
                logger.error(`Error in globalFileAnalysis: ${error}`);
            }
            return result;
        }
    }
};
