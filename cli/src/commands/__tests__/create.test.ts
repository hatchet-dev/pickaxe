import { create } from '../create';
import { promises as fs } from 'fs';
import * as path from 'path';
import prompts from 'prompts';
import { processTemplate, getTemplatePath } from '../../utils';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
  },
}));

jest.mock('prompts');
jest.mock('../../utils', () => ({
  processTemplate: jest.fn(),
  getTemplatePath: jest.fn(),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPrompts = prompts as jest.MockedFunction<typeof prompts>;
const mockedProcessTemplate = processTemplate as jest.MockedFunction<typeof processTemplate>;
const mockedGetTemplatePath = getTemplatePath as jest.MockedFunction<typeof getTemplatePath>;

describe('create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('successful project creation', () => {
    it('should create a new geo project with provided name', async () => {
      const projectConfig = {
        name: 'test-project',
        description: 'A test project',
        author: 'Test Author',
        template: 'geo'
      };

      // Mock that directory doesn't exist (fs.access throws)
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));

      // Mock prompts responses
      mockedPrompts.mockResolvedValueOnce(projectConfig);

      // Mock successful template processing
      mockedProcessTemplate.mockResolvedValueOnce([]);
      mockedGetTemplatePath.mockReturnValueOnce('/mock/templates/geo');

      await create('test-project');

      expect(mockedPrompts).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'name',
          initial: 'test-project'
        }),
        expect.objectContaining({
          name: 'description'
        }),
        expect.objectContaining({
          name: 'author'
        }),
        expect.objectContaining({
          name: 'template',
          choices: [
            expect.objectContaining({
              title: 'Geo Agent',
              value: 'geo'
            })
          ]
        })
      ]);

      expect(mockedProcessTemplate).toHaveBeenCalledWith(
        {
          type: 'local',
          path: '/mock/templates/geo'
        },
        projectConfig,
        {
          outputDir: path.join(process.cwd(), 'test-project'),
          force: true
        }
      );

      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 Creating new project...');
      expect(mockConsoleLog).toHaveBeenCalledWith(`\n✅ Project 'test-project' created successfully!`);
    });

    it('should create project without initial name', async () => {
      const projectConfig = {
        name: 'my-new-project',
        description: 'A new project',
        author: '',
        template: 'typescript'
      };

      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce(projectConfig);
      mockedProcessTemplate.mockResolvedValueOnce([]);

      await create();

      expect(mockedPrompts).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'name',
          initial: 'my-project'
        }),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      ]);
    });
  });

  describe('directory already exists', () => {
    it('should prompt for overwrite when directory exists and user confirms', async () => {
      const projectConfig = {
        name: 'existing-project',
        description: 'An existing project',
        author: 'Test Author',
        template: 'typescript'
      };

      // Mock that directory exists (fs.access succeeds)
      mockedFs.access.mockResolvedValueOnce(undefined);

      // Mock prompts responses - first for config, then for overwrite confirmation
      mockedPrompts
        .mockResolvedValueOnce(projectConfig)
        .mockResolvedValueOnce({ overwrite: true });

      mockedProcessTemplate.mockResolvedValueOnce([]);

      await create('existing-project');

      expect(mockedPrompts).toHaveBeenCalledTimes(2);
      expect(mockedPrompts).toHaveBeenNthCalledWith(2, {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory 'existing-project' already exists. Overwrite?`,
        initial: false
      });

      expect(mockedProcessTemplate).toHaveBeenCalled();
    });

    it('should cancel creation when user declines overwrite', async () => {
      const projectConfig = {
        name: 'existing-project',
        description: 'An existing project',
        author: 'Test Author',
        template: 'typescript'
      };

      mockedFs.access.mockResolvedValueOnce(undefined);
      mockedPrompts
        .mockResolvedValueOnce(projectConfig)
        .mockResolvedValueOnce({ overwrite: false });

      await create('existing-project');

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Project creation cancelled');
      expect(mockedProcessTemplate).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('should validate project name format', async () => {
      const projectConfig = {
        name: 'valid-project-123',
        description: 'A valid project',
        author: 'Test Author',
        template: 'typescript'
      };

      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce(projectConfig);
      mockedProcessTemplate.mockResolvedValueOnce([]);

      await create();

      const nameQuestion = (mockedPrompts.mock.calls[0][0] as any[])[0];
      
      // Test valid names
      expect(nameQuestion.validate('valid-name')).toBe(true);
      expect(nameQuestion.validate('project-123')).toBe(true);
      expect(nameQuestion.validate('simple')).toBe(true);

      // Test invalid names
      expect(nameQuestion.validate('')).toBe('Project name is required');
      expect(nameQuestion.validate('   ')).toBe('Project name is required');
      expect(nameQuestion.validate('Invalid Name')).toBe('Project name must contain only lowercase letters, numbers, and hyphens');
      expect(nameQuestion.validate('invalid_name')).toBe('Project name must contain only lowercase letters, numbers, and hyphens');
      expect(nameQuestion.validate('INVALID')).toBe('Project name must contain only lowercase letters, numbers, and hyphens');
    });
  });

  describe('user cancellation', () => {
    it('should exit when user cancels prompts', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce({});

      await create();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Project creation cancelled');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
      expect(mockedProcessTemplate).not.toHaveBeenCalled();
    });

    it('should exit when name is missing from prompts response', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce({
        description: 'Test',
        author: 'Test Author',
        template: 'typescript'
      });

      await create();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Project creation cancelled');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should handle template processing errors', async () => {
      const projectConfig = {
        name: 'test-project',
        description: 'A test project',
        author: 'Test Author',
        template: 'typescript'
      };

      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce(projectConfig);
      mockedProcessTemplate.mockRejectedValueOnce(new Error('Template processing failed'));

      await create('test-project');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to create project:', 'Template processing failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle unknown errors', async () => {
      const projectConfig = {
        name: 'test-project',
        description: 'A test project',
        author: 'Test Author',
        template: 'typescript'
      };

      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce(projectConfig);
      mockedProcessTemplate.mockRejectedValueOnce('String error');

      await create('test-project');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to create project:', 'Unknown error');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('output messages', () => {
    it('should display correct next steps after successful creation', async () => {
      const projectConfig = {
        name: 'awesome-project',
        description: 'An awesome project',
        author: 'Developer',
        template: 'typescript'
      };

      mockedFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockedPrompts.mockResolvedValueOnce(projectConfig);
      mockedProcessTemplate.mockResolvedValueOnce([]);

      await create('awesome-project');

      expect(mockConsoleLog).toHaveBeenCalledWith(`\n✅ Project 'awesome-project' created successfully!`);
      expect(mockConsoleLog).toHaveBeenCalledWith(`📁 Project created in: ${path.join(process.cwd(), 'awesome-project')}`);
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📝 Next steps:');
      expect(mockConsoleLog).toHaveBeenCalledWith('1. cd awesome-project');
      expect(mockConsoleLog).toHaveBeenCalledWith('2. npm install');
      expect(mockConsoleLog).toHaveBeenCalledWith('3. Configure your environment variables');
      expect(mockConsoleLog).toHaveBeenCalledWith('4. npm run dev');
    });
  });
});