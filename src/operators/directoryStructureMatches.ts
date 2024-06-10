import { RuleDefn } from '../typeDefs';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

let hasChecked = false;

const directoryStructureMatches: RuleDefn = {
    'name': 'directoryStructureMatches',
    'fn': (filePath: any, standardStructure: any) => {
        if (filePath !== 'yarn.lock' || hasChecked) {
            return true;
        }

        const repoPath = path.dirname(filePath);
        let result = true;

        // check the directory structure of the repo against the standard structure
        function checkStructure(currentPath: string, structure: any): boolean {
            for (const key in structure) {
                const newPath = path.join(currentPath, key);
                logger.debug(`checking ${newPath}`);
                if (!fs.existsSync(newPath) || !fs.lstatSync(newPath).isDirectory()) {
                    logger.debug(`Missing or invalid directory: ${newPath}`);
                    return false;
                } else {
                    result = checkStructure(newPath, structure[key]);
                }
            }
            return result;
        }

        const checkResult = checkStructure(repoPath, standardStructure);
        //console.log(checkResult)
        if (!checkResult) {
            result = false;
        } 
        hasChecked = true;
        return result;
    }
};

export { directoryStructureMatches };
