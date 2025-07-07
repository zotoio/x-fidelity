/**
 * Shared mock utilities for X-Fidelity testing
 * Consolidates common mock patterns used across packages
 */

export const createCoreMock = () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn()
    },
    options: {
        dir: '/mock/dir',
        archetype: 'node-fullstack',
        mode: 'client',
        extraPlugins: []
    },
    safeStringify: jest.fn().mockImplementation((obj) => JSON.stringify(obj)),
    safeClone: jest.fn().mockImplementation((obj) => JSON.parse(JSON.stringify(obj))),
    repoDir: jest.fn().mockReturnValue('/mock/repo'),
    maskSensitiveData: jest.fn().mockImplementation((data) => data),
    isPathInside: jest.fn().mockReturnValue(true),
    setLogPrefix: jest.fn(),
    getLogPrefix: jest.fn().mockReturnValue(''),
    resetLogPrefix: jest.fn(),
    resetLogger: jest.fn(),
    setOptions: jest.fn(),
    analyzeCodebase: jest.fn().mockResolvedValue({
        XFI_RESULT: {
            totalIssues: 0,
            issueDetails: [],
            fatalityCount: 0,
            warningCount: 0,
            errorCount: 0
        }
    }),
    REPO_GLOBAL_CHECK: 'REPO_GLOBAL_CHECK',
    isOpenAIEnabled: jest.fn().mockReturnValue(false),
    sendTelemetry: jest.fn().mockResolvedValue(undefined),
    pluginRegistry: {
        registerPlugin: jest.fn(),
        getPluginFacts: jest.fn().mockReturnValue([]),
        getPluginOperators: jest.fn().mockReturnValue([])
    }
});

export const setupCoreMock = () => {
    const coreMock = createCoreMock();
    
    jest.mock('@x-fidelity/core', () => coreMock);
    
    return coreMock;
};

export const createExpressMocks = () => {
    const mockRequest = {
        headers: {},
        body: {},
        params: {},
        query: {}
    };

    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis()
    };

    return { mockRequest, mockResponse };
};

export const createGitHubWebhookMocks = (secret = 'test-secret') => {
    const crypto = require('crypto');
    
    const mockPayload = {
        repository: {
            name: 'test-repo',
            full_name: 'owner/test-repo',
            clone_url: 'https://github.com/owner/test-repo.git'
        },
        ref: 'refs/heads/main'
    };

    const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-digest')
    };

    jest.spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);

    const mockRequest = {
        headers: {
            'x-hub-signature-256': 'sha256=test-digest',
            'x-github-event': 'push',
            'x-log-prefix': 'test-prefix'
        },
        body: mockPayload
    };

    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };

    return { mockRequest, mockResponse, mockPayload };
}; 