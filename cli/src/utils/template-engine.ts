import { TemplateFetcher, TemplateSource } from './template-fetcher';
import { TemplateProcessor, TemplateContext, ProcessedTemplate } from './template-processor';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface TemplateEngineOptions {
  outputDir?: string;
  force?: boolean; // Overwrite existing files
}

export class TemplateEngine {
  private fetcher: TemplateFetcher;
  private processor: TemplateProcessor;

  constructor() {
    this.fetcher = new TemplateFetcher();
    this.processor = new TemplateProcessor();
  }

  /**
   * Process templates from a source and optionally write them to disk
   */
  async processTemplates(
    source: TemplateSource,
    context: TemplateContext,
    options: TemplateEngineOptions = {}
  ): Promise<ProcessedTemplate[]> {
    // Fetch templates from source
    const templates = await this.fetcher.fetchTemplate(source);
    
    if (templates.length === 0) {
      throw new Error('No templates found at the specified source');
    }

    // Process templates with context
    const processedTemplates = this.processor.processTemplates(templates, context);

    // Write to disk if output directory is specified
    if (options.outputDir) {
      await this.writeTemplates(processedTemplates, context, options.outputDir, options.force);
    }

    return processedTemplates;
  }

  /**
   * Write processed templates to disk
   */
  private async writeTemplates(
    templates: ProcessedTemplate[],
    context: TemplateContext,
    outputDir: string,
    force: boolean = false
  ): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    for (const template of templates) {
      // Process the entire path with Handlebars to support dynamic directory names
      const pathTemplate = this.processor.compile(template.originalPath);
      let processedPath = pathTemplate(context);
      
      // Remove .hbs extension from the processed path
      if (processedPath.endsWith('.hbs')) {
        processedPath = processedPath.slice(0, -4);
      }
      
      const outputPath = path.join(outputDir, processedPath);
      
      // Check if file exists and force flag is not set
      if (!force) {
        try {
          await fs.access(outputPath);
          console.warn(`File ${outputPath} already exists. Use --force to overwrite.`);
          continue;
        } catch {
          // File doesn't exist, continue with writing
        }
      }

      // Ensure subdirectories exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(outputPath, template.content, 'utf-8');
      console.log(`Created: ${outputPath}`);
    }
  }

  /**
   * Get available local templates
   */
  async getLocalTemplates(templatesDir: string = 'templates'): Promise<string[]> {
    try {
      const entries = await fs.readdir(templatesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Register a custom Handlebars helper
   */
  registerHelper(name: string, helper: any) {
    this.processor.registerHelper(name, helper);
  }

  /**
   * Register a custom Handlebars partial
   */
  registerPartial(name: string, partial: string) {
    this.processor.registerPartial(name, partial);
  }
}

// Convenience function for quick template processing
export async function processTemplate(
  source: TemplateSource,
  context: TemplateContext,
  options: TemplateEngineOptions = {}
): Promise<ProcessedTemplate[]> {
  const engine = new TemplateEngine();
  return engine.processTemplates(source, context, options);
}