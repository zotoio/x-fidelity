import { logger } from '../utils/logger';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface FileData {
    fileName: string;
    filePath: string;
    fileContent: string;
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
        if (!ignored(filePath)) {
            const stats = await fs.promises.lstat(filePath);
            if (stats.isDirectory()) {
                const dirFilesData = await collectRepoFileData(filePath);
                filesData.push(...dirFilesData);
            } else {
                const fileData = await parseFile(filePath);
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

const standardStructure = {                                                                                            
    "src": {                                                                                                           
        "core": null,                                                                                                  
        "utils": null,                                                                                                 
        "operators": null,                                                                                             
        "rules": null,                                                                                                 
        "facts": null,
        "FAIL": null                                                                                                  
    }                                                                                                                  
};                                                                                                                     
                                                                                                                       
async function collectStandardDirectoryStructure(configUrl?: string) {                                                     
    if (configUrl) {                                                                                                   
        try {                                                                                                          
            const response = await axios.get(configUrl);                                                               
            return response.data.standardStructure;                                                                    
        } catch (error) {                                                                                              
            logger.error(`Error fetching standard structure from configUrl: ${error}`);                                
            return standardStructure;                                                                                  
        }                                                                                                              
    } else {                                                                                                           
        return standardStructure;                                                                                      
    }                                                                                                                  
}

export { collectRepoFileData, FileData, collectStandardDirectoryStructure }
