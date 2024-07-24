
import axios from "axios";
import { logger, logPrefix } from "../utils/logger";
import { ArchetypeConfig } from "../types/typeDefs";
import { archetypes } from "../archetypes";
import { loadRules } from "../rules";

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ArchetypeConfig;
    private rules: any[];
    public configServer: string;

    private constructor() {
        this.config = archetypes['node-fullstack'];
        this.rules = [];
        this.configServer = '';
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async initialize(archetype: string = 'node-fullstack', configServer?: string): Promise<void> {
        this.config = archetypes[archetype] || archetypes['node-fullstack'];
        this.configServer = configServer || '';
        logger.debug(`Initializing config manager for archetype: ${archetype}`);
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
                logger.error(`Error fetching remote config: ${error}`);
            }
        }

    }

    public getConfig(): ArchetypeConfig {
        return this.config;
    }

}

