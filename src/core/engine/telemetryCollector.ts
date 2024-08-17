import { execSync } from 'child_process';
import os from 'os';
import { CollectTelemetryDataParams, TelemetryData } from '../../types/typeDefs';
import { logger } from '../../utils/logger';
import fs from 'fs'; 

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
        repoUrl = execSync('git config --get remote.origin.url', { cwd: repoPath }).toString().trim();
    } catch (error) {
        try {
            const packageJson = await fs.promises.readFile(`${repoPath}/package.json`, 'utf8');
            const packageJsonObj = JSON.parse(packageJson);
            repoUrl = packageJsonObj?.repository;
        } catch (error) {
            logger.warn('Unable to get GitHub repository URL');
        }
    }

    return {
        repoUrl,
        configServer: configServer || 'none',
        hostInfo,
        userInfo,
        startTime: new Date().getTime()
    };
}
