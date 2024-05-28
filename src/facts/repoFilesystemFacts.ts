import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface FileData {
    fileName: string;
    filePath: string;
    fileContent: string;
}

function parseFile(filePath: string): FileData {
    return {
        fileName: path.basename(filePath),
        filePath,
        fileContent: fs.readFileSync(filePath, 'utf8')
    };
}

async function collectRepoFileData(repoPath: string): Promise<FileData[]> {
    const filesData: FileData[] = [];

    logger.debug(`collectingRepoFileData from: ${repoPath}`);
    const files = await fs.promises.readdir(repoPath);

    for (const file of files) {
        const filePath = path.join(repoPath, file);
        if (!ignored(filePath)) {
            const stats = await fs.promises.lstat(filePath);
            if (stats.isDirectory()) {
                const dirFilesData = await collectRepoFileData(filePath);
                filesData.push(...dirFilesData);
            } else {
                const fileData = parseFile(filePath);
                filesData.push(fileData);
            }
        }
    }
    return filesData;
}

function ignored(file: string){
    return file.startsWith('.') 
        || file.includes('node_modules')
        || file.includes('/.')
        || file.endsWith('-rule.json')
        || file.includes('/dist/')
        || file.includes('/lcov')
        || file.startsWith('dist')
        || file.endsWith('md')
        || file.endsWith('.log')
        || file.includes('LICENSE');
}

export { collectRepoFileData, FileData }