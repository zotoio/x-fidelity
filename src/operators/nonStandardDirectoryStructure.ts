import { OperatorDefn } from '../types/typeDefs';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { isPathInside } from '../utils/pathUtils';
import { REPO_GLOBAL_CHECK } from '../core/configManager';
import { options } from '../core/cli';

const nonStandardDirectoryStructure: OperatorDefn = {
    'name': 'nonStandardDirectoryStructure',
    'fn': (filePath: any, standardStructure: any) => {
        if (filePath !== REPO_GLOBAL_CHECK) {
            return false;
        }

        logger.debug(`running global directory structure analysis..`);

        const repoPath = options.dir;
        let result = false;

        // check the directory structure of the repo against the standard structure
        function checkStructure(currentPath: string, structure: any): boolean {
            for (const key in structure) {
                const newPath = path.resolve(currentPath, key);
                if (!isPathInside(newPath, repoPath)) { 
                    logger.warn(`Resolved path ${newPath} is outside allowed directory ${repoPath}`);
                    return true;
                }
                
                logger.debug(`checking ${newPath}`);
                if (!fs.existsSync(newPath) || !fs.lstatSync(newPath).isDirectory()) {
                    logger.debug(`Missing or invalid directory: ${newPath}`);
                    return true;
                } else {
                    if (structure[key] !== null) {
                        const subResult = checkStructure(newPath, structure[key]);
                        if (subResult) {
                            return true;
                        }
                    }
                }
            }
            return result;
        }

        result = checkStructure(repoPath, standardStructure);
        
        return result;
    }
};

export { nonStandardDirectoryStructure };
