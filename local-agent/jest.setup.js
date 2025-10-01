// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});