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
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 15000,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
