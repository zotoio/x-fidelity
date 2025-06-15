import { missingRequiredFilesFact } from './facts/missingRequiredFiles';
import { missingRequiredFilesOperator } from './operators/missingRequiredFiles';
import { createXFiPlugin } from '../pluginTemplate/createPlugin';

// Create plugin using template
export const xfiPluginRequiredFiles = createXFiPlugin({
    name: 'xfiPluginRequiredFiles',
    description: 'Plugin for checking required files in a repository',
    facts: [missingRequiredFilesFact],
    operators: [missingRequiredFilesOperator]
});

// Use standardized plugin exports
export default xfiPluginRequiredFiles;

// Export individual facts and operators for direct use
export const facts = [missingRequiredFilesFact];
export const operators = [missingRequiredFilesOperator];
