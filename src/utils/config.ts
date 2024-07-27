
import axios from "axios";
import { logger } from "../utils/logger";
import { ArchetypeConfig } from "../types/typeDefs";
import { archetypes } from "../archetypes";
import * as fs from 'fs';
import * as path from 'path';

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

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async initialize(archetype: string = 'node-fullstack', configServer?: string, localConfigPath?: string): Promise<void> {
        this.config = archetypes[archetype] || archetypes['node-fullstack'];
        this.configServer = configServer || '';
        this.localConfigPath = localConfigPath || '';
        logger.debug(`Initializing config manager for archetype: ${archetype}`);
        
        if (this.localConfigPath) {
            try {
                const localConfig = await this.loadLocalConfig(archetype);
                this.config = {
                    ...this.config,
                    ...localConfig
                };
                logger.debug(`Local config loaded successfully ${JSON.stringify(this.config)}`);
            } catch (error) {
                if (error instanceof Error) {
                    logger.error(`Error loading local config: ${error.message}`);
                } else {
                    logger.error('Error loading local config: Unknown error');
                }
            }
        }

        if (this.configServer) {
            try {
                const configUrl = `${this.configServer}/archetypes/${archetype}`;
                logger.debug(`Fetching remote config from: ${configUrl}`);
                const response = await axios.get(configUrl);
                this.config = {
                    ...this.config,
                    ...response.data
                };
                logger.debug(`Remote config fetched successfully ${JSON.stringify(this.config)}`);
            } catch (error) {
                if (error instanceof Error) {
                    logger.error(`Error fetching remote config: ${error.message}`);
                } else {
                    logger.error('Error fetching remote config: Unknown error');
                }
            }
        }
    }

    private async loadLocalConfig(archetype: string): Promise<ArchetypeConfig> {
        const configPath = path.join(this.localConfigPath, `${archetype}.json`);
        try {
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const localConfig = JSON.parse(configContent);
            return {
                ...archetypes[archetype],
                ...localConfig
            };
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error loading local config: ${error.message}`);
            } else {
                logger.error('Error loading local config: Unknown error');
            }
            return archetypes[archetype];
        }
    }

    public getConfig(): ArchetypeConfig {
        return this.config;
    }

}

