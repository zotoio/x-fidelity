import axios from "axios";
import { logger, setLogPrefix } from "../utils/logger";
import { ArchetypeConfig } from "../types/typeDefs";
import { archetypes } from "../archetypes";
import * as fs from 'fs';
import * as path from 'path';
import { validateArchetype } from '../utils/jsonSchemas';

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ArchetypeConfig;
    private rules: any[];
    public configServer: string;
    public localConfigPath: string;

    private constructor() {
        this.config = archetypes['node-fullstack'];
        this.rules = [];
        this.configServer = '';
        this.localConfigPath = '';
    }

    public async getAvailableArchetypes(): Promise<string[]> {
        return Object.keys(archetypes);
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async initialize(archetype = 'node-fullstack', configServer?: string, localConfigPath?: string, logPrefix?: string): Promise<void> {
        this.config = archetypes[archetype] || archetypes['node-fullstack'];
        this.configServer = configServer || '';
        this.localConfigPath = localConfigPath || '';
        if (logPrefix) setLogPrefix(logPrefix);
        logger.debug(`Initializing config manager for archetype: ${archetype}`);
        
        if (this.configServer) {
            try {
                const configUrl = `${this.configServer}/archetypes/${archetype}`;
                logger.debug(`Fetching remote archetype config from: ${configUrl}`);
                const response = await axios.get(configUrl, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    }
                });
                const fetchedConfig = {
                    ...this.config,
                    ...response.data
                };
                if (validateArchetype(fetchedConfig)) {
                    this.config = fetchedConfig;
                    logger.debug(`Remote archetype config fetched successfully ${JSON.stringify(this.config)}`);
                } else {
                    logger.error(`Invalid remote archetype configuration for ${archetype}`);
                    throw new Error('Invalid remote archetype configuration');
                }
            } catch (error) {
                if (error instanceof Error) {
                    logger.error(`Error fetching remote archetype config: ${error.message}`);
                } else {
                    logger.error('Error fetching remote archetype config: Unknown error');
                }
                throw new Error('Failed to fetch remote archetype config');
            }
        } else if (this.localConfigPath) {
            await this.loadLocalConfig(archetype);
        }
    }

    private async loadLocalConfig(archetype: string): Promise<ArchetypeConfig> {
        try {
            const configPath = path.join(this.localConfigPath, `${archetype}.json`);
            logger.info(`Loading local archetype config from: ${configPath}`);
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const localConfig = JSON.parse(configContent);
            return {
                ...archetypes[archetype],
                ...localConfig
            };
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error loading local archetype config: ${error.message}`);
            } else {
                logger.error('Error loading local archetype config: Unknown error');
            }
            throw new Error('Failed to load local archetype config');
        }
    }

    public getConfig(): ArchetypeConfig {
        return this.config;
    }
}