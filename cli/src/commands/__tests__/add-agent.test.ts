import { createAgent } from '../add-agent';
import { promises as fs } from 'fs';
import { processTemplate, getTemplatePath, updateBarrelFile } from '../../utils';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('../../utils', () => ({
  processTemplate: jest.fn(),
  getTemplatePath: jest.fn(),
  updateBarrelFile: jest.fn(),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedProcessTemplate = processTemplate as jest.MockedFunction<typeof processTemplate>;
const mockedGetTemplatePath = getTemplatePath as jest.MockedFunction<typeof getTemplatePath>;
const mockedUpdateBarrelFile = updateBarrelFile as jest.MockedFunction<typeof updateBarrelFile>;

describe('add-agent command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('createAgent', () => {
    it('should create agent with correct next steps', async () => {
      // Mock that directory doesn't exist (fs.access throws)
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/agent');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      const result = await createAgent('my-agent', { 
        description: 'Sample agent description',
        silent: false 
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Agent 'my-agent' created successfully");
      
      // Verify the next steps don't mention tests
      expect(mockConsoleLog).toHaveBeenCalledWith('1. Import your tools and add them to the toolbox');
      expect(mockConsoleLog).toHaveBeenCalledWith('2. Implement tool result handling in the switch statement');
      expect(mockConsoleLog).toHaveBeenCalledWith('3. Update the agent implementation as needed');
      
      // Verify it doesn't mention running tests or test functionality
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Run the tests'));
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('test to verify'));
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('tests to verify'));
    });

    it('should work in silent mode', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/agent');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      const result = await createAgent('my-agent', { 
        description: 'Sample agent description',
        silent: true 
      });

      expect(result.success).toBe(true);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });
});