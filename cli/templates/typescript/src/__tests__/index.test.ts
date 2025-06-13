import { greet } from '../index';

describe('{{name}}', () => {
  describe('greet', () => {
    it('should return a greeting message', () => {
      const result = greet('Test');
      expect(result).toBe('Hello, Test! Welcome to {{name}}.');
    });

    it('should handle empty string', () => {
      const result = greet('');
      expect(result).toBe('Hello, ! Welcome to {{name}}.');
    });
  });
});