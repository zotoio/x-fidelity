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
            mode: 'client',
            archetype: 'node-fullstack'
        };
        expect(cliOptions.mode).toBe('client');
    });

    it('should export plugin types correctly', () => {
        const pluginError: PluginError = {
            message: 'Test error',
            level: 'error',
            source: 'test'
        };
        expect(pluginError.message).toBe('Test error');
    });

    it('should validate FileData type structure', () => {
        const fileData: FileData = {
            fileName: 'test.ts',
            filePath: '/path/to/test.ts',
            fileContent: 'test content',
            fileAst: null,
            relativePath: 'test.ts'
        };
        expect(fileData).toHaveProperty('fileName');
        expect(fileData).toHaveProperty('filePath');
        expect(fileData).toHaveProperty('fileContent');
        expect(fileData).toHaveProperty('fileAst');
        expect(fileData).toHaveProperty('relativePath');
    });

    it('should validate FactDefn type structure', () => {
        const factDefn: FactDefn = {
            name: 'testFact',
            fn: async () => true,
            priority: 1,
            description: 'Test fact description'
        };
        expect(factDefn).toHaveProperty('name');
        expect(factDefn).toHaveProperty('fn');
        expect(factDefn).toHaveProperty('priority');
        expect(factDefn).toHaveProperty('description');
    });

    it('should validate OperatorDefn type structure', () => {
        const operatorDefn: OperatorDefn = {
            name: 'testOperator',
            description: 'Test operator description',
            fn: () => true
        };
        expect(operatorDefn).toHaveProperty('name');
        expect(operatorDefn).toHaveProperty('description');
        expect(operatorDefn).toHaveProperty('fn');
    });

    it('should validate ScanResult type structure', () => {
        const scanResult: ScanResult = {
            filePath: 'test.ts',
            errors: [{
                ruleFailure: 'test-rule',
                level: 'error',
                details: { message: 'Test error' }
            }]
        };
        expect(scanResult).toHaveProperty('filePath');
        expect(scanResult).toHaveProperty('errors');
    });

    it('should validate RuleConfig type structure', () => {
        const ruleConfig: RuleConfig = {
            name: 'test-rule',
            description: 'Test rule description',
            conditions: {
                all: [{
                    fact: 'testFact',
                    operator: 'equal',
                    value: true
                }]
            },
            event: {
                type: 'error',
                params: {
                    message: 'Test error message'
                }
            }
        };
        expect(ruleConfig).toHaveProperty('name');
        expect(ruleConfig).toHaveProperty('description');
        expect(ruleConfig).toHaveProperty('conditions');
        expect(ruleConfig).toHaveProperty('event');
    });

    it('should validate ArchetypeConfig type structure', () => {
        const archetypeConfig: ArchetypeConfig = {
            name: 'test-archetype',
            rules: ['rule1', 'rule2'],
            plugins: ['plugin1'],
            config: {
                minimumDependencyVersions: {},
                standardStructure: {},
                blacklistPatterns: [],
                whitelistPatterns: []
            }
        };
        expect(archetypeConfig).toHaveProperty('name');
        expect(archetypeConfig).toHaveProperty('rules');
        expect(archetypeConfig).toHaveProperty('plugins');
        expect(archetypeConfig).toHaveProperty('config');
    });
}); 