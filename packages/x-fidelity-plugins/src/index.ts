// X-Fidelity Plugins Package
// This package contains all plugin implementations

// Simple plugins (working)
export { xfiPluginSimpleExample } from './xfiPluginSimpleExample';
export { xfiPluginRequiredFiles } from './xfiPluginRequiredFiles';
export { plugin as xfiPluginAst } from './xfiPluginAst';
export { xfiPluginReactPatterns } from './xfiPluginReactPatterns';
export { plugin as xfiPluginRemoteStringValidator } from './xfiPluginRemoteStringValidator';

// New migrated plugins
export { xfiPluginFilesystem } from './xfiPluginFilesystem';
export { xfiPluginDependency } from './xfiPluginDependency';
export { xfiPluginOpenAI } from './xfiPluginOpenAI';
export { xfiPluginPatterns } from './xfiPluginPatterns';

// Additional plugin categories (placeholder for now)
// export * from './filesystem';
// export * from './dependency';
// export * from './openai';
// export * from './custom';

// Plugin types
export * from './types';

// Plugin registry for easy access
export const allPlugins = {
    xfiPluginSimpleExample: () => import('./xfiPluginSimpleExample'),
    xfiPluginRequiredFiles: () => import('./xfiPluginRequiredFiles'),
    xfiPluginAst: () => import('./xfiPluginAst'),
    xfiPluginReactPatterns: () => import('./xfiPluginReactPatterns'),
    xfiPluginRemoteStringValidator: () => import('./xfiPluginRemoteStringValidator'),
    xfiPluginFilesystem: () => import('./xfiPluginFilesystem'),
    xfiPluginDependency: () => import('./xfiPluginDependency'),
    xfiPluginOpenAI: () => import('./xfiPluginOpenAI'),
    xfiPluginPatterns: () => import('./xfiPluginPatterns'),
}; 