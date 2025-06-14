import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface TemplateSource {
  type: 'github' | 'local';
  path: string;
  ref?: string; // For GitHub: branch, tag, or commit
}

export interface TemplateFile {
  name: string;
  content: string;
  path: string;
}

export class TemplateFetcher {
  async fetchTemplate(source: TemplateSource): Promise<TemplateFile[]> {
    switch (source.type) {
      case 'github':
        return this.fetchFromGitHub(source);
      case 'local':
        return this.fetchFromLocal(source);
      default:
        throw new Error(`Unsupported template source type: ${(source as any).type}`);
    }
  }

  private async fetchFromGitHub(source: TemplateSource): Promise<TemplateFile[]> {
    const { path: repoPath, ref = 'main' } = source;
    const [owner, repo, ...pathParts] = repoPath.split('/');
    const templatePath = pathParts.join('/');
    
    if (!owner || !repo) {
      throw new Error('GitHub path must be in format: owner/repo/path/to/template');
    }

    try {
      // Get directory contents from GitHub API
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${templatePath}?ref=${ref}`;
      const response = await axios.get(apiUrl);
      
      const files: TemplateFile[] = [];
      const items = Array.isArray(response.data) ? response.data : [response.data];
      
      for (const item of items) {
        if (item.type === 'file') {
          // Fetch file content
          const fileResponse = await axios.get(item.download_url);
          files.push({
            name: item.name,
            content: fileResponse.data,
            path: item.path,
          });
        }
      }
      
      return files;
    } catch (error) {
      throw new Error(`Failed to fetch template from GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchFromLocal(source: TemplateSource): Promise<TemplateFile[]> {
    const templatePath = path.resolve(source.path);
    
    try {
      const stat = await fs.stat(templatePath);
      const files: TemplateFile[] = [];
      
      if (stat.isDirectory()) {
        await this.readDirectoryRecursively(templatePath, templatePath, files);
      } else {
        // Single file
        const content = await fs.readFile(templatePath, 'utf-8');
        files.push({
          name: path.basename(templatePath),
          content,
          path: templatePath,
        });
      }
      
      return files;
    } catch (error) {
      throw new Error(`Failed to fetch template from local path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async readDirectoryRecursively(
    currentPath: string, 
    basePath: string, 
    files: TemplateFile[]
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isFile()) {
        const content = await fs.readFile(fullPath, 'utf-8');
        // Calculate relative path from the base template directory
        const relativePath = path.relative(basePath, fullPath);
        
        files.push({
          name: entry.name,
          content,
          path: relativePath,
        });
      } else if (entry.isDirectory()) {
        // Recursively process subdirectories
        await this.readDirectoryRecursively(fullPath, basePath, files);
      }
    }
  }
}