import { RuleDefn } from '../typeDefs';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

const standardStructure = {
    "level1": ["src", "tests", "docs"],
    "level2": {
        "src": ["core", "utils", "operators", "rules", "facts"],
        "tests": ["unit", "integration"],
        "docs": []
    },
    "level3": {
        "core": ["cli.ts", "engine.ts"],
        "utils": ["logger.ts"],
        "operators": ["index.ts", "fileContains.ts", "currentDependencies.ts"],
        "rules": ["index.ts"],
        "facts": ["repoDependencyFacts.ts", "repoFilesystemFacts.ts"],
        "unit": [],
        "integration": []
    }
};

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
