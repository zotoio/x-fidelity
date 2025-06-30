import { FactDefn, FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { glob } from 'glob';
import { join } from 'path';

export const missingRequiredFilesFact: FactDefn = {
    name: 'missingRequiredFiles',
    description: 'Checks for required files in the repository',
    type: 'global',
    fn: async (params: unknown, almanac?: unknown) => {
        try {
            const fileData = params as FileData;
            const requiredFiles = (params as any)?.requiredFiles || [];
            const repoPath = (params as any)?.repoPath || '.';

            const existingFiles = await glob('**/*', {
                cwd: repoPath,
                nodir: true,
                ignore: ['**/node_modules/**', '**/.git/**']
            });

            const missingFiles = requiredFiles.filter((pattern: string) => {
                const matchingFiles = existingFiles.filter(file => 
                    file.toLowerCase() === pattern.toLowerCase() ||
                    file.toLowerCase().endsWith('/' + pattern.toLowerCase())
                );
                return matchingFiles.length === 0;
            });

            return {
                missing: missingFiles,
                total: requiredFiles.length,
                found: requiredFiles.length - missingFiles.length
            };
        } catch (error) {
            logger.error('Error in missingRequiredFiles fact:', error);
            return {
                missing: [],
                total: 0,
                found: 0
            };
        }
    }
};
