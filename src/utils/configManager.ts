import { axiosClient } from "./axiosClient";
import { logger, setLogPrefix } from "./logger";
import { ArchetypeConfig, ExecutionConfig, GetConfigParams, InitializeParams, LoadLocalConfigParams, RuleConfig, Exemption } from "../types/typeDefs";
import { loadExemptions } from "./exemptionLoader";
import { archetypes } from "../archetypes";
import { options } from '../core/cli';
import fs from 'fs';
import * as path from 'path';
import { validateArchetype, validateRule } from './jsonSchemas';
import { loadRules } from '../rules';

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export class ConfigManager {
    private static configs: { [key: string]: ExecutionConfig } = {};

    public static getLoadedConfigs(): string[] {
        return Object.keys(ConfigManager.configs);
    }

    public static clearLoadedConfigs(): void {
        Object.keys(ConfigManager.configs).forEach(key => {
            delete ConfigManager.configs[key];
        });    
    }

    public static async getConfig(params: GetConfigParams): Promise<ExecutionConfig> {
        const { archetype = options.archetype, logPrefix } = params;
        if (!ConfigManager.configs[archetype]) {
            ConfigManager.configs[archetype] = await ConfigManager.initialize({ archetype, logPrefix });
        }
        return ConfigManager.configs[archetype];
    }

    private static async initialize(params: InitializeParams): Promise<ExecutionConfig> {
        const { archetype, logPrefix } = params;
        const configServer = options.configServer;
        const localConfigPath = options.localConfigPath;

        if (logPrefix) setLogPrefix(logPrefix);
        logger.info(`Initializing config manager for archetype: ${archetype}`);
        logger.debug(`Initialize params: ${JSON.stringify(params)}`);

        const config: ExecutionConfig = { 
            archetype: {} as ArchetypeConfig, 
            rules: [] as RuleConfig[], 
            cliOptions: options,
            exemptions: [] as Exemption[]
        };

        try {
            if (configServer) {
                const configUrl = new URL(`/archetypes/${archetype}`, configServer).toString();
                logger.debug(`Fetching remote archetype config from: ${configUrl}`);
                const response = await axiosClient.get(configUrl, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    },
                    validateStatus: (status) => status === 200
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
                config.archetype = await ConfigManager.loadLocalConfig({ archetype, localConfigPath });
            } else {
                config.archetype = archetypes[archetype];
            }

            if (!config.archetype || Object.keys(config.archetype).length === 0) {
                logger.error(`No valid configuration found for archetype: ${archetype}.`);
                logger.error(`Config object: ${JSON.stringify(config)}`);
                logger.error(`Archetype object: ${JSON.stringify(config.archetype)}`);
                throw new Error(`No valid configuration found for archetype: ${archetype}`);
            }

            // Load all RuleConfig for the archetype
            config.rules = await loadRules({
                archetype,
                ruleNames: config.archetype.rules,
                configServer,
                logPrefix,
                localConfigPath
            });

            // Validate each rule
            config.rules = config.rules?.filter((rule: RuleConfig) => {
                if (validateRule(rule)) {
                    return true;
                } else {
                    logger.error(`Invalid rule configuration: ${JSON.stringify(rule)}`);
                    return false;
                }
            });

            // Load exemptions
            config.exemptions = await loadExemptions({ configServer, localConfigPath, logPrefix, archetype });
            
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

    private static async loadLocalConfig(params: LoadLocalConfigParams): Promise<ArchetypeConfig> {
        const { archetype, localConfigPath } = params;
        try {
            // Validate and sanitize the archetype input
            if (!/^[a-zA-Z0-9-_]+$/.test(archetype)) {
                throw new Error('Invalid archetype name');
            }
            const sanitizedArchetype = archetype.replace(/[^a-zA-Z0-9-_]/g, '');
            const configPath = path.join(localConfigPath, `${sanitizedArchetype}.json`);
            logger.info(`Loading local archetype config from: ${configPath}`);
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const localConfig = JSON.parse(configContent);
            return {
                ...localConfig
            };
        } catch (error: any) {
            logger.error(`Error loading local archetype config: ${error.message}`);
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

