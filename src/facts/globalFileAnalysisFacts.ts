import { logger } from '../utils/logger';
import { FactDefn, FileData } from '../types/typeDefs';
import { maskSensitiveData } from '../utils/maskSensitiveData';

export const globalFileAnalysis: FactDefn = {
    name: 'globalFileAnalysis',
    fn: async (params: any, almanac: any) => {
        const result: any = { result: [], matchCounts: {}, fileMatches: {} };
        
        try {
            // Get all file data from the almanac
            const globalFileMetadata: FileData[] = await almanac.factValue('globalFileMetadata');
            if (!Array.isArray(globalFileMetadata)) {
                logger.error('Invalid globalFileMetadata');
                return result;
            }

            // Extract parameters
            const patterns = Array.isArray(params.patterns) ? params.patterns : [params.patterns];
            const fileFilter = params.fileFilter || '.*';
            const fileFilterRegex = new RegExp(fileFilter);
            
            logger.info(`Running global file analysis with ${patterns.length} patterns across ${globalFileMetadata.length} files`);
            
            // Filter files based on fileFilter parameter
            const filteredFiles = globalFileMetadata.filter(file => 
                file.fileName !== 'REPO_GLOBAL_CHECK' && fileFilterRegex.test(file.filePath)
            );
            
            logger.info(`Analyzing ${filteredFiles.length} files after filtering`);
            
            // Initialize match counts for each pattern
            patterns.forEach((pattern: string) => {
                result.matchCounts[pattern] = 0;
                result.fileMatches[pattern] = [];
            });
            
            // Process each file
            for (const file of filteredFiles) {
                const fileContent = file.fileContent;
                if (!fileContent) continue;
                
                const lines = fileContent.split('\n');
                
                // Check each pattern against the file
                for (const pattern of patterns) {
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
                                match: match[0],
                                context: maskSensitiveData(line.trim())
                            });
                        }
                    }
                    
                    // Update results if matches found
                    if (fileMatches > 0) {
                        result.matchCounts[pattern] += fileMatches;
                        result.fileMatches[pattern].push({
                            filePath: file.filePath,
                            matchCount: fileMatches,
                            matches: matchDetails
                        });
                    }
                }
            }
            
            // Add summary to result
            result.summary = {
                totalFiles: filteredFiles.length,
                totalMatches: Object.values(result.matchCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0),
                patternCounts: result.matchCounts
            };
            
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
