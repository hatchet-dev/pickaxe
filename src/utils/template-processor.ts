import Handlebars from 'handlebars';
import { TemplateFile } from './template-fetcher';

export interface TemplateContext {
  [key: string]: any;
}

export interface ProcessedTemplate {
  name: string;
  content: string;
  originalPath: string;
}

export class TemplateProcessor {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers() {
    // Register common helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str ? str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '') : '';
    });

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) return '';
      const camelCase = str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str ? str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[\s_]+/g, '-') : '';
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str ? str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[\s-]+/g, '_') : '';
    });

    // Date helper
    this.handlebars.registerHelper('currentDate', () => {
      return new Date().toISOString().split('T')[0];
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
  }

  processTemplates(templates: TemplateFile[], context: TemplateContext): ProcessedTemplate[] {
    return templates.map(template => this.processTemplate(template, context));
  }

  processTemplate(template: TemplateFile, context: TemplateContext): ProcessedTemplate {
    try {
      // Compile the template
      const compiledTemplate = this.handlebars.compile(template.content);
      
      // Process the content with the provided context
      const processedContent = compiledTemplate(context);
      
      // Also process the filename if it contains handlebars syntax
      const compiledName = this.handlebars.compile(template.name);
      let processedName = compiledName(context);
      
      // Remove .hbs extension from the final filename
      if (processedName.endsWith('.hbs')) {
        processedName = processedName.slice(0, -4);
      }
      
      return {
        name: processedName,
        content: processedContent,
        originalPath: template.path,
      };
    } catch (error) {
      throw new Error(`Failed to process template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Method to add custom helpers
  registerHelper(name: string, helper: Handlebars.HelperDelegate) {
    this.handlebars.registerHelper(name, helper);
  }

  // Method to add custom partials
  registerPartial(name: string, partial: string) {
    this.handlebars.registerPartial(name, partial);
  }
}