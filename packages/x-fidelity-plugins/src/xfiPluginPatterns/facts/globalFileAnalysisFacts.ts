import { FactDefn, FileData } from '@x-fidelity/types';
import { logger, repoDir, maskSensitiveData } from '@x-fidelity/core';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Result cache to avoid redundant processing
export const analysisCache = new Map<string, any>();

// Helper function to create cache key from parameters
function createCacheKey(params: any): string {
    const keyData = {
        newPatterns: params.newPatterns || [],
        legacyPatterns: params.legacyPatterns || [],
        patterns: params.patterns || [],
        fileFilter: params.fileFilter || '.*',
        outputGrouping: params.outputGrouping || 'file',
        captureGroups: params.captureGroups || false,
        contextLength: params.contextLength || 50
    };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
}

// Helper function to get rule context
function getRuleContext(almanac: any, params: any): string {
    // Try to get rule name from various sources
    let ruleContext = 'unknown-rule';
    
    try {
        // Check if almanac has current rule context
        if (almanac && almanac.currentRule && almanac.currentRule.name) {
            ruleContext = almanac.currentRule.name;
        } else if (params.resultFact) {
            // Use resultFact as context hint
            ruleContext = `rule-using-${params.resultFact}`;
        } else if (params.ruleContext) {
            // Direct rule context parameter
            ruleContext = params.ruleContext;
        }
    } catch (error) {
        // Fallback to parameter-based context
        ruleContext = params.resultFact || 'unnamed-rule';
    }
    
    return ruleContext;
}

export const globalFileAnalysis: FactDefn = {
    name: 'globalFileAnalysis',
    description: 'Analyzes global file patterns and structure with enhanced position tracking',
    fn: async (params: any, almanac: any) => {
        const result: any = { 
            patternData: [],
            fileResults: [],
        };
        
        try {
            // Get rule context for better logging
            const ruleContext = getRuleContext(almanac, params);
            
            // Create cache key for result caching
            const cacheKey = createCacheKey(params);
            
            // Check cache first
            if (analysisCache.has(cacheKey)) {
                logger.debug(`[${ruleContext}] Using cached global file analysis result (cache key: ${cacheKey.substring(0, 8)}...)`);
                const cachedResult = analysisCache.get(cacheKey);
                
                // Add the result to the almanac even for cached results
                if (params.resultFact) {
                    almanac.addRuntimeFact(params.resultFact, cachedResult);
                }
                
                return cachedResult;
            }

            // Get all file data from the almanac
            const globalFileMetadata: FileData[] = await almanac.factValue('globalFileMetadata');
            if (!Array.isArray(globalFileMetadata)) {
                logger.error(`[${ruleContext}] Invalid globalFileMetadata`);
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
            
            // Enhanced parameters (always enabled)
            const captureGroups = params.captureGroups || false;
            const contextLength = params.contextLength || 50;
            
            // Combine all patterns for processing
            const allPatterns = [...newPatterns, ...legacyPatterns, ...patterns];
            
            // More specific logging with rule context and parameters
            logger.info(`[${ruleContext}] Running global file analysis: ${newPatterns.length} new patterns, ${legacyPatterns.length} legacy patterns, ${patterns.length} regular patterns, filter: "${fileFilter}", across ${globalFileMetadata.length} files`);
            
            // Filter files based on fileFilter parameter
            const filteredFiles = globalFileMetadata.filter(file => 
                file.fileName !== 'REPO_GLOBAL_CHECK' && fileFilterRegex.test(file.filePath)
            );
            
            logger.debug(`[${ruleContext}] Analyzing ${filteredFiles.length} files after filtering with pattern: ${fileFilter}`);
            
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
                        
                        // Reset regex for each line
                        regex.lastIndex = 0;
                        
                        while ((match = regex.exec(line)) !== null) {
                            fileMatches++;
                            
                            const startColumn = match.index + 1; // 1-based
                            const endColumn = startColumn + match[0].length;
                            
                            // Get enhanced context around the match
                            let enhancedContext = line;
                            if (contextLength > 0 && contextLength < line.length) {
                                const contextStart = Math.max(0, match.index - Math.floor(contextLength / 2));
                                const contextEnd = Math.min(line.length, match.index + match[0].length + Math.floor(contextLength / 2));
                                enhancedContext = line.substring(contextStart, contextEnd);
                                
                                // Add ellipsis if we're showing partial context
                                if (contextStart > 0) enhancedContext = '...' + enhancedContext;
                                if (contextEnd < line.length) enhancedContext = enhancedContext + '...';
                            }
                            
                            const matchInfo = {
                                lineNumber: i + 1,
                                match: pattern,
                                matchText: match[0],
                                range: {
                                    start: { line: i + 1, column: startColumn },
                                    end: { line: i + 1, column: endColumn }
                                },
                                context: maskSensitiveData(enhancedContext),
                                groups: captureGroups && match.length > 1 ? match.slice(1) : undefined
                            };
                            
                            matchDetails.push(matchInfo);
                            
                            // For global regex, prevent infinite loop
                            if (!regex.global || regex.lastIndex === 0) {
                                break;
                            }
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
            
            // Create matchCounts for convenience
            result.matchCounts = {};
            result.patternData.forEach((entry: any) => {
                result.matchCounts[entry.pattern] = entry.count;
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
                legacyPatternsTotal: legacyPatternsTotal,
                // Enhanced summary info (always enabled)
                hasPositionData: true,
                captureGroups: captureGroups,
                contextLength: contextLength,
                // Add cache info
                cacheKey: cacheKey.substring(0, 8),
                ruleContext: ruleContext
            };
            
            // Add results based on the requested output grouping
            if (outputGrouping === 'file' && fileResults) {
                result.fileResults = Object.values(fileResults);
                // Only include patternData in the result if pattern grouping is requested
                delete result.patternData;
            } else {
                // For pattern grouping, don't include fileResults
                delete result.fileResults;
            }
            
            // Cache the result before adding to almanac
            analysisCache.set(cacheKey, result);
            
            // Add the result to the almanac
            if (params.resultFact) {
                almanac.addRuntimeFact(params.resultFact, result);
            }
            
            // Change to debug level and include more specific information
            logger.debug(`[${ruleContext}] Global file analysis complete - ${result.summary.totalMatches} matches across ${result.summary.totalFiles} files, cache key: ${cacheKey.substring(0, 8)}...`);
            
            return result;
        } catch (error: unknown) {
            const ruleContext = getRuleContext(almanac, params);
            logger.error(`[${ruleContext}] Error in globalFileAnalysis: ${error}`);
            return result;
        }
    }
};
