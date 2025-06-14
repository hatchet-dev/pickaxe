import { TemplateEngine, processTemplate } from '../template-engine';
import { TemplateFetcher } from '../template-fetcher';
import { TemplateProcessor } from '../template-processor';
import { promises as fs } from 'fs';

// Mock the dependencies
jest.mock('../template-fetcher');
jest.mock('../template-processor');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const MockedTemplateFetcher = TemplateFetcher as jest.MockedClass<typeof TemplateFetcher>;
const MockedTemplateProcessor = TemplateProcessor as jest.MockedClass<typeof TemplateProcessor>;

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let mockFetcher: jest.Mocked<TemplateFetcher>;
  let mockProcessor: jest.Mocked<TemplateProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetcher = {
      fetchTemplate: jest.fn(),
    } as any;
    
    mockProcessor = {
      processTemplates: jest.fn(),
      registerHelper: jest.fn(),
      registerPartial: jest.fn(),
      compile: jest.fn(),
    } as any;

    MockedTemplateFetcher.mockImplementation(() => mockFetcher);
    MockedTemplateProcessor.mockImplementation(() => mockProcessor);

    // Setup default compile mock behavior
    mockProcessor.compile.mockReturnValue((context: any) => 'test-path');

    engine = new TemplateEngine();
  });

  describe('processTemplates', () => {
    it('should fetch and process templates successfully', async () => {
      const mockTemplates = [
        {
          name: 'template.txt',
          content: 'Hello {{name}}!',
          path: '/template.txt',
        },
      ];

      const mockProcessedTemplates = [
        {
          name: 'template.txt',
          content: 'Hello World!',
          originalPath: '/template.txt',
        },
      ];

      mockFetcher.fetchTemplate.mockResolvedValueOnce(mockTemplates);
      mockProcessor.processTemplates.mockReturnValueOnce(mockProcessedTemplates);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };

      const result = await engine.processTemplates(source, context);

      expect(mockFetcher.fetchTemplate).toHaveBeenCalledWith(source);
      expect(mockProcessor.processTemplates).toHaveBeenCalledWith(mockTemplates, context);
      expect(result).toEqual(mockProcessedTemplates);
    });

    it('should throw error when no templates found', async () => {
      mockFetcher.fetchTemplate.mockResolvedValueOnce([]);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };

      await expect(engine.processTemplates(source, context)).rejects.toThrow(
        'No templates found at the specified source'
      );
    });

    it('should write templates to disk when outputDir is specified', async () => {
      const mockTemplates = [
        {
          name: 'template.txt',
          content: 'Hello {{name}}!',
          path: '/template.txt',
        },
      ];

      const mockProcessedTemplates = [
        {
          name: 'template.txt',
          content: 'Hello World!',
          originalPath: '/template.txt',
        },
      ];

      mockFetcher.fetchTemplate.mockResolvedValueOnce(mockTemplates);
      mockProcessor.processTemplates.mockReturnValueOnce(mockProcessedTemplates);
      mockProcessor.compile.mockReturnValue((context: any) => 'template.txt');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockRejectedValue(new Error('File not found')); // File doesn't exist
      mockedFs.writeFile.mockResolvedValue(undefined);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };
      const options = { outputDir: '/output' };

      const result = await engine.processTemplates(source, context, options);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/output/template.txt',
        'Hello World!',
        'utf-8'
      );
      expect(result).toEqual(mockProcessedTemplates);
    });

    it('should skip existing files when force is false', async () => {
      const mockTemplates = [
        {
          name: 'template.txt',
          content: 'Hello {{name}}!',
          path: '/template.txt',
        },
      ];

      const mockProcessedTemplates = [
        {
          name: 'template.txt',
          content: 'Hello World!',
          originalPath: '/template.txt',
        },
      ];

      mockFetcher.fetchTemplate.mockResolvedValueOnce(mockTemplates);
      mockProcessor.processTemplates.mockReturnValueOnce(mockProcessedTemplates);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined); // File exists
      mockedFs.writeFile.mockResolvedValue(undefined);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };
      const options = { outputDir: '/output', force: false };

      await engine.processTemplates(source, context, options);

      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('should overwrite existing files when force is true', async () => {
      const mockTemplates = [
        {
          name: 'template.txt',
          content: 'Hello {{name}}!',
          path: '/template.txt',
        },
      ];

      const mockProcessedTemplates = [
        {
          name: 'template.txt',
          content: 'Hello World!',
          originalPath: '/template.txt',
        },
      ];

      mockFetcher.fetchTemplate.mockResolvedValueOnce(mockTemplates);
      mockProcessor.processTemplates.mockReturnValueOnce(mockProcessedTemplates);
      mockProcessor.compile.mockReturnValue((context: any) => 'template.txt');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined); // File exists
      mockedFs.writeFile.mockResolvedValue(undefined);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };
      const options = { outputDir: '/output', force: true };

      await engine.processTemplates(source, context, options);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/output/template.txt',
        'Hello World!',
        'utf-8'
      );
    });

    it('should create subdirectories for nested file paths', async () => {
      const mockTemplates = [
        {
          name: 'template.txt',
          content: 'Hello {{name}}!',
          path: '/template.txt',
        },
      ];

      const mockProcessedTemplates = [
        {
          name: 'components/Button.tsx',
          content: 'Hello World!',
          originalPath: '/template.txt',
        },
      ];

      mockFetcher.fetchTemplate.mockResolvedValueOnce(mockTemplates);
      mockProcessor.processTemplates.mockReturnValueOnce(mockProcessedTemplates);
      mockProcessor.compile.mockReturnValue((context: any) => 'components/Button.tsx');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockRejectedValue(new Error('File not found')); // File doesn't exist
      mockedFs.writeFile.mockResolvedValue(undefined);

      const source = { type: 'local' as const, path: '/templates' };
      const context = { name: 'World' };
      const options = { outputDir: '/output' };

      await engine.processTemplates(source, context, options);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true });
      expect(mockedFs.mkdir).toHaveBeenCalledWith('/output/components', { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/output/components/Button.tsx',
        'Hello World!',
        'utf-8'
      );
    });
  });

  describe('getLocalTemplates', () => {
    it('should return list of template directories', async () => {
      const mockEntries = [
        { name: 'component', isDirectory: () => true },
        { name: 'page', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ] as any[];

      mockedFs.readdir.mockResolvedValueOnce(mockEntries);

      const result = await engine.getLocalTemplates('/templates');

      expect(result).toEqual(['component', 'page']);
      expect(mockedFs.readdir).toHaveBeenCalledWith('/templates', { withFileTypes: true });
    });

    it('should return empty array when directory does not exist', async () => {
      mockedFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await engine.getLocalTemplates('/nonexistent');

      expect(result).toEqual([]);
    });

    it('should use default templates directory', async () => {
      mockedFs.readdir.mockResolvedValueOnce([]);

      await engine.getLocalTemplates();

      expect(mockedFs.readdir).toHaveBeenCalledWith('templates', { withFileTypes: true });
    });
  });

  describe('registerHelper', () => {
    it('should register custom helper', () => {
      const customHelper = jest.fn();
      
      engine.registerHelper('custom', customHelper);

      expect(mockProcessor.registerHelper).toHaveBeenCalledWith('custom', customHelper);
    });
  });

  describe('registerPartial', () => {
    it('should register custom partial', () => {
      const partial = '<div>{{content}}</div>';
      
      engine.registerPartial('wrapper', partial);

      expect(mockProcessor.registerPartial).toHaveBeenCalledWith('wrapper', partial);
    });
  });
});

describe('processTemplate convenience function', () => {
  it('should create engine and process templates', async () => {
    const mockResult = [
      {
        name: 'output.txt',
        content: 'Processed content',
        originalPath: '/template.txt',
      },
    ];

    const mockTemplates = [
      {
        name: 'template.txt',
        content: 'Hello {{name}}!',
        path: '/template.txt',
      },
    ];

    // Create new mocks for this test
    const localMockFetcher = {
      fetchTemplate: jest.fn().mockResolvedValue(mockTemplates),
    } as any;
    
    const localMockProcessor = {
      processTemplates: jest.fn().mockReturnValue(mockResult),
      registerHelper: jest.fn(),
      registerPartial: jest.fn(),
      compile: jest.fn().mockReturnValue((context: any) => 'test-path'),
    } as any;

    MockedTemplateFetcher.mockImplementation(() => localMockFetcher);
    MockedTemplateProcessor.mockImplementation(() => localMockProcessor);

    const source = { type: 'local' as const, path: '/templates' };
    const context = { name: 'World' };
    const options = { outputDir: '/output' };

    const result = await processTemplate(source, context, options);

    expect(result).toEqual(mockResult);
    expect(localMockFetcher.fetchTemplate).toHaveBeenCalledWith(source);
    expect(localMockProcessor.processTemplates).toHaveBeenCalledWith(mockTemplates, context);
  });
});