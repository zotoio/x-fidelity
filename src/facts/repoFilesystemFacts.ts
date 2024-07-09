import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { defaultBlacklistPatterns, defaultWhitelistPatterns } from '../utils/config';

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

async function collectRepoFileData(repoPath: string): Promise<FileData[]> {
    const filesData: FileData[] = [];

    logger.debug(`collectingRepoFileData from: ${repoPath}`);
    const files = fs.readdirSync(repoPath);

    for (const file of files) {
        const filePath = path.join(repoPath, file);
        console.log(`checking file: ${filePath}`);
        const stats = await fs.promises.lstat(filePath);
        if (filterFiles(filePath) || stats.isDirectory()) {
            if (stats.isDirectory()) {
                const dirFilesData = await collectRepoFileData(filePath);
                filesData.push(...dirFilesData);
            } else {
                console.log(`adding file: ${filePath}`);
                const fileData = await parseFile(filePath);
                filesData.push(fileData);
            }
        }
    }
    return filesData;
}

function filterFiles(filePath: string, blacklistPatterns: RegExp[] = defaultBlacklistPatterns, whitelistPatterns: RegExp[] = defaultWhitelistPatterns): boolean {
    
    for (const pattern of blacklistPatterns) {
        if (pattern.test(filePath)) {
            console.log(`skipping blacklisted file: ${filePath} with pattern: ${pattern}`);
            return false;
        }
    }
    
    for (const pattern of whitelistPatterns) {
        if (pattern.test(filePath)) {
            console.log(`allowing file: ${filePath} with pattern: ${pattern}`);
            return true;
        }
    }

    console.log(`skipping unmatched file: ${filePath}`);
    
    return false;
}

export { collectRepoFileData, FileData }
