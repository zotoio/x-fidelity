const { createCoverageThresholds } = require('./coverage-thresholds.config');

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/x-fidelity-cli',
    '<rootDir>/packages/x-fidelity-core', 
    '<rootDir>/packages/x-fidelity-plugins',
    '<rootDir>/packages/x-fidelity-server',
    '<rootDir>/packages/x-fidelity-types'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "packages/**/src/**/*.ts",
    "!packages/**/src/**/*.test.ts",
    "!packages/**/src/**/*.spec.ts", 
    "!packages/**/src/**/index.ts",
    "!packages/x-fidelity-fixtures/**",
    "!packages/x-fidelity-democonfig/**",
    "!packages/x-fidelity-vscode/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json", "text-summary"],
  coverageThreshold: createCoverageThresholds(),
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json"
    }]
  },
  testEnvironment: "node",
  setupFilesAfterEnv: [],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}; 