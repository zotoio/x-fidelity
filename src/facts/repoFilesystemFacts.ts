import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfig } from '../types/typeDefs';

interface FileData {
    fileName: string;
    filePath: string;
    fileContent: string;
    fileAst?: any;
}

async function parseFile(filePath: string): Promise<FileData> {
    return Promise.resolve({
        fileName: path.basename(filePath),
        filePath,
        fileContent: fs.readFileSync(filePath, 'utf8')
    });
}

async function collectRepoFileData(repoPath: string, archetypeConfig: ArchetypeConfig): Promise<FileData[]> {
    const filesData: FileData[] = [];

    logger.debug(`collectingRepoFileData from: ${repoPath}`);
    const files = fs.readdirSync(repoPath);

    for (const file of files) {
        const filePath = path.join(repoPath, file);
        logger.debug(`checking file: ${filePath}`);
        const stats = await fs.promises.lstat(filePath);
        if (stats.isDirectory()) {
            if (!isBlacklisted(filePath, archetypeConfig.config.blacklistPatterns)) {
                const dirFilesData = await collectRepoFileData(filePath, archetypeConfig);
                filesData.push(...dirFilesData);
            }    
        } else {
            if (!isBlacklisted(filePath, archetypeConfig.config.blacklistPatterns) && isWhitelisted(filePath, archetypeConfig.config.whitelistPatterns)) {
                logger.debug(`adding file: ${filePath}`);
                const fileData = await parseFile(filePath);
                filesData.push(fileData);
            }    
        
        }    
    }
    return filesData;
}

function isBlacklisted(filePath: string, blacklistPatterns: string[]): boolean {
    logger.debug(`checking blacklist for file: ${filePath}`);
    for (const pattern of blacklistPatterns) {
        if (new RegExp(pattern).test(filePath)) {
            logger.debug(`skipping blacklisted file: ${filePath} with pattern: ${pattern}`);
            return true;
        }
    }
    return false;
}

function isWhitelisted(filePath: string, whitelistPatterns: string[]): boolean {
    logger.debug(`checking whitelist for file: ${filePath}`);
    for (const pattern of whitelistPatterns) {
        if (new RegExp(pattern).test(filePath)) {
            logger.debug(`allowing file: ${filePath} with pattern: ${pattern}`);
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

    logger.debug(`repoFileAnalysis run for ${checkPatterns.join(', ')} on '${filePath}'..`);

    if (fileData.fileName === 'REPO_GLOBAL_CHECK' || checkPatterns.length === 0 || !fileContent) {
        return result;
    }

    const analysis: any = [];
    const lines = fileContent.split('\n');
    logger.debug(`lines: ${lines.length}`);
    let lineNumber = 0;
    const processedLines: string[] = [];
    let splitOccurred = false;

    for (let line of lines) {
        lineNumber++;
        if (line.length > 200) {
            const chunks = line.match(/.{1,200}/g) || [];
            processedLines.push(...chunks);
            splitOccurred = true;
        } else {
            processedLines.push(line);
        }
    }

    if (lines.length === 1 || splitOccurred) {
        logger.debug(`File content was split for analysis`);
    }

    for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        for (const pattern of checkPatterns) {
            const regex = new RegExp(pattern, 'g');
            if (regex.test(line)) {
                logger.debug(`match on line ${i + 1} for pattern ${pattern}`);
                const match = {
                    'match': pattern,
                    'lineNumber': i + 1,
                    'line': line,
                    'splitOccurred': splitOccurred
                };
                analysis.push(match);
            }
        }
    }

    if (analysis.length > 0) {
        logger.error(`repoFileAnalysis '${filePath}': \n${JSON.stringify(analysis)}`);
        
    }

    result.result = analysis;

    almanac.addRuntimeFact(params.resultFact, result);

    return result;

    // testing match on 'oracle'
}

export { collectRepoFileData, repoFileAnalysis, parseFile, isBlacklisted, isWhitelisted, FileData }
