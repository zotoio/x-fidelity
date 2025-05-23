/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/src/"],
  setupFilesAfterEnv: ['./src/jest.setup.ts'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  moduleNameMapper: {
    '^x-fidelity$': '<rootDir>/node_modules/x-fidelity/dist'
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
