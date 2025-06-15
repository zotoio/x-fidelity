/**
 * Test utilities for X-Fidelity packages
 * Provides shared mock patterns and test helpers
 */

export * from './mockCore';

// Common test data
export const mockFileData = {
    fileName: 'test.ts',
    filePath: '/test/test.ts',
    fileContent: 'console.log("test");',
    content: 'console.log("test");',
    relativePath: 'test.ts'
};

export const mockArchetypeConfig = {
    description: 'Test archetype',
    rules: [],
    minimumDependencyVersions: {},
    config: {
        blacklistPatterns: ['node_modules', '.git'],
        whitelistPatterns: ['**/*.ts', '**/*.js'],
        standardStructure: true
    }
};

export const mockRuleConfig = {
    name: 'test-rule',
    description: 'Test rule',
    conditions: {
        any: [{
            fact: 'testFact',
            operator: 'equal',
            value: 'test'
        }]
    },
    event: {
        type: 'testEvent',
        params: {
            level: 'error',
            message: 'Test rule failed'
        }
    }
};

// Test helper functions
export const createMockAlmanac = (facts: Record<string, any> = {}) => ({
    factValue: jest.fn().mockImplementation((factName: string) => {
        return Promise.resolve(facts[factName]);
    })
});

export const createMockEngine = () => ({
    addRule: jest.fn(),
    addFact: jest.fn(),
    addOperator: jest.fn(),
    run: jest.fn().mockResolvedValue({ events: [] }),
    removeAllListeners: jest.fn(),
    on: jest.fn()
}); 