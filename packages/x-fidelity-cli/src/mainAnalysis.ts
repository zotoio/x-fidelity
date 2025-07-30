import { options, DEMO_CONFIG_PATH } from './cli';
import { setOptions, ConfigSetManager } from '@x-fidelity/core';

export async function runMainAnalysis(directory: string, opts: any): Promise<void> {
    const configSetManager = ConfigSetManager.getInstance();
    
    // Handle config set write operation first
    if (opts.writeConfigSet) {
        const alias = opts.writeConfigSet === true ? 'default' : opts.writeConfigSet;
        console.log(`📝 Writing config set: ${alias}`);
        
        try {
            const configSetPath = await configSetManager.writeConfigSet({
                alias,
                options: opts,
                description: `Config set created from CLI on ${new Date().toLocaleDateString()}`
            });
            
            const displayPath = configSetPath.replace(require('os').homedir(), '~');
            console.log(`✅ Config set '${alias}' saved successfully!`);
            console.log(`   Location: ${displayPath}`);
            console.log(`   Usage: xfidelity . -r ${alias}`);
            console.log('');
            return; // Exit after writing config set
            
        } catch (error) {
            console.error(`❌ Failed to write config set '${alias}':`);
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }
    
    // Merge options with config set if specified
    let mergedOpts = opts;
    if (opts.readConfigSet) {
        const alias = opts.readConfigSet === true ? 'default' : opts.readConfigSet;
        console.log(`📖 Loading config set: ${alias}`);
        
        try {
            mergedOpts = await configSetManager.mergeOptionsWithConfigSet({
                directOptions: opts,
                configSetAlias: alias
            });
            
            console.log(`✅ Config set '${alias}' loaded successfully!`);
            console.log('');
            
        } catch (error) {
            console.error(`❌ Failed to load config set '${alias}':`);
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }
    
    // Update the global options object with the merged options
    const targetDirectory = mergedOpts.dir || directory || '.';
    
    // Parse zap files if provided
    let zapFiles: string[] | undefined = undefined;
    if (mergedOpts.zap) {
        try {
            zapFiles = JSON.parse(mergedOpts.zap);
            if (!Array.isArray(zapFiles)) {
                console.error('--zap option must be a JSON array of file paths');
                process.exit(1);
            }
        } catch (error) {
            console.error(`Invalid JSON in --zap option: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    // Update global CLI options with merged options
    
    options.dir = targetDirectory;
    options.archetype = mergedOpts.archetype || 'node-fullstack';
    options.configServer = mergedOpts.configServer;
    options.localConfigPath = mergedOpts.localConfigPath;
    options.githubConfigLocation = mergedOpts.githubConfigLocation;
    options.openaiEnabled = mergedOpts.openaiEnabled || false;
    options.telemetryCollector = mergedOpts.telemetryCollector;
    options.mode = mergedOpts.mode || 'cli';
    options.port = mergedOpts.port ? parseInt(mergedOpts.port) : undefined;
    options.jsonTTL = mergedOpts.jsonTTL;
    options.extraPlugins = mergedOpts.extraPlugins || [];
    options.examine = mergedOpts.examine;
    options.zapFiles = zapFiles;
    options.fileCacheTTL = mergedOpts.fileCacheTTL ? parseInt(mergedOpts.fileCacheTTL) : 60;
    options.outputFormat = mergedOpts.outputFormat;
    options.outputFile = mergedOpts.outputFile;
    options.enableTreeSitterWorker = mergedOpts.enableTreeSitterWorker || false;
    options.enableTreeSitterWasm = mergedOpts.enableTreeSitterWasm || false;
    options.enableFileLogging = mergedOpts.enableFileLogging || false;

    // Update core options so they're available to other packages
    setOptions({
        dir: targetDirectory,
        archetype: mergedOpts.archetype || 'node-fullstack',
        configServer: mergedOpts.configServer,
        localConfigPath: mergedOpts.localConfigPath, // Don't fallback to DEMO_CONFIG_PATH here - let CentralConfigManager handle it
        githubConfigLocation: mergedOpts.githubConfigLocation,
        openaiEnabled: mergedOpts.openaiEnabled || false,
        telemetryCollector: mergedOpts.telemetryCollector,
        mode: mergedOpts.mode || 'cli',
        port: mergedOpts.port ? parseInt(mergedOpts.port) : undefined,
        jsonTTL: mergedOpts.jsonTTL,
        extraPlugins: mergedOpts.extraPlugins || [],
        enableTreeSitterWorker: mergedOpts.enableTreeSitterWorker || false,
        enableTreeSitterWasm: mergedOpts.enableTreeSitterWasm || false,
        zapFiles,
        fileCacheTTL: mergedOpts.fileCacheTTL ? parseInt(mergedOpts.fileCacheTTL) : 60,
        outputFormat: mergedOpts.outputFormat,
        outputFile: mergedOpts.outputFile,
        enableFileLogging: mergedOpts.enableFileLogging || false
    });

    // Run the main analysis with CLI init skipped
    const { main } = await import('./index');
    await main(true);
}
