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
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    }
  },
  moduleNameMapper: {
    "^@x-fidelity/core/(.*)$": "<rootDir>/src/$1",
    "^@x-fidelity/types/(.*)$": "<rootDir>/../x-fidelity-types/src/$1",
    "^@x-fidelity/types$": "<rootDir>/../x-fidelity-types/src/index",
    "^@x-fidelity/plugins/(.*)$": "<rootDir>/../x-fidelity-plugins/src/$1",
    "^@x-fidelity/plugins$": "<rootDir>/../x-fidelity-plugins/src/index"
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json"
    }]
  },
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mts", "cts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Improve test cleanup and prevent hanging
  testTimeout: 15000,
  forceExit: true,
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
