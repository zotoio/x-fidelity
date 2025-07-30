import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LoggerProvider } from '../utils/loggerProvider';
import { StandardErrorFactory, ErrorCode } from '@x-fidelity/types';

const logger = LoggerProvider.getLogger();

/**
 * Configuration set data structure
 */
export interface ConfigSet {
    alias: string;
    created: string;
    updated: string;
    description?: string;
    tags?: string[];
    extends?: string; // For inheritance
    options: Record<string, any>;
}

/**
 * Parameters for writing a config set
 */
export interface WriteConfigSetParams {
    alias: string;
    options: Record<string, any>;
    description?: string;
    tags?: string[];
}

/**
 * Parameters for reading a config set
 */
export interface ReadConfigSetParams {
    alias: string;
}

/**
 * Parameters for exporting a config set
 */
export interface ExportConfigSetParams {
    alias: string;
    outputPath?: string;
}

/**
 * Parameters for importing a config set
 */
export interface ImportConfigSetParams {
    filePath: string;
    alias?: string; // Override alias if different from file
}

/**
 * Configuration set validation result
 */
export interface ConfigSetValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Options that should be saved in config sets (persistent configuration)
 */
export const SAVEABLE_OPTIONS = [
    'configServer',
    'localConfigPath', 
    'githubConfigLocation',
    'archetype',
    'openaiEnabled',
    'extraPlugins',
    'enableTreeSitterWorker',
    'enableTreeSitterWasm',
    'outputFormat',
    'telemetryCollector',
    'jsonTTL',
    'fileCacheTTL',
    'enableFileLogging',
    'wasmPath',
    'wasmLanguagesPath',
    'wasmTimeout'
] as const;

/**
 * Options that should NOT be saved (context-specific/transient)
 */
export const TRANSIENT_OPTIONS = [
    'dir',
    'zap',
    'examine',
    'help',
    'version',
    'outputFile',
    'mode',
    'port',
    'writeConfigSet',
    'readConfigSet'
] as const;

/**
 * Manages general-purpose configuration sets for X-Fidelity
 * Stores configuration sets as JSON files in user's home directory
 */
export class ConfigSetManager {
    private static instance: ConfigSetManager | null = null;
    private static readonly CONFIG_SETS_DIR = '.config/xfidelity/configs';
    private static readonly METADATA_FILE = 'configset.json';

    /**
     * Singleton instance getter
     */
    public static getInstance(): ConfigSetManager {
        if (!ConfigSetManager.instance) {
            ConfigSetManager.instance = new ConfigSetManager();
        }
        return ConfigSetManager.instance;
    }

    /**
     * Get the config sets directory path
     */
    public getConfigSetsDir(): string {
        return path.join(os.homedir(), ConfigSetManager.CONFIG_SETS_DIR);
    }

    /**
     * Initialize the config sets directory structure
     */
    public async initializeConfigSetsDir(): Promise<void> {
        const configSetsDir = this.getConfigSetsDir();
        
        try {
            await fs.promises.mkdir(configSetsDir, { recursive: true });
            logger.debug('Config sets directory initialized', { configSetsDir });
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.INITIALIZATION_FAILED,
                `Failed to initialize config sets directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'CONFIGURATION',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'initializeConfigSetsDir',
                        extra: { configSetsDir }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Write a configuration set
     */
    public async writeConfigSet(params: WriteConfigSetParams): Promise<string> {
        const { alias, options, description, tags } = params;
        
        logger.info('Writing config set', { alias, description });
        
        await this.initializeConfigSetsDir();
        
        // Filter options to only include saveable ones
        const filteredOptions = this.filterSaveableOptions(options);
        
        const configSet: ConfigSet = {
            alias,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            description,
            tags,
            options: filteredOptions
        };
        
        const configSetPath = this.getConfigSetPath(alias);
        
        try {
            await fs.promises.writeFile(
                configSetPath, 
                JSON.stringify(configSet, null, 2), 
                'utf8'
            );
            
            logger.info('Config set written successfully', { alias, configSetPath });
            return configSetPath;
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_WRITE_ERROR,
                `Failed to write config set '${alias}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'writeConfigSet',
                        filePath: configSetPath,
                        extra: { alias }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Read a configuration set
     */
    public async readConfigSet(params: ReadConfigSetParams): Promise<ConfigSet | null> {
        const { alias } = params;
        
        const configSetPath = this.getConfigSetPath(alias);
        
        try {
            if (!fs.existsSync(configSetPath)) {
                logger.debug('Config set not found', { alias, configSetPath });
                return null;
            }
            
            const content = await fs.promises.readFile(configSetPath, 'utf8');
            const configSet: ConfigSet = JSON.parse(content);
            
            // Resolve inheritance if needed
            const resolvedConfigSet = await this.resolveInheritance(configSet);
            
            logger.debug('Config set read successfully', { alias, configSetPath });
            return resolvedConfigSet;
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_READ_ERROR,
                `Failed to read config set '${alias}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'readConfigSet',
                        filePath: configSetPath,
                        extra: { alias }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * List all available configuration sets
     */
    public async listConfigSets(): Promise<ConfigSet[]> {
        await this.initializeConfigSetsDir();
        
        const configSetsDir = this.getConfigSetsDir();
        
        try {
            const files = await fs.promises.readdir(configSetsDir);
            const configSets: ConfigSet[] = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const alias = path.basename(file, '.json');
                    const configSet = await this.readConfigSet({ alias });
                    if (configSet) {
                        configSets.push(configSet);
                    }
                }
            }
            
            logger.debug('Listed config sets', { count: configSets.length });
            return configSets.sort((a, b) => a.alias.localeCompare(b.alias));
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_READ_ERROR,
                `Failed to list config sets: ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'listConfigSets',
                        filePath: configSetsDir,
                        extra: { configSetsDir }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Remove a configuration set
     */
    public async removeConfigSet(params: ReadConfigSetParams): Promise<void> {
        const { alias } = params;
        
        const configSetPath = this.getConfigSetPath(alias);
        
        try {
            if (!fs.existsSync(configSetPath)) {
                throw StandardErrorFactory.create(
                    ErrorCode.FILE_NOT_FOUND,
                    `Config set '${alias}' not found`,
                    {
                        category: 'FILESYSTEM',
                        context: {
                            component: 'Core',
                            function: 'removeConfigSet',
                            filePath: configSetPath,
                            extra: { alias }
                        }
                    }
                );
            }
            
            await fs.promises.unlink(configSetPath);
            logger.info('Config set removed successfully', { alias, configSetPath });
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_WRITE_ERROR,
                `Failed to remove config set '${alias}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'removeConfigSet',
                        filePath: configSetPath,
                        extra: { alias }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Export a configuration set to a file
     */
    public async exportConfigSet(params: ExportConfigSetParams): Promise<string> {
        const { alias, outputPath } = params;
        
        const configSet = await this.readConfigSet({ alias });
        if (!configSet) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_NOT_FOUND,
                `Config set '${alias}' not found`,
                {
                    category: 'FILESYSTEM',
                    context: {
                        component: 'Core',
                        function: 'exportConfigSet',
                        extra: { alias }
                    }
                }
            );
        }
        
        const exportPath = outputPath || path.join(process.cwd(), `${alias}-configset.json`);
        
        try {
            await fs.promises.writeFile(
                exportPath,
                JSON.stringify(configSet, null, 2),
                'utf8'
            );
            
            logger.info('Config set exported successfully', { alias, exportPath });
            return exportPath;
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_WRITE_ERROR,
                `Failed to export config set '${alias}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'exportConfigSet',
                        filePath: exportPath,
                        extra: { alias }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Import a configuration set from a file
     */
    public async importConfigSet(params: ImportConfigSetParams): Promise<string> {
        const { filePath, alias } = params;
        
        try {
            if (!fs.existsSync(filePath)) {
                throw StandardErrorFactory.create(
                    ErrorCode.FILE_NOT_FOUND,
                    `Config set file not found: ${filePath}`,
                    {
                        category: 'FILESYSTEM',
                        context: {
                            component: 'Core',
                            function: 'importConfigSet',
                            filePath,
                            extra: { filePath }
                        }
                    }
                );
            }
            
            const content = await fs.promises.readFile(filePath, 'utf8');
            const configSet: ConfigSet = JSON.parse(content);
            
            // Use provided alias or keep original
            const importAlias = alias || configSet.alias;
            configSet.alias = importAlias;
            configSet.updated = new Date().toISOString();
            
            const validation = await this.validateConfigSet(configSet);
            if (!validation.isValid) {
                throw StandardErrorFactory.create(
                    ErrorCode.SCHEMA_VALIDATION_FAILED,
                    `Invalid config set: ${validation.errors.join(', ')}`,
                    {
                        category: 'VALIDATION',
                        details: validation.errors.join('\n'),
                        context: {
                            component: 'Core',
                            function: 'importConfigSet',
                            filePath,
                            extra: { importAlias, validation }
                        }
                    }
                );
            }
            
            const configSetPath = await this.writeConfigSet({
                alias: importAlias,
                options: configSet.options,
                description: configSet.description,
                tags: configSet.tags
            });
            
            logger.info('Config set imported successfully', { filePath, importAlias, configSetPath });
            return configSetPath;
            
        } catch (error) {
            throw StandardErrorFactory.create(
                ErrorCode.FILE_READ_ERROR,
                `Failed to import config set from '${filePath}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    category: 'FILESYSTEM',
                    details: error instanceof Error ? error.stack : undefined,
                    context: {
                        component: 'Core',
                        function: 'importConfigSet',
                        filePath,
                        extra: { filePath }
                    },
                    cause: error instanceof Error ? error : undefined
                }
            );
        }
    }

    /**
     * Validate a configuration set
     */
    public async validateConfigSet(configSet: ConfigSet): Promise<ConfigSetValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Basic structure validation
        if (!configSet.alias || typeof configSet.alias !== 'string') {
            errors.push('Config set must have a valid alias');
        }
        
        if (!configSet.options || typeof configSet.options !== 'object') {
            errors.push('Config set must have options object');
        }
        
        if (!configSet.created || !configSet.updated) {
            errors.push('Config set must have created and updated timestamps');
        }
        
        // Check for inheritance cycles
        if (configSet.extends) {
            const visited = new Set<string>();
            const checkCycle = async (alias: string): Promise<boolean> => {
                if (visited.has(alias)) {
                    return true; // Cycle detected
                }
                visited.add(alias);
                
                const parent = await this.readConfigSet({ alias });
                if (parent && parent.extends) {
                    return await checkCycle(parent.extends);
                }
                return false;
            };
            
            if (await checkCycle(configSet.extends)) {
                errors.push('Inheritance cycle detected');
            }
        }
        
        // Validate individual options (only if options object exists)
        if (configSet.options && typeof configSet.options === 'object') {
            for (const [key, value] of Object.entries(configSet.options)) {
                if (!SAVEABLE_OPTIONS.includes(key as any)) {
                    warnings.push(`Option '${key}' is not in the list of saveable options`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Merge configuration sets with precedence rules
     */
    public async mergeOptionsWithConfigSet(params: {
        directOptions: Record<string, any>;
        configSetAlias?: string;
    }): Promise<Record<string, any>> {
        const { directOptions, configSetAlias } = params;
        
        let configSetOptions: Record<string, any> = {};
        
        // Load config set if specified
        if (configSetAlias) {
            const configSet = await this.readConfigSet({ alias: configSetAlias });
            if (configSet) {
                configSetOptions = configSet.options;
                logger.debug('Loaded config set for merging', { 
                    configSetAlias, 
                    optionsCount: Object.keys(configSetOptions).length 
                });
            } else {
                logger.warn('Config set not found for merging', { configSetAlias });
            }
        }
        
        // Precedence: direct options > config set options
        const mergedOptions = {
            ...configSetOptions,
            ...this.filterDirectOptions(directOptions)
        };
        
        logger.debug('Merged options with config set', {
            configSetAlias,
            directOptionsCount: Object.keys(directOptions).length,
            configSetOptionsCount: Object.keys(configSetOptions).length,
            mergedOptionsCount: Object.keys(mergedOptions).length
        });
        
        return mergedOptions;
    }

    /**
     * Get the path for a specific config set
     */
    private getConfigSetPath(alias: string): string {
        const configSetsDir = this.getConfigSetsDir();
        return path.join(configSetsDir, `${alias}.json`);
    }

    /**
     * Filter options to only include saveable ones
     */
    private filterSaveableOptions(options: Record<string, any>): Record<string, any> {
        const filtered: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(options)) {
            if (SAVEABLE_OPTIONS.includes(key as any) && value !== undefined) {
                filtered[key] = value;
            }
        }
        
        return filtered;
    }

    /**
     * Filter direct options (remove meta operations)
     */
    private filterDirectOptions(options: Record<string, any>): Record<string, any> {
        const filtered: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(options)) {
            if (!TRANSIENT_OPTIONS.includes(key as any) && value !== undefined) {
                filtered[key] = value;
            }
        }
        
        return filtered;
    }

    /**
     * Resolve configuration inheritance
     */
    private async resolveInheritance(configSet: ConfigSet): Promise<ConfigSet> {
        if (!configSet.extends) {
            return configSet;
        }
        
        const parentConfigSet = await this.readConfigSet({ alias: configSet.extends });
        if (!parentConfigSet) {
            logger.warn('Parent config set not found', { 
                alias: configSet.alias, 
                extends: configSet.extends 
            });
            return configSet;
        }
        
        // Recursively resolve parent's inheritance
        const resolvedParent = await this.resolveInheritance(parentConfigSet);
        
        // Merge options: child overrides parent
        const mergedOptions = {
            ...resolvedParent.options,
            ...configSet.options
        };
        
        return {
            ...configSet,
            options: mergedOptions
        };
    }

    /**
     * Update security allowed paths to include config sets directory
     */
    public static updateSecurityAllowedPaths(existingPaths: string[]): string[] {
        const configSetsDir = path.join(os.homedir(), ConfigSetManager.CONFIG_SETS_DIR);
        
        return [
            ...existingPaths,
            configSetsDir,
            os.homedir(), // Allow home directory access
        ];
    }
}