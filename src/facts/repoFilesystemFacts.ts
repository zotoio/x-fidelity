import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfig, FileData, IsBlacklistedParams, isWhitelistedParams } from '../types/typeDefs';
import { maskSensitiveData } from '../utils/maskSensitiveData';

async function parseFile(filePath: string): Promise<FileData> {
    try {
        return Promise.resolve({
            fileName: path.basename(filePath),
            filePath,
            fileContent: fs.readFileSync(filePath, 'utf8')
        });
    } catch (error) {
        logger.warn(`Error reading file ${filePath}: ${error}`);
        throw error;
    }
}

async function collectRepoFileData(repoPath: string, archetypeConfig: ArchetypeConfig): Promise<FileData[]> {
    const filesData: FileData[] = [];

    logger.debug({ 
        repoPath,
        operation: 'collect-files'
    }, 'Collecting repo file data');
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
            if (!isBlacklisted({ filePath, repoPath, blacklistPatterns: archetypeConfig.config.blacklistPatterns })) {
                const dirFilesData = await collectRepoFileData(filePath, archetypeConfig);
                filesData.push(...dirFilesData);
            }    
        } else {
            if (!isBlacklisted({ filePath, repoPath, blacklistPatterns: archetypeConfig.config.blacklistPatterns }) && isWhitelisted({ filePath, repoPath, whitelistPatterns: archetypeConfig.config.whitelistPatterns })) {
                logger.debug({ filePath }, 'Adding file to analysis');
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

    logger.debug({ checkPatterns, filePath }, 'Running repo file analysis');

    if (fileData.fileName === 'REPO_GLOBAL_CHECK' || checkPatterns.length === 0 || !fileContent) {
        return result;
    }

    //if there is already a resultFact for this file, we need to append
    const existingResult = almanac.factValue(params.resultFact);
    if (Object.keys(existingResult).includes('result')) {
        logger.error(JSON.stringify(existingResult));
        result.result = existingResult.result;
    }

    const analysis: any = [];
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
            const regex = new RegExp(pattern, 'g');
            if (regex.test(line)) {
                logger.debug({ lineNumber: i + 1, pattern }, 'Found pattern match');
                const match = {
                    'match': pattern,
                    'lineNumber': i + 1,
                    'line': maskSensitiveData(line)
                };
                analysis.push(match);
            }
        }
    }

    const resultLength = result.result.length;
    const analysisLength = analysis.length;
    if (analysisLength > 0) {
        logger.warn({ filePath, analysis }, 'Found issues in file analysis');

        //preallocate the array to the correct length
        result.result.length = resultLength + analysisLength;
        for (let i = 0; i < analysisLength; i++) {
            const fileAnalysis = analysis[i];
            result.result[resultLength + i] = fileAnalysis[i];
        }  
    }

    result.result = analysis;

    almanac.addRuntimeFact(params.resultFact, result.result);

    return result;

    // testing match on 'oracle'
    // testing match on 'declare'
}

export { collectRepoFileData, repoFileAnalysis, parseFile, isBlacklisted, isWhitelisted, FileData }
