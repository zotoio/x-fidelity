import { execSync } from 'child_process';
import { collectLocalDependencies, getDependencyVersionFacts, findPropertiesInTree } from './repoDependencyFacts';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config';
import { arch } from 'os';
import { archetypes } from '../archetypes';

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('../utils/config', () => ({
    ConfigManager: {
        getInstance: jest.fn().mockReturnValue({
            getConfig: jest.fn().mockReturnValue({
                config: {
                    minimumDependencyVersions: { commander: '^2.0.0', nodemon: '^3.9.0' }
                }
            })
        })
    }
}));

describe('collectLocalDependencies', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return parsed JSON result when execSync succeeds', () => {
        const mockResult = JSON.stringify({ dependencies: {} });
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockResult));

        const result = collectLocalDependencies();
        expect(result).toEqual({ dependencies: {} });
    });

    it('should log error and return empty object when execSync fails', () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('mock error');
        });

        const result = collectLocalDependencies();
        expect(logger.error).toHaveBeenCalledWith('exec error: Error: mock error');
        expect(result).toEqual({});
    });

    it('should handle non-JSON response gracefully', () => {
        (execSync as jest.Mock).mockReturnValue(Buffer.from('invalid json'));

        const result = collectLocalDependencies();
        expect(result).toEqual({});
    });
});

describe('getDependencyVersionFacts', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return installed dependency versions correctly', async () => {
        const mockLocalDependencies = { dependencies: { commander: { version: '2.0.0' }, nodemon: { version: '3.9.0' } } };
        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockLocalDependencies)));
        
        const result = await getDependencyVersionFacts(archetypes['node-fullstack']);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should return an empty array if no dependencies match minimum versions', async () => {
        const mockLocalDependencies = { dependencies: { someOtherDep: { version: '1.0.0' } } };
        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockLocalDependencies)));
        
        const result = await getDependencyVersionFacts(archetypes['node-fullstack']);
        expect(result).toEqual([]);
    });
});

describe('findPropertiesInTree', () => {
    it('should find properties in the tree correctly', () => {
        const depGraph = {
            commander: { version: '2.0.0' },
            nodemon: { version: '3.9.0' }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should handle exact version matches', () => {
        const depGraph = {
            express: { version: '4.17.1' },
            lodash: { version: '4.17.21' }
        };
        const minVersions = { express: '4.17.1', lodash: '4.17.21' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'express', ver: '4.17.1', min: '4.17.1' },
            { dep: 'lodash', ver: '4.17.21', min: '4.17.21' }
        ]);
    });

    it('should handle caret ranges', () => {
        const depGraph = {
            react: { version: '17.0.2' },
            typescript: { version: '4.3.5' }
        };
        const minVersions = { react: '^17.0.0', typescript: '^4.3.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'react', ver: '17.0.2', min: '^17.0.0' },
            { dep: 'typescript', ver: '4.3.5', min: '^4.3.0' }
        ]);
    });

    it('should handle tilde ranges', () => {
        const depGraph = {
            moment: { version: '2.29.1' },
            axios: { version: '0.21.1' }
        };
        const minVersions = { moment: '~2.29.0', axios: '~0.21.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'moment', ver: '2.29.1', min: '~2.29.0' },
            { dep: 'axios', ver: '0.21.1', min: '~0.21.0' }
        ]);
    });

    it('should handle greater than ranges', () => {
        const depGraph = {
            jquery: { version: '3.6.0' },
            underscore: { version: '1.13.1' }
        };
        const minVersions = { jquery: '>3.0.0', underscore: '>=1.13.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'jquery', ver: '3.6.0', min: '>3.0.0' },
            { dep: 'underscore', ver: '1.13.1', min: '>=1.13.0' }
        ]);
    });

    it('should handle x-ranges', () => {
        const depGraph = {
            chalk: { version: '4.1.2' },
            jest: { version: '27.0.6' }
        };
        const minVersions = { chalk: '4.x', jest: '27.0.x' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'chalk', ver: '4.1.2', min: '4.x' },
            { dep: 'jest', ver: '27.0.6', min: '27.0.x' }
        ]);
    });

    it('should handle hyphen ranges', () => {
        const depGraph = {
            webpack: { version: '5.45.1' },
            babel: { version: '7.14.8' }
        };
        const minVersions = { webpack: '5.0.0 - 5.50.0', babel: '7.14.0 - 7.15.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'webpack', ver: '5.45.1', min: '5.0.0 - 5.50.0' },
            { dep: 'babel', ver: '7.14.8', min: '7.14.0 - 7.15.0' }
        ]);
    });
        const depGraph = {
            commander: { version: '2.0.0' },
            nodemon: { version: '3.9.0' }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should return an empty array if no properties match', () => {
        const depGraph = {
            someOtherDep: { version: '1.0.0' }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([]);
    });

    it('should handle nested dependencies correctly', () => {
        const depGraph = {
            commander: { 
                version: '2.0.0',
                dependencies: {
                    nodemon: { version: '3.9.0' }
                }
            }    
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should handle complex mixed structures', () => {
        const depGraph = {
            commander: { 
                version: '2.0.0',
                dependencies: {
                    nodemon: {
                        version: '3.9.0',
                        dependencies: {
                            lodash: { 
                                version: '4.17.21' 
                            }
                        }
                    }    
                }
            }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0', lodash: '^4.17.20' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' },
            { dep: 'lodash', ver: '4.17.21', min: '^4.17.20' }
        ]);
    });
});
