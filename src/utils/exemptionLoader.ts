import { axiosClient } from "./axiosClient";
import { logger } from "./logger";
import { Exemption, IsExemptParams, LoadExemptionsParams } from "../types/typeDefs";
import { sendTelemetry } from "./telemetry";
import { exemptions } from "../archetypes";
import path from "path";
import fs from "fs";
import { isPathInside } from "./pathUtils";

const SHARED_SECRET = process.env.XFI_SHARED_SECRET;

export async function loadExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { configServer, localConfigPath } = params;
    if (configServer) {
        return await loadRemoteExemptions(params);
    } else if (localConfigPath) {
        return await loadLocalExemptions(params);
    } else {
        return await loadDefaultExemptions(params);
    }
}

export async function loadRemoteExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { configServer, logPrefix, archetype } = params;
    try {
        const exemptionsUrl = new URL(`/archetypes/${archetype}/exemptions`, configServer).toString();
        logger.info(`Fetching remote exemptions from: ${exemptionsUrl}`);
        const response = await axiosClient.get(exemptionsUrl, {
            headers: {
                'X-Log-Prefix': logPrefix || '',
                'X-Shared-Secret': SHARED_SECRET || ''
            },
            validateStatus: (status) => status === 200
        });
        const fetchedExemptions = response.data;
        logger.info(`Remote exemptions fetched successfully ${JSON.stringify(fetchedExemptions)}`);
        return fetchedExemptions;
    } catch (error) {
        logger.error(`Error loading remote exemptions: ${error}`);
        return [];
    }
}

export async function loadLocalExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { localConfigPath, archetype } = params;
    const normalizedLocalConfigPath = path.normalize(localConfigPath);
    const normalizedArchetype = path.normalize(archetype).replace(/^(\.\.[/\\])+/, '');
    const exemptionsPath = path.join(normalizedLocalConfigPath, `${normalizedArchetype}-exemptions.json`);

    if (!isPathInside(exemptionsPath, normalizedLocalConfigPath)) {
        logger.error(`Invalid path: ${exemptionsPath} is outside of ${normalizedLocalConfigPath}`);
        return [];
    }

    let exemptions: Exemption[] = [];
    try {
        const exemptionsData = await fs.promises.readFile(exemptionsPath, 'utf-8');
        exemptions = JSON.parse(exemptionsData);
        logger.info(`Loaded ${exemptions.length} exemptions`);
        logger.debug(`Exemptions: ${JSON.stringify(exemptions)}`);
    } catch (error) {
        logger.warn(`Failed to load exemptions: ${error}`);
        exemptions = [];
    }
    return exemptions;
}

export function normalizeGitHubUrl(url: string): string {
    // if url only contains one slash, just return it
    if (url?.indexOf('/') === url?.lastIndexOf('/')) {
        return url;
    }
    return url?.replace(/^(https?:\/\/)?([^/]+)\//, '').replace(/\.git$/, '');
}

export function isExempt(params: IsExemptParams): boolean {
    const { repoUrl, ruleName, exemptions, logPrefix } = params;
    try {
        if (!repoUrl) {
            logger.warn(`
                Exemptions disabled, as repoUrl and ruleName are required.
                - Either your git repo does not have a remote origin or the rule name is missing.  
                - You can check your repo origin exists with 'git config --get remote.origin.url`);
            return false;
        }
        const now = new Date();
        const normalizedRepoUrl = normalizeGitHubUrl(repoUrl);
        const exemption = exemptions.find(exemption =>
            normalizeGitHubUrl(exemption.repoUrl) === normalizedRepoUrl &&
            exemption.rule === ruleName &&
            new Date(exemption.expirationDate) > now
        );
        if (exemption) {
            logger.error(`Exempting rule ${ruleName} for repo ${repoUrl} until ${exemption.expirationDate}`);

            // Send telemetry event for the allowed exemption
            sendTelemetry({
                eventType: 'exemptionAllowed',
                metadata: {
                    repoUrl: exemption.repoUrl,
                    rule: exemption.rule,
                    expirationDate: exemption.expirationDate,
                    reason: exemption.reason
                },
                timestamp: new Date().toISOString()
            }, logPrefix);

            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Error checking exemption: ${error}`);
        return false;
    }    
}

async function loadDefaultExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { archetype } = params;
    const result = archetype && exemptions && Array.isArray(exemptions[archetype]) ? exemptions[archetype] : [];
    logger.debug(`Loaded ${result.length} exemptions`);
    return result;
}
