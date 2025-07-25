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
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  },
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
  }
};
