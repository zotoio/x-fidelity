const basicPlugin = require('../dist');
const { pluginRegistry } = require('x-fidelity');

// Register the plugin
pluginRegistry.registerPlugin(basicPlugin);

// Now the custom operator and fact are available in your rules
