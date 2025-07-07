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
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75, 
      functions: 80,
      lines: 80
    },
    // Package-specific thresholds
    "packages/x-fidelity-core/": {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    },
    "packages/x-fidelity-cli/": {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    "packages/x-fidelity-plugins/": {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    "packages/x-fidelity-server/": {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    "packages/x-fidelity-types/": {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  },
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