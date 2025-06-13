// Jest setup file

// Mock console.log and console.warn for cleaner tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
};