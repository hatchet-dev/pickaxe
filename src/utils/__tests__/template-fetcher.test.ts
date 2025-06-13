import { TemplateFetcher } from '../template-fetcher';
import { promises as fs } from 'fs';
import axios from 'axios';
import * as path from 'path';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('TemplateFetcher', () => {
  let fetcher: TemplateFetcher;

  beforeEach(() => {
    fetcher = new TemplateFetcher();
    jest.clearAllMocks();
  });

  describe('GitHub templates', () => {
    it('should fetch templates from GitHub successfully', async () => {
      const mockApiResponse = [
        {
          name: 'template.txt',
          type: 'file',
          path: 'templates/template.txt',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/templates/template.txt',
        },
      ];

      const mockFileContent = 'Hello {{name}}!';

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockApiResponse })
        .mockResolvedValueOnce({ data: mockFileContent });

      const result = await fetcher.fetchTemplate({
        type: 'github',
        path: 'owner/repo/templates',
        ref: 'main',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'template.txt',
        content: mockFileContent,
        path: 'templates/template.txt',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/templates?ref=main'
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(mockApiResponse[0].download_url);
    });

    it('should handle GitHub API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        fetcher.fetchTemplate({
          type: 'github',
          path: 'owner/repo/templates',
        })
      ).rejects.toThrow('Failed to fetch template from GitHub: API Error');
    });

    it('should throw error for invalid GitHub path', async () => {
      await expect(
        fetcher.fetchTemplate({
          type: 'github',
          path: 'invalid-path',
        })
      ).rejects.toThrow('GitHub path must be in format: owner/repo/path/to/template');
    });

    it('should use default ref when not specified', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: '' });

      await fetcher.fetchTemplate({
        type: 'github',
        path: 'owner/repo/templates',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/templates?ref=main'
      );
    });
  });

  describe('Local templates', () => {
    it('should fetch templates from local directory', async () => {
      const mockStat = { isDirectory: () => true } as any;
      const mockEntries = [
        { name: 'template1.txt', isFile: () => true },
        { name: 'template2.txt', isFile: () => true },
      ] as any[];

      mockedFs.stat.mockResolvedValueOnce(mockStat);
      mockedFs.readdir.mockResolvedValueOnce(mockEntries);
      mockedFs.readFile
        .mockResolvedValueOnce('Content 1')
        .mockResolvedValueOnce('Content 2');

      const result = await fetcher.fetchTemplate({
        type: 'local',
        path: '/path/to/templates',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'template1.txt',
        content: 'Content 1',
        path: path.join('/path/to/templates', 'template1.txt'),
      });
      expect(result[1]).toEqual({
        name: 'template2.txt',
        content: 'Content 2',
        path: path.join('/path/to/templates', 'template2.txt'),
      });
    });

    it('should fetch single file template', async () => {
      const mockStat = { isDirectory: () => false } as any;

      mockedFs.stat.mockResolvedValueOnce(mockStat);
      mockedFs.readFile.mockResolvedValueOnce('Single file content');

      const result = await fetcher.fetchTemplate({
        type: 'local',
        path: '/path/to/template.txt',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'template.txt',
        content: 'Single file content',
        path: '/path/to/template.txt',
      });
    });

    it('should handle local file system errors', async () => {
      mockedFs.stat.mockRejectedValueOnce(new Error('File not found'));

      await expect(
        fetcher.fetchTemplate({
          type: 'local',
          path: '/nonexistent/path',
        })
      ).rejects.toThrow('Failed to fetch template from local path: File not found');
    });

    it('should skip non-file entries in directory', async () => {
      const mockStat = { isDirectory: () => true } as any;
      const mockEntries = [
        { name: 'template.txt', isFile: () => true },
        { name: 'subdirectory', isFile: () => false },
      ] as any[];

      mockedFs.stat.mockResolvedValueOnce(mockStat);
      mockedFs.readdir.mockResolvedValueOnce(mockEntries);
      mockedFs.readFile.mockResolvedValueOnce('Content');

      const result = await fetcher.fetchTemplate({
        type: 'local',
        path: '/path/to/templates',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('template.txt');
    });
  });

  describe('Unsupported source types', () => {
    it('should throw error for unsupported source type', async () => {
      await expect(
        fetcher.fetchTemplate({
          type: 'unsupported' as any,
          path: '/some/path',
        })
      ).rejects.toThrow('Unsupported template source type: unsupported');
    });
  });
});