import fs from 'fs';
import path from 'path';

// Define the structure the file data here using ast-parser package
interface FileData {
    // Add properties to the FileData interface
    fileName: string;
    filePath: string;
    content: string;
}

function parseFile(filePath: string): FileData {
    // Implement the logic to parse the file and return the FileData object
    return {
        fileName: path.basename(filePath),
        filePath,
        content: fs.readFileSync(filePath, 'utf8')
    };
}

// use fs and path to traverse the repo
function parseRepo(repoPath: string): FileData[] {
    const filesData: FileData[] = [];
    const files = fs.readdirSync(repoPath);

    for (const file of files) {
        const filePath = path.join(repoPath, file);
        if (!ignored(filePath)) {
            if (fs.lstatSync(filePath).isDirectory()) {
                filesData.push(...parseRepo(filePath));
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
        || file.startsWith('node_modules')
        || file.startsWith('dist')
        || file.endsWith('md')
        || file.endsWith('lock')
        || file.includes('LICENSE');
}

export { parseRepo, FileData }
