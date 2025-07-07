/**
 * Shared Jest setup for X-Fidelity packages
 * Sets up common mocks and test environment
 */

import { setupCoreMock } from './mockCore';

// Setup global mocks
beforeEach(() => {
    jest.clearAllMocks();
});

// Setup core mock by default
const coreMock = setupCoreMock();

// Make mock available globally for tests that need to access it
(global as any).coreMock = coreMock;

// Mock common Node.js modules
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
        lstat: jest.fn()
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

jest.mock('child_process', () => ({
    exec: jest.fn(),
    execSync: jest.fn(),
    spawn: jest.fn()
}));

// Export mock creators for easy access
export { setupCoreMock, createCoreMock } from './mockCore';
export * from './index'; 