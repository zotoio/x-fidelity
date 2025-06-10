import { XFiPlugin, FactDefn, OperatorDefn, PluginError } from '@x-fidelity/types';
import { logger } from '../utils/logger';

class PluginRegistry {
    private plugins: Map<string, XFiPlugin> = new Map();

    registerPlugin(plugin: XFiPlugin): void {
        if (!plugin.name) {
            throw new Error('Plugin must have a name');
        }

        if (this.plugins.has(plugin.name)) {
            logger.warn(`Plugin ${plugin.name} is already registered, skipping duplicate registration`);
            return;
        }

        this.plugins.set(plugin.name, {
            ...plugin,
            facts: plugin.facts || [],
            operators: plugin.operators || [],
            rules: plugin.rules || []
        });

        logger.info(`Registered plugin: ${plugin.name}`);
    }

    getPlugin(name: string): XFiPlugin | undefined {
        return this.plugins.get(name);
    }

    getPluginFacts(): FactDefn[] {
        const facts: FactDefn[] = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.facts) {
                facts.push(...plugin.facts);
            }
        }
        return facts;
    }

    getPluginOperators(): OperatorDefn[] {
        const operators: OperatorDefn[] = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.operators) {
                operators.push(...plugin.operators);
            }
        }
        return operators;
    }

    getPluginRules(): any[] {
        const rules: any[] = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.rules) {
                rules.push(...plugin.rules);
            }
        }
        return rules;
    }

    handlePluginError(pluginName: string, error: Error): PluginError {
        const plugin = this.plugins.get(pluginName);
        if (plugin?.onError) {
            return plugin.onError(error);
        }
        return {
            message: error.message,
            level: 'error',
            severity: 'error',
            source: pluginName
        };
    }

    async executePluginFunction(pluginName: string, functionName: string, params: any): Promise<any> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        if (!plugin[functionName]) {
            throw new Error(`Function ${functionName} not found in plugin ${pluginName}`);
        }

        try {
            return await plugin[functionName](params);
        } catch (error) {
            throw this.handlePluginError(pluginName, error as Error);
        }
    }
}

export const pluginRegistry = new PluginRegistry();
