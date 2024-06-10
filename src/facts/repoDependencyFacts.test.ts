import { execSync } from 'child_process';
import { collectMinimumDependencyVersions, collectLocalDependencies, getDependencyVersionFacts, findPropertiesInTree } from './repoDependencyFacts';
import { logger } from '../utils/logger';
import _ from 'lodash';

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('collectMinimumDependencyVersions', () => {
    it('should return the correct minimum dependency versions', async () => {
        const result = await collectMinimumDependencyVersions();
        expect(result).toEqual({
            commander: '^2.0.0',
            nodemon: '^3.9.0'
        });
    });
});

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
        //expect(console.error).toHaveBeenCalledWith('exec error: Error: mock error');
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
        const mockMinimumVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };
        
        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockLocalDependencies)));
        
        const result = await getDependencyVersionFacts();
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should return an empty array if no dependencies match minimum versions', async () => {
        const mockLocalDependencies = { dependencies: { someOtherDep: { version: '1.0.0' } } };
        const mockMinimumVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockLocalDependencies)));
        
        const result = await getDependencyVersionFacts();
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
                commander: { version: '2.0.0',
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

    it('should not add non-matching dependencies to results', () => {
        const depGraph = {
            someOtherDep: { version: '1.0.0' }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([]);
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
        //console.log(result);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' },
            { dep: 'lodash', ver: '4.17.21', min: '^4.17.20' }
        ]);
    });
});
