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
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 91.4,
      branches: 95.2,
      functions: 61.0,
      lines: 90.8
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@x-fidelity/types/(.*)$': '<rootDir>/src/$1',
    '^@x-fidelity/types$': '<rootDir>/src/index'
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  // Jest 30 performance improvements
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  }
}; 