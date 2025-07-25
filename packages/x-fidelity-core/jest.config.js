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
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 62.3,
      branches: 52.0,
      functions: 58.3,
      lines: 62.6
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
      tsconfig: {
        outDir: "./dist",
        rootDir: "./src",
        isolatedModules: true,
        resolveJsonModule: true,
        types: ["@types/node", "@types/jest"]
      }
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
