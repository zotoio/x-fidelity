const fs = require('fs');
const path = require('path');

// Define the core plugins that should be copied
const CORE_PLUGINS = [
    'xfiPluginRequiredFiles',
    'xfiPluginSimpleExample',
    'xfiPluginRemoteStringValidator',
    'xfiPluginAst',
    'xfiPluginReactPatterns'
];

// Source and destination paths
const sourcePluginsDir = path.join(__dirname, '../../x-fidelity/src/plugins');
const destPluginsDir = path.join(__dirname, '../dist/plugins');

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destPluginsDir)) {
    fs.mkdirSync(destPluginsDir, { recursive: true });
}

// Copy each plugin
CORE_PLUGINS.forEach(pluginName => {
    const sourcePath = path.join(sourcePluginsDir, pluginName);
    const destPath = path.join(destPluginsDir, pluginName);

    // Skip if source doesn't exist
    if (!fs.existsSync(sourcePath)) {
        console.warn(`Plugin ${pluginName} not found in source directory`);
        return;
    }

    // Create plugin directory
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
    }

    // Copy plugin files
    const copyDir = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    };

    copyDir(sourcePath, destPath);
    console.log(`Copied plugin: ${pluginName}`);
});

console.log('Plugin copy complete!'); 