module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '@x-fidelity/core': '<rootDir>/../x-fidelity-core/src',
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
}; 