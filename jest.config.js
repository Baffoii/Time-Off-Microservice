/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    // Exclude bootstrap entry points, config modules, seeds, and the mock HCM
    // server (infrastructure code, not business logic under test)
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/database/database.module.ts',
    '!src/database/seeds/**',
    '!src/database/entities/index.ts',
    '!src/mock-hcm/**',
    '!src/**/*.module.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 15000,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
