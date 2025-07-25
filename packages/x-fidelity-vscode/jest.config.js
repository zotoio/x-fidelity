module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/test/unit/**/*.test.ts', '**/src/**/*.unit.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json'
      }
    ]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 14.3,
      branches: 11.7,
      functions: 13.7,
      lines: 14.5
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^vscode$': '<rootDir>/src/test/mocks/vscode.mock.ts',
    '^@x-fidelity/core$': '<rootDir>/../x-fidelity-core/dist/index.js',
    '^@x-fidelity/types$': '<rootDir>/../x-fidelity-types/dist/index.js',
    '^@x-fidelity/plugins$': '<rootDir>/../x-fidelity-plugins/dist/index.js',
    '^@x-fidelity/democonfig$':
      '<rootDir>/../x-fidelity-democonfig/dist/index.js'
  },
  testTimeout: 10000
};
