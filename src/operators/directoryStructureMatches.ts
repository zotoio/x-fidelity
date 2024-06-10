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

        function checkStructure(currentPath: string, structure: any): boolean {
            for (const key in structure) {
                const newPath = path.join(currentPath, key);
                if (structure[key] === null) {
                    if (!fs.existsSync(newPath)) {
                        return false;
                    }
                } else {
                    if (!fs.existsSync(newPath) || !fs.lstatSync(newPath).isDirectory()) {
                        return false;
                    }
                    if (!checkStructure(newPath, structure[key])) {
                        return false;
                    }
                }
            }
            return true;
        }

        result = checkStructure(repoPath, standardStructure);

        logger.debug(`directoryStructureMatches for '${repoPath}': ${result}`);
        hasChecked = true;
        return result;
    }
};

export { directoryStructureMatches };
