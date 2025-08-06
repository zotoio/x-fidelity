/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  // Coverage thresholds are managed centrally in ../../coverage-thresholds.config.js
  // This ensures consistency across all packages in the monorepo
  reporters: [
    'default',
    ['<rootDir>/../../scripts/simple-json-reporter.js', {
      outputPath: './jest-results.json'
    }]
  ],
  moduleNameMapper: {
    "^@x-fidelity/core/(.*)$": "<rootDir>/src/$1",
    "^@x-fidelity/types/(.*)$": "<rootDir>/../x-fidelity-types/src/$1",
    "^@x-fidelity/types$": "<rootDir>/../x-fidelity-types/src/index",
    "^@x-fidelity/plugins/(.*)$": "<rootDir>/../x-fidelity-plugins/src/$1",
    "^@x-fidelity/plugins$": "<rootDir>/../x-fidelity-plugins/src/index"
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        outDir: "./dist",
        rootDir: "./src",
        isolatedModules: true,
        resolveJsonModule: true,
        types: ["@types/node", "@types/jest"]
      }
    }]
  },
  testMatch: process.env.JEST_INTEGRATION ? [
    "**/*.integration.test.ts"
  ] : [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
    "!**/*.integration.test.ts"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Ignore compiled mock files to prevent duplicates
  modulePathIgnorePatterns: ["<rootDir>/dist/.*/__mocks__/"],
  // Improve test cleanup and prevent hanging
  testTimeout: 15000,
  detectOpenHandles: true,
  // Reset modules and mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Jest 30 performance improvements
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  }
};
