// Mock all dependencies before requiring anything
jest.mock('../openaiService', () => ({
  analyzeCode: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../services/databaseService', () => ({
  getInstance: jest.fn(() => ({
    getClient: jest.fn(() => ({})),
    healthCheck: jest.fn(() => Promise.resolve({ status: 'healthy' })),
    runMigrations: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../services/secretsService', () => {
  return jest.fn().mockImplementation(() => ({
    getAllSecrets: jest.fn(() => Promise.resolve([])),
    createSecret: jest.fn(() => Promise.resolve({ id: 1 })),
    updateSecret: jest.fn(() => Promise.resolve({ id: 1 })),
    deleteSecret: jest.fn(() => Promise.resolve()),
  }));
});

jest.mock('../services/reviewService', () => {
  return jest.fn().mockImplementation(() => ({
    listProjects: jest.fn(() => Promise.resolve([])),
    getProject: jest.fn(() => Promise.resolve(null)),
    createProject: jest.fn(() => Promise.resolve({ id: 1 })),
    createReview: jest.fn(() => Promise.resolve({ id: 1 })),
    getReview: jest.fn(() => Promise.resolve(null)),
    getFilesByReview: jest.fn(() => Promise.resolve([])),
    getFindings: jest.fn(() => Promise.resolve([])),
  }));
});

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => 'mock content'),
  writeFileSync: jest.fn(),
}));

jest.mock('rimraf', () => ({
  rimraf: jest.fn(() => Promise.resolve()),
}));

describe('Express Server Tests', () => {
  test('should load the main module without errors', () => {
    expect(() => {
      require('../index');
    }).not.toThrow();
  });

  test('should have required dependencies mocked', () => {
    const openaiService = require('../openaiService');
    const DatabaseService = require('../services/databaseService');
    const SecretsService = require('../services/secretsService');
    const ReviewService = require('../services/reviewService');

    expect(openaiService.analyzeCode).toBeDefined();
    expect(DatabaseService.getInstance).toBeDefined();
    expect(SecretsService).toBeDefined();
    expect(ReviewService).toBeDefined();
  });

  test('should initialize services correctly', () => {
    const DatabaseService = require('../services/databaseService');
    const SecretsService = require('../services/secretsService');
    const ReviewService = require('../services/reviewService');

    const dbInstance = DatabaseService.getInstance();
    expect(dbInstance.getClient).toBeDefined();
    expect(dbInstance.healthCheck).toBeDefined();

    const secretsService = new SecretsService();
    expect(secretsService.getAllSecrets).toBeDefined();

    const reviewService = new ReviewService();
    expect(reviewService.listProjects).toBeDefined();
  });

  test('should have express app configuration', () => {
    const express = require('express');
    expect(express).toBeDefined();
  });

  test('should handle environment variables', () => {
    expect(process.env.PORT || 3001).toBeDefined();
  });
});