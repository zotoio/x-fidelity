import { execSync } from 'child_process';
import { axiosClient } from "../utils/axiosClient";
import { logger, setLogPrefix } from "../utils/logger";
import { ArchetypeConfig, ExecutionConfig, GetConfigParams, InitializeParams, LoadLocalConfigParams, RuleConfig, Exemption } from "../types/typeDefs";
import { pluginRegistry } from './pluginRegistry';
import { loadExemptions } from "../utils/exemptionUtils";
import { options } from './cli';
import fs from 'fs';
import * as path from 'path';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { loadRules } from '../utils/ruleUtils';

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export function repoDir() {
    return options.dir;
}

export class ConfigManager {
    private static configs: { [key: string]: ExecutionConfig } = {};
    private static MAX_RETRIES = 3;
    private static RETRY_DELAY = 1000; // 1 second

    

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
            ConfigManager.configs[archetype] = await ConfigManager.initialize({ archetype, logPrefix }).catch(error => {
                logger.error(error, `Error initializing config for archetype: ${archetype}`);
                throw error;
            });
        }
        return ConfigManager.configs[archetype];
    }

    public static async loadPlugins(extensions?: string[]): Promise<void> {
        if (extensions && extensions.length > 0) {
            for (const moduleName of extensions) {
                try {
                    let extension;
                    
                    // 1. First try loading from global modules
                    logger.info(`Attempting to load extension module from global modules: ${moduleName}`);
                    try {
                        const globalNodeModules = path.join(execSync('yarn global dir').toString().trim(), 'node_modules');
                        extension = await import(path.join(globalNodeModules, moduleName));
                    } catch (globalError) {
                        logger.info(`Extension not found in global modules, trying local node_modules: ${moduleName}`);
                        
                        // 2. If global fails, try loading from local node_modules
                        try {
                            extension = await import(path.join(process.cwd(), 'node_modules', moduleName));
                        } catch (localError) {
                            logger.info(`Extension not found in local node_modules, trying sample plugins: ${moduleName}`);
                            
                            // 3. If local fails, try loading from sample plugins directory
                            extension = await import(path.join(__dirname, '..', 'plugins', moduleName));
                        }
                    }

                    if (extension.default) {
                        // Handle ES modules
                        logger.debug(`Registering ES module plugin: ${moduleName}`);
                        pluginRegistry.registerPlugin(extension.default);
                    } else if (extension.plugin) {
                        // Handle CommonJS modules that export { plugin }
                        logger.debug(`Registering CommonJS module plugin: ${moduleName}`);
                        pluginRegistry.registerPlugin(extension.plugin);
                    } else {
                        // Handle direct exports
                        logger.debug(`Registering direct export plugin: ${moduleName}`);
                        pluginRegistry.registerPlugin(extension);
                    }
                    logger.info(`Successfully loaded extension: ${moduleName}`);
                } catch (error) {
                    logger.error(`Failed to load extension ${moduleName} from all locations: ${error}`);
                    throw new Error(`Failed to load extension ${moduleName} from all locations: ${error}`);
                }
            }
        }
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
                config.archetype = await this.fetchRemoteConfig(configServer, archetype, logPrefix);
            } else if (localConfigPath) {
                config.archetype = await ConfigManager.loadLocalConfig({ archetype, localConfigPath });
            } 

            if (!config.archetype || Object.keys(config.archetype).length === 0) {
                throw new Error(`No valid configuration found for archetype: ${archetype}`);
            }
            
            // Load CLI-specified plugins first
            await this.loadPlugins(options.extensions).catch(error => {
                logger.error(error, `Error loading CLI-specified plugins`);
                throw error;
            });
            
            // Load archetype-specified plugins
            if (config.archetype.plugins && config.archetype.plugins.length > 0) {
                logger.info(`Loading plugins specified by archetype: ${config.archetype.plugins.join(', ')}`);
                await this.loadPlugins(config.archetype.plugins).catch(error => {
                    logger.error(error, `Error loading archetype-specified plugins`);
                    throw error;
                });
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
            logger.error(`Error initializing config: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    private static async fetchRemoteConfig(configServer: string, archetype: string, logPrefix?: string): Promise<ArchetypeConfig> {
        const configUrl = new URL(`/archetypes/${archetype}`, configServer).toString();
        logger.debug(`Fetching remote archetype config from: ${configUrl}`);

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const response = await axiosClient.get(configUrl, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    },
                    validateStatus: (status) => status === 200
                });
                const fetchedConfig = response.data;
                if (validateArchetype(fetchedConfig)) {
                    logger.debug(`Remote archetype config fetched successfully ${JSON.stringify(fetchedConfig)}`);
                    return fetchedConfig;
                } else {
                    throw new Error('Invalid remote archetype configuration');
                }
            } catch (error) {
                logger.error(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                if (attempt === this.MAX_RETRIES) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            }
        }
        throw new Error('Failed to fetch remote config after multiple attempts');
    }

    private static async loadLocalConfig(params: LoadLocalConfigParams): Promise<ArchetypeConfig> {
        const { archetype, localConfigPath } = params;
        try {
            if (!/^[a-zA-Z0-9-_]+$/.test(archetype)) {
                throw new Error('Invalid archetype name');
            }
            const sanitizedArchetype = archetype.replace(/[^a-zA-Z0-9-_]/g, '');
            const configPath = path.join(localConfigPath, `${sanitizedArchetype}.json`);
            logger.info(`Loading local archetype config from: ${configPath}`);
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const localConfig = JSON.parse(configContent);
            if (validateArchetype(localConfig)) {
                return localConfig;
            } else {
                throw new Error('Invalid local archetype configuration');
            }
        } catch (error: any) {
            logger.error(`Error loading local archetype config: ${error.message}`);
            throw error;
        }
    }
}

