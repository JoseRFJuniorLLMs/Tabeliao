import type { Config } from 'jest';

const config: Config = {
  // ─── Monorepo project configuration ────────────────────────────────────────
  projects: [
    {
      displayName: 'auth-service',
      rootDir: 'services/auth-service',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
      ],
    },
    {
      displayName: 'contract-service',
      rootDir: 'services/contract-service',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
      ],
    },
    {
      displayName: 'payment-service',
      rootDir: 'services/payment-service',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
      ],
    },
    {
      displayName: 'ai-service',
      rootDir: 'services/ai-service',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
      ],
    },
    {
      displayName: 'dispute-service',
      rootDir: 'services/dispute-service',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
      ],
    },
  ],

  // ─── Global coverage configuration ─────────────────────────────────────────
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],

  // ─── Verbose output ────────────────────────────────────────────────────────
  verbose: true,
};

export default config;
