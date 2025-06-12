// Test file to verify types package exports
import {
    FileData,
    FactDefn,
    OperatorDefn,
    ValidationResult,
    ScanResult,
    RuleFailure,
    IssueDetail,
    ResultMetadata,
    FactMetrics,
    ErrorLevel,
    RuleConfig,
    ArchetypeConfig
} from './core';

import {
    RuleCondition,
    RepoXFIConfig,
    CLIOptions
} from './config';

import {
    XFiPlugin,
    PluginError,
    PluginResult,
    PluginRegistry
} from './plugins';

describe('Types Package', () => {
    it('should export core types correctly', () => {
        // Test that types can be used
        const errorLevel: ErrorLevel = 'error';
        expect(errorLevel).toBe('error');
        
        const validationResult: ValidationResult = {
            isValid: true,
            errors: []
        };
        expect(validationResult.isValid).toBe(true);
    });

    it('should export config types correctly', () => {
        const cliOptions: CLIOptions = {
            mode: 'analyze',
            archetype: 'node-fullstack'
        };
        expect(cliOptions.mode).toBe('analyze');
    });

    it('should export plugin types correctly', () => {
        const pluginError: PluginError = {
            message: 'Test error',
            level: 'error',
            source: 'test'
        };
        expect(pluginError.message).toBe('Test error');
    });
}); 