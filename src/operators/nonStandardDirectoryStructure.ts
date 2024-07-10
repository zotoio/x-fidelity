import { OperatorDefn } from '../typeDefs';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';
import { REPO_GLOBAL_CHECK } from '../utils/config';

const nonStandardDirectoryStructure: OperatorDefn = {
    'name': 'nonStandardDirectoryStructure',
    'fn': (filePath: any, standardStructure: any) => {
        if (filePath !== REPO_GLOBAL_CHECK) {
            return false;
        }

        console.log(`running global directory structure analysis..`);

        const repoPath = path.dirname(filePath);
        let result = false;

        // check the directory structure of the repo against the standard structure
        function checkStructure(currentPath: string, structure: any): boolean {
            for (const key in structure) {
                const newPath = path.join(currentPath, key);
                logger.debug(`checking ${newPath}`);
                if (!fs.existsSync(newPath) || !fs.lstatSync(newPath).isDirectory()) {
                    logger.debug(`Missing or invalid directory: ${newPath}`);
                    return true;
                } else {
                    result = checkStructure(newPath, structure[key]);
                }
            }
            return result;
        }

        result = checkStructure(repoPath, standardStructure);
        
        return result;
    }
};

export { nonStandardDirectoryStructure };
