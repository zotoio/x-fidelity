/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/src/"],
  setupFilesAfterEnv: ['./src/jest.setup.ts'],
  testMatch: ['**/*.test.ts', '!**/*.integration.test.ts'],
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
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        outDir: "./dist",
        rootDir: "./src",
        resolveJsonModule: true,
        types: ["@types/node", "@types/jest"]
      }
    }]
  },
  moduleNameMapper: {
    '^x-fidelity$': '<rootDir>/node_modules/x-fidelity/dist',
    '^@x-fidelity/types(.*)$': '<rootDir>/../x-fidelity-types/src$1',
    '^@x-fidelity/core(.*)$': '<rootDir>/../x-fidelity-core/src$1',
    '^@x-fidelity/plugins(.*)$': '<rootDir>/../x-fidelity-plugins/src$1',
    '^@x-fidelity/server(.*)$': '<rootDir>/../x-fidelity-server/src$1',
    '^@x-fidelity/democonfig(.*)$': '<rootDir>/../x-fidelity-democonfig/src$1'
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  // Jest 30 performance improvements
  testEnvironmentOptions: {
    globalsCleanup: 'soft'
  },
  reporters: [
    'default',
    ['<rootDir>/../../scripts/simple-json-reporter.js', {
      outputPath: './jest-results.json'
    }]
  ]
};
