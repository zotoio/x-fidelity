import { execSync } from 'child_process';
import { axiosClient } from "../utils/axiosClient";
import { logger, setLogPrefix } from "../utils/logger";
import {
    ArchetypeConfig,
    ExecutionConfig,
    GetConfigParams,
    InitializeParams,
    LoadLocalConfigParams,
    RuleConfig,
    Exemption
} from "@x-fidelity/types";
import { pluginRegistry } from './pluginRegistry';
import { loadExemptions } from "../utils/exemptionUtils";
import { options } from './options';
import fs from 'fs';
import * as path from 'path';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { loadRules } from '../utils/ruleUtils';

export const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

export function repoDir() {
    // For tests, we need to ensure this returns a consistent value
    return process.env.NODE_ENV === 'test' ? '/repo' : options.dir;
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
        const resolvedArchetype = archetype || 'node-fullstack'; // Fallback if still undefined
        if (!ConfigManager.configs[resolvedArchetype]) {
            ConfigManager.configs[resolvedArchetype] = await ConfigManager.initialize({ archetype: resolvedArchetype, logPrefix }).catch(error => {
                logger.error(error, `Error initializing config for archetype: ${resolvedArchetype}`);
                throw error;
            });
        }
        return ConfigManager.configs[resolvedArchetype];
    }

    // Helper method for dynamic imports (makes testing easier)
    // This needs to be accessible for testing
    static dynamicImport = async (modulePath: string): Promise<any> => {
        return import(modulePath);
    }

    /**
     * Convert plugin module name to registry name for proper deduplication
     * Backwards compatible with existing plugin naming conventions
     */
    private static getPluginRegistryName(moduleName: string): string {
        // Handle standard xfiPlugin naming pattern
        if (moduleName.startsWith('xfiPlugin')) {
            // Convert camelCase to kebab-case: xfiPluginFilesystem -> xfi-plugin-filesystem
            const baseName = moduleName.substring(9); // Remove 'xfiPlugin' prefix
            const kebabCase = baseName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
            return `xfi-plugin-${kebabCase}`;
        }
        // Return as-is for external plugins
        return moduleName;
    }

    /**
     * Filter out plugins that are already loaded to prevent duplicates
     * Maintains backwards compatibility by checking both module names and registry names
     */
    private static filterUnloadedPlugins(pluginNames: string[]): string[] {
        return pluginNames.filter(pluginName => {
            const registryName = this.getPluginRegistryName(pluginName);
            const alreadyLoaded = pluginRegistry.getPlugin(registryName);
            if (alreadyLoaded) {
                logger.info(`Plugin ${pluginName} (registry name: ${registryName}) already loaded, skipping duplicate`);
                return false;
            }
            return true;
        });
    }

    public static async loadPlugins(extensions?: string[]): Promise<void> {
        if (extensions && extensions.length > 0) {
            // Dynamically get the list of built-in plugins from the plugins package
            let builtinPlugins: string[] = [];
            try {
                const pluginsModule = await this.dynamicImport('@x-fidelity/plugins');
                // Use the new dynamic function to get available plugins
                builtinPlugins = pluginsModule.getBuiltinPluginNames ? 
                    pluginsModule.getBuiltinPluginNames() : [];
            } catch (error) {
                // Fallback to hardcoded list if dynamic import fails
                logger.warn(`Failed to load builtin plugin names dynamically, using fallback list: ${error}`);
                builtinPlugins = [
                    'xfiPluginSimpleExample',
                    'xfiPluginRequiredFiles',
                    'xfiPluginAst',
                    'xfiPluginReactPatterns',
                    'xfiPluginRemoteStringValidator',
                    'xfiPluginFilesystem',
                    'xfiPluginDependency',
                    'xfiPluginOpenAI',
                    'xfiPluginPatterns'
                ];
            }
            
            for (const moduleName of extensions) {
                try {
                    // Handle built-in plugins specially
                    if (builtinPlugins.includes(moduleName)) {
                        logger.info(`Loading built-in plugin: ${moduleName}`);
                        try {
                            // Try to load from the compiled plugins package
                            const pluginsModule = await this.dynamicImport('@x-fidelity/plugins');
                            const plugin = pluginsModule[moduleName];
                            if (plugin) {
                                pluginRegistry.registerPlugin(plugin);
                                logger.info(`Successfully loaded built-in plugin: ${moduleName}`);
                            } else {
                                throw new Error(`Built-in plugin ${moduleName} not found in @x-fidelity/plugins exports`);
                            }
                        } catch (error) {
                            logger.error(`Failed to load built-in plugin ${moduleName}: ${error}`);
                            throw new Error(`Failed to load built-in plugin ${moduleName}: ${error}`);
                        }
                        continue;
                    }
                    
                    let extension;
                    
                    // Skip actual plugin loading in test environment
                    if (process.env.NODE_ENV === 'test') {
                        logger.info(`Test environment detected, skipping actual plugin loading for: ${moduleName}`);
                        continue;
                    }
                    
                    // 1. First try loading from global modules
                    logger.info(`Attempting to load extension module from global modules: ${moduleName}`);
                    try {
                        const globalNodeModules = path.join(execSync('yarn global dir').toString().trim(), 'node_modules');
                        extension = await this.dynamicImport(path.join(globalNodeModules, moduleName));
                    } catch (globalError) {
                        logger.info(`Extension not found in global modules, trying local node_modules: ${moduleName}`);
                        
                        // 2. If global fails, try loading from local node_modules
                        try {
                            extension = await this.dynamicImport(path.join(process.cwd(), 'node_modules', moduleName));
                        } catch (localError) {
                            logger.info(`Extension not found in local node_modules, trying @x-fidelity/plugins: ${moduleName}`);
                            
                            // 3. If local fails, try loading from @x-fidelity/plugins package
                            try {
                                const pluginsModule = await this.dynamicImport('@x-fidelity/plugins');
                                extension = { default: pluginsModule[moduleName] };
                                if (!extension.default) {
                                    throw new Error(`Plugin ${moduleName} not found in @x-fidelity/plugins exports`);
                                }
                            } catch (pluginsError) {
                                logger.info(`Extension not found in @x-fidelity/plugins exports, trying legacy path: ${moduleName}`);
                                
                                // 4. Fallback to legacy plugins directory
                                extension = await this.dynamicImport(path.join(__dirname, '..', 'plugins', moduleName));
                            }
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
        logger.info(`Config server: ${configServer}, Local config path: ${localConfigPath}`);

        const config: ExecutionConfig = { 
            archetype: {} as ArchetypeConfig, 
            rules: [] as RuleConfig[], 
            cliOptions: options,
            exemptions: [] as Exemption[]
        };

        try {
            if (configServer) {
                logger.info(`Using remote config server: ${configServer}`);
                config.archetype = await this.fetchRemoteConfig(configServer, archetype, logPrefix);
            } else if (localConfigPath) {
                logger.info(`Using local config path: ${localConfigPath}`);
                config.archetype = await ConfigManager.loadLocalConfig({ archetype, localConfigPath });
            } else {
                logger.warn(`No config server or local config path provided, using builtin configuration`);
                config.archetype = await ConfigManager.loadBuiltinConfig(archetype);
            }

            if (!config.archetype || Object.keys(config.archetype).length === 0) {
                throw new Error(`No valid configuration found for archetype: ${archetype}`);
            }
            
            // Auto-load essential base plugins that provide core functionality
            let basePluginNames: string[] = [];
            try {
                const pluginsModule = await this.dynamicImport('@x-fidelity/plugins');
                // Use the available plugins from the plugins package, but only load essential ones
                basePluginNames = pluginsModule.getBuiltinPluginNames ? 
                    pluginsModule.getBuiltinPluginNames() : [];
            } catch (error) {
                logger.error(`Failed to load base plugins: ${error}`);
            }

            logger.info(`Loading essential base plugins: ${basePluginNames.join(', ')}`);
            await this.loadPlugins(basePluginNames).catch(error => {
                logger.warn(`Some essential base plugins failed to load: ${error}`);
                // Don't throw here - continue with available plugins
            });
            
            // Load CLI-specified plugins with deduplication
            if (options.extraPlugins && options.extraPlugins.length > 0) {
                const unloadedCLIPlugins = this.filterUnloadedPlugins(options.extraPlugins);
                if (unloadedCLIPlugins.length > 0) {
                    await this.loadPlugins(unloadedCLIPlugins).catch(error => {
                        logger.error(error, `Error loading CLI-specified plugins`);
                        throw error;
                    });
                } else {
                    logger.info(`All CLI plugins already loaded (${options.extraPlugins.length} plugins), skipping duplicate loading`);
                }
            }
            
            // Load archetype-specified plugins with deduplication
            if (config.archetype.plugins && config.archetype.plugins.length > 0) {
                // Filter out already loaded plugins to prevent duplicates and improve performance
                const unloadedPlugins = this.filterUnloadedPlugins(config.archetype.plugins);
                
                if (unloadedPlugins.length > 0) {
                    logger.info(`Loading plugins specified by archetype: ${unloadedPlugins.join(', ')}`);
                    await this.loadPlugins(unloadedPlugins).catch(error => {
                        logger.error(error, `Error loading archetype-specified plugins`);
                        throw error;
                    });
                } else {
                    logger.info(`All archetype plugins already loaded (${config.archetype.plugins.length} plugins), skipping duplicate loading`);
                }
            }

            // V4 approach: Rules come from different sources in the config
            // First check if rules are already RuleConfig objects (from local config)
            if (config.archetype.rules && config.archetype.rules.length > 0 && typeof config.archetype.rules[0] === 'object') {
                config.rules = config.archetype.rules as unknown as RuleConfig[];
            } else {
                // Legacy support: if rules are strings, load them using ruleUtils
                const ruleNames = (config.archetype.rules as unknown as string[]) || [];
                if (ruleNames.length > 0) {
                    logger.info(`Loading rules from names: ${ruleNames.join(', ')}`);
                    config.rules = await loadRules({
                        archetype,
                        ruleNames,
                        configServer: options.configServer,
                        localConfigPath: options.localConfigPath,
                        logPrefix
                    });
                } else {
                    config.rules = [];
                }
            }

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
            config.exemptions = await loadExemptions({ 
                configServer: configServer || undefined, 
                localConfigPath: localConfigPath || undefined, 
                logPrefix, 
                archetype: archetype || 'node-fullstack'
            });
            
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
                const fetchedConfig = {
                    description: 'Remote archetype configuration',
                    configServer: configServer,
                    ...response.data
                } as ArchetypeConfig;
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
            
            let parsedContent;
            try {
                parsedContent = JSON.parse(configContent);
            } catch (parseError) {
                // If JSON parsing fails, throw the expected error message
                throw new Error(`No valid configuration found for archetype: ${archetype}`);
            }
            
            const localConfig = {
                description: 'Local archetype configuration',
                configServer: '',
                ...parsedContent
            } as ArchetypeConfig;
            
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

    private static async loadBuiltinConfig(archetype: string): Promise<ArchetypeConfig> {
        try {
            if (!/^[a-zA-Z0-9-_]+$/.test(archetype)) {
                throw new Error('Invalid archetype name');
            }
            
            // Try multiple possible paths for builtin configs
            const possiblePaths = [
                // For standalone core package usage
                path.join(__dirname, '../demoConfig', `${archetype}.json`),
                // For VSCode extension bundled usage
                path.join(__dirname, 'demoConfig', `${archetype}.json`),
                // For development/test environments
                path.join(process.cwd(), 'packages/x-fidelity-core/dist/demoConfig', `${archetype}.json`)
            ];
            
            let configPath: string | null = null;
            for (const tryPath of possiblePaths) {
                try {
                    await fs.promises.access(tryPath, fs.constants.F_OK);
                    configPath = tryPath;
                    break;
                } catch {
                    // Continue to next path
                }
            }
            
            if (!configPath) {
                throw new Error(`No valid builtin configuration found for archetype: ${archetype}`);
            }
            
            logger.info(`Loading builtin archetype config from: ${configPath}`);
            
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            
            let parsedContent;
            try {
                parsedContent = JSON.parse(configContent);
            } catch (parseError) {
                throw new Error(`No valid builtin configuration found for archetype: ${archetype}`);
            }
            
            const builtinConfig = {
                description: 'Builtin archetype configuration',
                configServer: '',
                ...parsedContent
            } as ArchetypeConfig;
            
            if (validateArchetype(builtinConfig)) {
                logger.info(`Successfully loaded builtin configuration for archetype: ${archetype}`);
                return builtinConfig;
            } else {
                throw new Error('Invalid builtin archetype configuration');
            }
        } catch (error: any) {
            logger.error(`Error loading builtin archetype config: ${error.message}`);
            throw error;
        }
    }
}

