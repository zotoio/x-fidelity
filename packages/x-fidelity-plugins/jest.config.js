/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@x-fidelity/types/(.*)$': '<rootDir>/../x-fidelity-types/src/$1',
    '^@x-fidelity/types$': '<rootDir>/../x-fidelity-types/src/index',
    '^@x-fidelity/core/(.*)$': '<rootDir>/../x-fidelity-core/src/$1',
    '^@x-fidelity/core$': '<rootDir>/../x-fidelity-core/src/index',
    '^@x-fidelity/plugins/(.*)$': '<rootDir>/src/$1',
    '^@x-fidelity/plugins$': '<rootDir>/src/index'
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  // Jest 30 performance improvements
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  }
}; 