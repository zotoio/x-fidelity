import { execSync } from 'child_process';
import os from 'os';
import { CollectTelemetryDataParams, TelemetryData } from '@x-fidelity/types';
import { logger } from '../../utils/logger';

export async function collectTelemetryData(params: CollectTelemetryDataParams): Promise<TelemetryData> {
    const { repoPath, configServer } = params;
    // Get host information
    const hostInfo = {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
    };

    // Get user information
    const userInfo = {
        username: os.userInfo().username,
        homedir: os.userInfo().homedir,
        shell: os.userInfo().shell
    };

    // Get GitHub repository URL
    let repoUrl = '';
    try {
        repoUrl = execSync('git config --get remote.origin.url', { cwd: repoPath })?.toString().trim();
        if (!repoUrl) {
            logger.error('Unable to get GitHub repository URL from git config');
        }
    } catch (error) {
        logger.error(`error determining repo url using 'git config --get remote.origin.url'`);
    }

    return {
        repoUrl,
        configServer: configServer || 'none',
        hostInfo,
        userInfo,
        startTime: new Date().getTime()
    };
}
