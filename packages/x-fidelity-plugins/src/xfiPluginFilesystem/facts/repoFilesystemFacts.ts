import fs from 'fs';
import path from 'path';
import { logger } from '@x-fidelity/core';
import { ArchetypeConfig, FileData, IsBlacklistedParams, isWhitelistedParams, FactDefn } from '@x-fidelity/types';
// Filesystem facts for repository analysis
import { maskSensitiveData } from '@x-fidelity/core';

async function parseFile(filePath: string): Promise<FileData> {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return Promise.resolve({
            fileName: path.basename(filePath),
            filePath,
            fileContent: content,
            content: content  // Add required content property
        });
    } catch (error) {
        logger.warn(`Error reading file ${filePath}: ${error}`);
        throw error;
    }
}

async function collectRepoFileData(repoPath: string, archetypeConfig: ArchetypeConfig): Promise<FileData[]> {
    const filesData: FileData[] = [];
    const visitedPaths = new Set();
    
    const files = fs.readdirSync(repoPath);
    for (const file of files) {
        const baseDir = path.resolve(repoPath);
        const filePath = path.resolve(baseDir, file);
        
        let realFilePath;
        try {
            realFilePath = fs.realpathSync(filePath);
        } catch (err) {
            logger.warn(`Error resolving real path for ${filePath}, using original path. Error: ${err}`);
            realFilePath = filePath;
        }
        if (!realFilePath.startsWith(baseDir)) {
            logger.warn(`Path traversal attempt detected: ${realFilePath}`);
            continue;
        }
        if (visitedPaths.has(realFilePath)) {
            logger.debug(`Already processed symlink target: ${realFilePath}`);
            continue;
        }
        visitedPaths.add(realFilePath);
        
        logger.debug({ filePath }, 'Checking file');
        const statFn = fs.promises.stat || fs.promises.lstat;
        const stats = await statFn(filePath);
        
        if (stats.isDirectory()) {
            const isBlacklistedDir = isBlacklisted({ filePath, repoPath, blacklistPatterns: archetypeConfig.config.blacklistPatterns });
            logger.debug({ filePath, isBlacklisted: isBlacklistedDir }, 'Checking file against blacklist patterns');
            if (!isBlacklistedDir) {
                const dirFilesData = await collectRepoFileData(filePath, archetypeConfig);
                filesData.push(...dirFilesData);
            }    
        } else {
            const isBlacklistedFile = isBlacklisted({ filePath, repoPath, blacklistPatterns: archetypeConfig.config.blacklistPatterns });
            const isWhitelistedFile = isWhitelisted({ filePath, repoPath, whitelistPatterns: archetypeConfig.config.whitelistPatterns });
            logger.debug({ filePath, isBlacklisted: isBlacklistedFile, isWhitelisted: isWhitelistedFile }, 'Checking file against blacklist patterns');
            if (!isBlacklistedFile && isWhitelistedFile) {
                const fileData = await parseFile(filePath);
                fileData.relativePath = path.relative(repoPath, filePath);
                filesData.push(fileData);
            }    
        }    
    }
    
    return filesData;
}

function isBlacklisted({ filePath, repoPath, blacklistPatterns }: IsBlacklistedParams): boolean {
    logger.debug({ filePath }, 'Checking file against blacklist patterns');
    const normalizedPath = path.resolve(filePath);
    const normalizedRepoPath = path.resolve(repoPath);
    
    if (!normalizedPath.startsWith(normalizedRepoPath)) {
        logger.warn(`Potential path traversal attempt detected: ${filePath}`);
        return true;
    }
    
    for (const pattern of blacklistPatterns) {
        if (new RegExp(pattern).test(normalizedPath)) {
            logger.debug({ normalizedPath, pattern }, 'Skipping blacklisted file');
            return true;
        }
    }
    return false;
}

function isWhitelisted({ filePath, repoPath, whitelistPatterns }: isWhitelistedParams): boolean {
    logger.debug({ filePath }, 'Checking file against whitelist patterns');
    const normalizedPath = path.resolve(filePath);
    const normalizedRepoPath = path.resolve(repoPath);
    
    if (!normalizedPath.startsWith(normalizedRepoPath)) {
        logger.warn(`Potential path traversal attempt detected: ${filePath}`);
        return false;
    }
    
    for (const pattern of whitelistPatterns) {
        if (new RegExp(pattern).test(normalizedPath)) {
            logger.debug({ normalizedPath, pattern }, 'File matches whitelist pattern');
            return true;
        }
    }
    return false;
}

async function repoFileAnalysis(params: any, almanac: any) {
    const result: any = {'result': []};
    const fileData: FileData = await almanac.factValue('fileData');

    const checkPatterns: string[] = Array.isArray(params.checkPattern) ? params.checkPattern : [params.checkPattern];
    const fileContent = fileData.fileContent;
    const filePath = fileData.filePath;

    // Enhanced parameters
    const captureGroups = params.captureGroups || false;
    const contextLength = params.contextLength || 50;
    const multilineMatches = params.multilineMatches || false;

    logger.debug({ checkPatterns, filePath, captureGroups }, 'Running repo file analysis with position tracking');

    if (fileData.fileName === 'REPO_GLOBAL_CHECK' || checkPatterns.length === 0 || !fileContent) {
        return { result: [], matches: [], summary: { totalMatches: 0, patterns: checkPatterns, hasPositionData: true } };
    }

    //if there is already a resultFact for this file, we need to append
    try {
        const existingResult = await almanac.factValue(params.resultFact);
        if (existingResult && typeof existingResult === 'object' && Object.keys(existingResult).includes('result')) {
            logger.error(JSON.stringify(existingResult));
            result.result = existingResult.result;
        }
    } catch (error) {
        // Fact doesn't exist yet, which is fine - we'll create it
        logger.debug(`No existing result fact found for ${params.resultFact}, creating new one`);
    }

    const enhancedMatches: any = [];
    const lines = fileContent.split('\n');
    logger.debug({ lineCount: lines.length }, 'Processing file lines');
    const processedLines: string[] = [];
    let splitOccurred = false;

    for (const line of lines) {
        if (line.length > 200) {
            let startIndex = 0;
            while (startIndex < line.length) {
                let endIndex = startIndex + 200;
                if (endIndex < line.length) {
                    // Find the nearest space or end of token
                    while (endIndex > startIndex && !(/\s/.test(line[endIndex]) || /\W/.test(line[endIndex]))) {
                        endIndex--;
                    }
                    // If no suitable break point found, use the full 200 characters
                    if (endIndex === startIndex) {
                        endIndex = startIndex + 200;
                    }
                } else {
                    endIndex = line.length;
                }
                processedLines.push(line.substring(startIndex, endIndex));
                startIndex = endIndex;
            }
            splitOccurred = true;
        } else {
            processedLines.push(line);
        }
    }

    if (lines.length === 1 || splitOccurred) {
        logger.trace({ splitOccurred }, 'File content was processed for analysis');
    }

    for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        for (const pattern of checkPatterns) {
            const regex = new RegExp(pattern, captureGroups ? 'g' : 'g');
            let match;
            
            // Reset regex for each line
            regex.lastIndex = 0;
            
            while ((match = regex.exec(line)) !== null) {
                logger.debug({ lineNumber: i + 1, pattern, matchText: match[0] }, 'Found pattern match');
                
                const startColumn = match.index + 1; // 1-based
                const endColumn = startColumn + match[0].length;
                
                // Get context around the match
                let context = line;
                if (contextLength > 0 && contextLength < line.length) {
                    const contextStart = Math.max(0, match.index - Math.floor(contextLength / 2));
                    const contextEnd = Math.min(line.length, match.index + match[0].length + Math.floor(contextLength / 2));
                    context = line.substring(contextStart, contextEnd);
                    
                    // Add ellipsis if we're showing partial context
                    if (contextStart > 0) context = '...' + context;
                    if (contextEnd < line.length) context = context + '...';
                }
                
                const enhancedMatch = {
                    pattern: pattern,
                    match: match[0],
                    range: {
                        start: { line: i + 1, column: startColumn },
                        end: { line: i + 1, column: endColumn }
                    },
                    context: maskSensitiveData(context),
                    groups: captureGroups && match.length > 1 ? match.slice(1) : undefined
                };
                
                enhancedMatches.push(enhancedMatch);
                
                // For global regex, prevent infinite loop
                if (!regex.global || regex.lastIndex === 0) {
                    break;
                }
            }
        }
    }

    // Enhanced result format only
    result.matches = enhancedMatches;
    result.summary = {
        totalMatches: enhancedMatches.length,
        patterns: checkPatterns,
        hasPositionData: true,
        captureGroups: captureGroups,
        contextLength: contextLength
    };

    // For backward compatibility with existing code that expects result array
    result.result = enhancedMatches.map((match: any) => ({
        match: match.pattern,
        lineNumber: match.range.start.line,
        line: match.context
    }));

    almanac.addRuntimeFact(params.resultFact, result.result);

    return result;

    // testing match on 'oracle'
    // testing match on 'declare'
}

// Export fact definition for the plugin system
export const repoFilesFact: FactDefn = {
    name: 'repoFilesystemFacts',
    description: 'Collects and analyzes repository file data',
    fn: async (params: unknown, almanac?: unknown) => {
        const { repoPath, archetypeConfig } = params as { repoPath: string; archetypeConfig: ArchetypeConfig };
        return await collectRepoFileData(repoPath, archetypeConfig);
    }
};

export const repoFileAnalysisFact: FactDefn = {
    name: 'repoFileAnalysis',
    description: 'Performs pattern analysis on repository files',
    fn: repoFileAnalysis
};

export { collectRepoFileData, repoFileAnalysis, parseFile, isBlacklisted, isWhitelisted }
