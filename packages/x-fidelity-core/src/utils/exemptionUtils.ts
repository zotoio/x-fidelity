import { axiosClient } from "./axiosClient";
import { logger } from "./logger";
import { Exemption, IsExemptParams, LoadExemptionsParams } from '@x-fidelity/types';
import { sendTelemetry } from "./telemetry";
import path from "path";
import fs from "fs";
import { isPathInside } from "./pathUtils";
import sanitize from "sanitize-filename";

const XFI_SHARED_SECRET = process.env.XFI_SHARED_SECRET;

export async function loadExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { configServer, localConfigPath } = params;
    if (configServer) {
        return await loadRemoteExemptions(params);
    } else if (localConfigPath) {
        return await loadLocalExemptions(params);
    } else {
        return [];
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
                'X-Shared-Secret': XFI_SHARED_SECRET || ''
            }
        });
        const fetchedExemptions = response.data;
        if (!Array.isArray(fetchedExemptions)) {
            logger.warn('Invalid exemptions format received from server: expected array');
            return [];
        }
        const validExemptions = fetchedExemptions.filter(ex => 
            ex && typeof ex === 'object' &&
            typeof ex.repoUrl === 'string' &&
            typeof ex.rule === 'string' &&
            typeof ex.expirationDate === 'string'
        );
        logger.info(`Remote exemptions fetched successfully: ${validExemptions.length} valid exemptions`);
        return validExemptions;
    } catch (error) {
        logger.error(`Error loading remote exemptions: ${error}`);
        return [];
    }
}

export async function loadLocalExemptions(params: LoadExemptionsParams): Promise<Exemption[]> {
    const { localConfigPath, archetype } = params;
    const sanitizedArchetype = sanitize(archetype);
    const exemptions: Exemption[] = [];
    const expectedSuffix = `-${sanitizedArchetype}-exemptions.json`;

    try {
        // Load from legacy file
        const baseConfigPath = path.resolve(localConfigPath || process.cwd());
        const legacyExemptionsPath = path.resolve(baseConfigPath, `${sanitizedArchetype}-exemptions.json`);
        if (fs.existsSync(legacyExemptionsPath)) {
            const legacyExemptionsData = await fs.promises.readFile(legacyExemptionsPath, 'utf-8');
            const legacyExemptions = JSON.parse(legacyExemptionsData);
            if (Array.isArray(legacyExemptions)) {
                exemptions.push(...legacyExemptions);
                logger.info(`Loaded ${legacyExemptions.length} exemptions from legacy file`);
            }
        }

        // Load from exemptions directory
        const exemptionsDirPath = path.resolve(baseConfigPath, `${sanitizedArchetype}-exemptions`);
        if (fs.existsSync(exemptionsDirPath)) {
            const files = await fs.promises.readdir(exemptionsDirPath);
            for (const file of files) {
                if (file.endsWith(expectedSuffix)) {
                    const filePath = path.join(exemptionsDirPath, file);
                    if (!isPathInside(filePath, exemptionsDirPath)) {
                        logger.error(`Invalid path: ${filePath} is outside of ${exemptionsDirPath}`);
                        continue;
                    }
                    try {
                        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                        const fileExemptions = JSON.parse(fileContent);
                        if (!Array.isArray(fileExemptions)) {
                            logger.warn(`Invalid exemptions format in ${file}: expected array`);
                            continue;
                        }
                        const validExemptions = fileExemptions.filter(ex => 
                            ex && typeof ex === 'object' && 
                            typeof ex.repoUrl === 'string' &&
                            typeof ex.rule === 'string' &&
                            typeof ex.expirationDate === 'string'
                        );
                        exemptions.push(...validExemptions);
                        logger.info(`Loaded ${validExemptions.length} valid exemptions from ${file}`);
                    } catch (error) {
                        logger.error(`Error processing exemption file ${file}: ${error}`);
                    }
                }
            }
        }

        if (!fs.existsSync(legacyExemptionsPath) && !fs.existsSync(exemptionsDirPath)) {
            logger.warn(`No exemption files found for archetype ${sanitizedArchetype}`);
        }

        logger.info(`Loaded ${exemptions.length} total exemptions for archetype ${sanitizedArchetype}`);
        return exemptions;
    } catch (error) {
        logger.warn(`Failed to load exemptions: ${error}`);
        return [];
    }
}

export function normalizeGitHubUrl(url: string): string {
    if (!url) return '';

    let hostname = 'github.com';
    let orgRepo;

    // Already in SSH format
    if (url.startsWith('git@')) {
        return url.endsWith('.git') ? url : `${url}.git`;
    }
    
    // Handle HTTPS format
    if (url.startsWith('http')) {
        const match = url.match(/^https?:\/\/([^\/]+)\/([^\/]+\/[^\/]+?)(?:\.git)?$/);
        if (match) {
            hostname = match[1];
            orgRepo = match[2];
            return `git@${hostname}:${orgRepo}.git`;
        }
    }
    
    // Handle org/repo format
    if (/^[^\/]+\/[^\/]+$/.test(url)) {
        return `git@${hostname}:${url}.git`;
    }

    throw new Error(`Invalid GitHub URL format: ${url}`);
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
    
        logger.trace(`Checking exemption for rule ${ruleName} in repo ${repoUrl}`);

        const exemption = exemptions?.find(exemption => {

            logger.trace(JSON.stringify(exemption));
            logger.trace(`repoUrl: ${repoUrl}`);
            logger.trace(`ruleName: ${ruleName}`);
            logger.trace(`normalizedRepoUrl: ${normalizedRepoUrl}`);
            logger.trace(`now: ${now}`);
            
            const result = normalizeGitHubUrl(exemption.repoUrl || '') === normalizedRepoUrl &&
            exemption.rule === ruleName &&
            new Date(exemption.expirationDate || '2099-12-31') > now;

            logger.trace(`Exemption check result: ${result}`);

            return result;

        });

        logger.trace(`Exemption: ${exemption}`);

        if (exemption) {
            logger.error(`Exempting rule ${ruleName} for repo ${normalizedRepoUrl}: ${exemption.expirationDate}`);

            // Send telemetry event for the allowed exemption
            sendTelemetry({
                eventType: 'exemptionAllowed',
                eventData: {
                    repoUrl: exemption.repoUrl,
                    rule: exemption.rule,
                    expirationDate: exemption.expirationDate,
                    reason: exemption.reason
                },
                metadata: {
                    repoUrl: exemption.repoUrl,
                    rule: exemption.rule,
                    expirationDate: exemption.expirationDate,
                    reason: exemption.reason
                },
                timestamp: new Date().toISOString()
            });

            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Error checking exemption: ${error}`);
        return false;
    }    
}

