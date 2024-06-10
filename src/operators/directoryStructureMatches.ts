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

const directoryStructureMatches: RuleDefn = {
    'name': 'directoryStructureMatches',
    'fn': (filePath: any, standardStructure: any) => {
        const levels = filePath.split(path.sep);
        let result = true;

        if (levels.length > 1 && !standardStructure.level1.includes(levels[1])) {
            result = false;
        } else if (levels.length > 2 && !standardStructure.level2[levels[1]].includes(levels[2])) {
            result = false;
        } else if (levels.length > 3 && !standardStructure.level3[levels[2]].includes(levels[3])) {
            result = false;
        }

        logger.debug(`directoryStructureMatches for '${filePath}': ${result}`);
        return result;
    }
};

export { directoryStructureMatches };
