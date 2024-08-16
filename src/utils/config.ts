import axios from "axios";
import { logger, setLogPrefix } from "../utils/logger";
import { ArchetypeConfig, RuleConfig, ExecutionConfig } from "../types/typeDefs";
import { archetypes } from "../archetypes";
import { options } from '../core/cli';
import fs from 'fs';
import * as path from 'path';
import { validateArchetype } from './jsonSchemas';

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export class ConfigManager {
    private static configs: { [key: string]: ExecutionConfig } = {};

    public static async getLoadedConfigs(): Promise<string[]> {
        return Object.keys(ConfigManager.configs);
    }

    public static async getConfig(archetype = options.archetype, logPrefix?: string): Promise<ExecutionConfig> {
        if (!ConfigManager.configs[archetype]) {
            ConfigManager.configs[archetype] = await ConfigManager.initialize(archetype, logPrefix);
        }
        return ConfigManager.configs[archetype];
    }

    private static async initialize(archetype: string, logPrefix?: string): Promise<ExecutionConfig> {
        const configServer = options.configServer;
        const localConfigPath = options.localConfigPath;

        if (logPrefix) setLogPrefix(logPrefix);
        logger.debug(`Initializing config manager for archetype: ${archetype}`);

        const config: ExecutionConfig = { 
            archetype: {} as ArchetypeConfig, 
            rules: [] as RuleConfig[], 
            cliOptions: options 
        };

        try {
            if (configServer) {
                const configUrl = `${configServer}/archetypes/${archetype}`;
                logger.debug(`Fetching remote archetype config from: ${configUrl}`);
                const response = await axios.get(configUrl, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    }
                });
                const fetchedConfig = response.data;
                if (validateArchetype(fetchedConfig)) {
                    config.archetype = fetchedConfig;
                    logger.debug(`Remote archetype config fetched successfully ${JSON.stringify(config.archetype)}`);
                } else {
                    logger.error(`Invalid remote archetype configuration for ${archetype}`);
                    throw new Error('Invalid remote archetype configuration');
                }
            } else if (localConfigPath) {
                config.archetype = await ConfigManager.loadLocalConfig(archetype, localConfigPath);
            } else {
                config.archetype = archetypes[archetype];
            }

            if (!config.archetype || Object.keys(config.archetype).length === 0) {
                logger.warn(`No valid configuration found for archetype: ${archetype}. Using default configuration.`);
                config.archetype = {
                    name: archetype,
                    rules: [],
                    operators: [],
                    facts: [],
                    config: {
                        minimumDependencyVersions: {},
                        standardStructure: {},
                        blacklistPatterns: [],
                        whitelistPatterns: []
                    }
                };
            }

            return config;
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error initializing config: ${error.message}`);
            } else {
                logger.error('Error initializing config: Unknown error');
            }
            throw error;
        }
    }

    private static async loadLocalConfig(archetype: string, localConfigPath: string): Promise<ArchetypeConfig> {
        try {
            const configPath = path.join(localConfigPath, `${archetype}.json`);
            logger.info(`Loading local archetype config from: ${configPath}`);
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const localConfig = JSON.parse(configContent);
            return {
                ...localConfig
            };
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error loading local archetype config: ${error.message}`);
            } else {
                logger.error('Error loading local archetype config: Unknown error');
            }
            logger.warn('Falling back to default configuration');
            return {
                name: archetype,
                rules: [],
                operators: [],
                facts: [],
                config: {
                    minimumDependencyVersions: {},
                    standardStructure: {},
                    blacklistPatterns: [],
                    whitelistPatterns: []
                }
            };
        }
    }

}

