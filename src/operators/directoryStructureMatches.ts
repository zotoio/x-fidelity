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

        for (const level1Dir of standardStructure.level1) {
            const level1Path = path.join(repoPath, level1Dir);
            if (!fs.existsSync(level1Path) || !fs.lstatSync(level1Path).isDirectory()) {
                result = false;
                break;
            }
        }

        logger.debug(`directoryStructureMatches for '${repoPath}': ${result}`);
        hasChecked = true;
        return result;
    }
};

export { directoryStructureMatches };
