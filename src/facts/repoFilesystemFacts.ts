import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfig } from '../typeDefs';

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

export { collectRepoFileData, parseFile, isBlacklisted, isWhitelisted, FileData }
