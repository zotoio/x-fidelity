/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts', '!**/*.integration.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 56.7,
      branches: 38.2,
      functions: 44.2,
      lines: 56.8
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@x-fidelity/types/(.*)$': '<rootDir>/../x-fidelity-types/src/$1',
    '^@x-fidelity/types$': '<rootDir>/../x-fidelity-types/src/index',
    '^@x-fidelity/core/(.*)$': '<rootDir>/../x-fidelity-core/src/$1',
    '^@x-fidelity/core$': '<rootDir>/../x-fidelity-core/src/index',
    '^@x-fidelity/plugins/(.*)$': '<rootDir>/../x-fidelity-plugins/src/$1',
    '^@x-fidelity/plugins$': '<rootDir>/../x-fidelity-plugins/src/index',
    '^@x-fidelity/server/(.*)$': '<rootDir>/src/$1',
    '^@x-fidelity/server$': '<rootDir>/src/index',
    '^glob$': '<rootDir>/jest-mocks/glob.js'
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  // Jest 30 performance improvements
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  },
  // Transform ignore patterns to handle ESM modules  
  transformIgnorePatterns: [
    'node_modules/(?!(glob|path-scurry)/)'
  ],
  reporters: [
    'default',
    ['<rootDir>/../../scripts/simple-json-reporter.js', {
      outputPath: './jest-results.json'
    }]
  ]
}; 