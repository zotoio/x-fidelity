
import axios from "axios";
import { logger } from "../utils/logger";
import { ArchetypeConfig } from "../typeDefs";
import { archetypes } from "../archetypes";
import { loadRules } from "../rules";

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ArchetypeConfig;
    private rules: any[];
    public baseUrl: string;

    private constructor() {
        this.config = archetypes['node-fullstack'];
        this.rules = [];
        this.baseUrl = '';
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async initialize(archetype: string = 'node-fullstack', baseUrl?: string): Promise<void> {
        this.config = archetypes[archetype] || archetypes['node-fullstack'];
        this.baseUrl = baseUrl || '';

        if (this.baseUrl) {
            try {
                const configUrl = `${this.baseUrl}/archetypes/${archetype}`;
                const response = await axios.get(configUrl);
                this.config = {
                    ...this.config,
                    config: {
                        ...this.config.config,
                        ...response.data
                    }
                };
            } catch (error) {
                logger.error(`Error fetching remote config: ${error}`);
            }
        }

        // Load rules after config is initialized
        this.rules = await loadRules(this.config.rules, this.baseUrl);
    }

    public getConfig(): ArchetypeConfig {
        return this.config;
    }

    public getRules(): any[] {
        return this.rules;
    }

    public getMinimumDependencyVersions(): Record<string, string> {
        return this.config.config.minimumDependencyVersions;
    }

    public getStandardStructure(): Record<string, any> {
        return this.config.config.standardStructure;
    }

    public getBlacklistPatterns(): string[] {
        return this.config.config.blacklistPatterns;
    }

    public getWhitelistPatterns(): string[] {
        return this.config.config.whitelistPatterns;
    }
}

