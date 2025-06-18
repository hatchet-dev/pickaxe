import { createTool } from '../add-tool';
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

describe('add-tool command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('createTool', () => {
    it('should create tool with correct next steps', async () => {
      // Mock that directory doesn't exist (fs.access throws)
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/tool');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      const result = await createTool('my-tool', { 
        description: 'A sample tool for testing',
        category: 'utility',
        silent: false 
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Tool 'my-tool' created successfully");
      
      // Verify the next steps provide proper guidance
      expect(mockConsoleLog).toHaveBeenCalledWith('1. Define your input and output schemas in the tool file');
      expect(mockConsoleLog).toHaveBeenCalledWith('2. Implement the tool logic in the fn function');
      expect(mockConsoleLog).toHaveBeenCalledWith('3. Import and add the tool to your agent\'s toolbox');
      
      // Verify it shows the file creation location
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📁 File created:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('src/tools'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('my-tool.tool.ts'));
    });

    it('should work in silent mode', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/tool');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      const result = await createTool('my-tool', { 
        description: 'A sample tool for testing',
        category: 'utility',
        silent: true 
      });

      expect(result.success).toBe(true);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should use default category when not provided', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/tool');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      const result = await createTool('my-tool', { 
        description: 'A sample tool',
        silent: true 
      });

      expect(result.config.category).toBe('utility');
    });

    it('should call processTemplate with correct parameters', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/tool');
      mockedUpdateBarrelFile.mockResolvedValueOnce(undefined);

      await createTool('my-tool', { 
        description: 'A sample tool',
        category: 'data',
        silent: true 
      });

      expect(mockedProcessTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local',
          path: '/mock/templates/tool'
        }),
        expect.objectContaining({
          name: 'my-tool',
          description: 'A sample tool',
          category: 'data'
        }),
        expect.objectContaining({
          outputDir: expect.stringMatching(/src\/tools$/),
          force: false
        })
      );
    });
  });
});