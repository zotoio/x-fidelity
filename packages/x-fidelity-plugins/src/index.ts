// Export all plugins individually
export { xfiPluginAst } from './xfiPluginAst';
export { xfiPluginDependency } from './xfiPluginDependency';
export { xfiPluginFilesystem } from './xfiPluginFilesystem';
export { xfiPluginOpenAI } from './xfiPluginOpenAI';
export { xfiPluginPatterns } from './xfiPluginPatterns';
export { xfiPluginReactPatterns } from './xfiPluginReactPatterns';
export { xfiPluginRemoteStringValidator } from './xfiPluginRemoteStringValidator';
export { xfiPluginRequiredFiles } from './xfiPluginRequiredFiles';
export { xfiPluginSimpleExample } from './xfiPluginSimpleExample';

// Also export as default exports for compatibility
export { default as xfiPluginAstDefault } from './xfiPluginAst';
export { default as xfiPluginDependencyDefault } from './xfiPluginDependency';
export { default as xfiPluginFilesystemDefault } from './xfiPluginFilesystem';
export { default as xfiPluginOpenAIDefault } from './xfiPluginOpenAI';
export { default as xfiPluginPatternsDefault } from './xfiPluginPatterns';
export { default as xfiPluginReactPatternsDefault } from './xfiPluginReactPatterns';
export { default as xfiPluginRemoteStringValidatorDefault } from './xfiPluginRemoteStringValidator';
export { default as xfiPluginRequiredFilesDefault } from './xfiPluginRequiredFiles';
export { default as xfiPluginSimpleExampleDefault } from './xfiPluginSimpleExample';

// Create a registry of all available plugins for dynamic loading
export const availablePlugins = {
    xfiPluginAst: () => import('./xfiPluginAst').then(m => m.xfiPluginAst),
    xfiPluginDependency: () => import('./xfiPluginDependency').then(m => m.xfiPluginDependency),
    xfiPluginFilesystem: () => import('./xfiPluginFilesystem').then(m => m.xfiPluginFilesystem),
    xfiPluginOpenAI: () => import('./xfiPluginOpenAI').then(m => m.xfiPluginOpenAI),
    xfiPluginPatterns: () => import('./xfiPluginPatterns').then(m => m.xfiPluginPatterns),
    xfiPluginReactPatterns: () => import('./xfiPluginReactPatterns').then(m => m.xfiPluginReactPatterns),
    xfiPluginRemoteStringValidator: () => import('./xfiPluginRemoteStringValidator').then(m => m.xfiPluginRemoteStringValidator),
    xfiPluginRequiredFiles: () => import('./xfiPluginRequiredFiles').then(m => m.xfiPluginRequiredFiles),
    xfiPluginSimpleExample: () => import('./xfiPluginSimpleExample').then(m => m.xfiPluginSimpleExample),
};

// Export the plugin names for dynamic loading
export const BUILTIN_PLUGIN_NAMES = Object.keys(availablePlugins); 