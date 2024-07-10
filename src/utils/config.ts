
import axios from "axios";
import { logger } from "../utils/logger";

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';
/**
  * Collects the minimum dependency versions.
  * @returns The minimum dependency versions.
  */

export async function collectMinimumDependencyVersions(configUrl?: string) {
    if (configUrl) {
        try {
            const response = await axios.get(configUrl);
            return response.data.minimumDependencyVersions;
        } catch (error) {
            logger.error(`Error fetching minimum dependency versions from configUrl: ${error}`);
            return {};
        }
    } else {
        return {
            commander: '^2.0.0',
            nodemon: '^3.9.0'
        };
    }
}

export async function collectStandardRepoStructure(configUrl?: string) {
    if (configUrl) {
        try {
            const response = await axios.get(configUrl);
            return response.data.standardStructure;
        } catch (error) {
            logger.error(`Error fetching standard project structure from configUrl: ${error}`);
            return standardStructure;
        }
    } else {
        return standardStructure;
    }
}

export const defaultBlacklistPatterns: RegExp[] = [
    /.*\/\..*/, // dot files
    /.*\.(log|lock)$/, // file extensions blacklisted
    /.*\/(dist|coverage|build|node_modules)(\/.*|$)/ // directory names blacklisted
];

// only include these file patterns, if not in blacklistPatterns
export const defaultWhitelistPatterns: RegExp[] = [
    /.*\.(ts|js|md)$/,
    /.*\/(package|tsconfig)\.json$/
];

export const standardStructure = {
    "src": {
        "core": null,
        "utils": null,
        "operators": null,
        "rules": null,
        "facts": null,
        "FAIL": null
    }
};

