import { TemplateProcessor } from '../template-processor';
import { TemplateFile } from '../template-fetcher';

describe('TemplateProcessor', () => {
  let processor: TemplateProcessor;

  beforeEach(() => {
    processor = new TemplateProcessor();
  });

  describe('processTemplate', () => {
    it('should process a simple template', () => {
      const template: TemplateFile = {
        name: 'test.txt',
        content: 'Hello {{name}}!',
        path: '/test.txt',
      };

      const context = { name: 'World' };
      const result = processor.processTemplate(template, context);

      expect(result).toEqual({
        name: 'test.txt',
        content: 'Hello World!',
        originalPath: '/test.txt',
      });
    });

    it('should process template filename with handlebars', () => {
      const template: TemplateFile = {
        name: '{{kebabCase name}}.component.tsx',
        content: 'export const {{pascalCase name}} = () => {};',
        path: '/template.tsx',
      };

      const context = { name: 'MyButton' };
      const result = processor.processTemplate(template, context);

      expect(result.name).toBe('my-button.component.tsx');
      expect(result.content).toBe('export const MyButton = () => {};');
    });

    it('should handle template processing errors', () => {
      const template: TemplateFile = {
        name: 'test.txt',
        content: 'Hello {{#invalid syntax}}!',
        path: '/test.txt',
      };

      const context = {};

      expect(() => processor.processTemplate(template, context)).toThrow();
    });
  });

  describe('processTemplates', () => {
    it('should process multiple templates', () => {
      const templates: TemplateFile[] = [
        {
          name: 'file1.txt',
          content: 'Hello {{name}}!',
          path: '/file1.txt',
        },
        {
          name: 'file2.txt',
          content: 'Goodbye {{name}}!',
          path: '/file2.txt',
        },
      ];

      const context = { name: 'World' };
      const results = processor.processTemplates(templates, context);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Hello World!');
      expect(results[1].content).toBe('Goodbye World!');
    });
  });

  describe('built-in helpers', () => {
    const template: TemplateFile = {
      name: 'test.txt',
      content: '',
      path: '/test.txt',
    };

    it('should handle uppercase helper', () => {
      template.content = '{{uppercase name}}';
      const result = processor.processTemplate(template, { name: 'hello' });
      expect(result.content).toBe('HELLO');
    });

    it('should handle lowercase helper', () => {
      template.content = '{{lowercase name}}';
      const result = processor.processTemplate(template, { name: 'HELLO' });
      expect(result.content).toBe('hello');
    });

    it('should handle camelCase helper', () => {
      template.content = '{{camelCase name}}';
      const result = processor.processTemplate(template, { name: 'hello-world_test' });
      expect(result.content).toBe('helloWorldTest');
    });

    it('should handle pascalCase helper', () => {
      template.content = '{{pascalCase name}}';
      const result = processor.processTemplate(template, { name: 'hello-world_test' });
      expect(result.content).toBe('HelloWorldTest');
    });

    it('should handle kebabCase helper', () => {
      template.content = '{{kebabCase name}}';
      const result = processor.processTemplate(template, { name: 'HelloWorldTest' });
      expect(result.content).toBe('hello-world-test');
    });

    it('should handle snakeCase helper', () => {
      template.content = '{{snakeCase name}}';
      const result = processor.processTemplate(template, { name: 'HelloWorldTest' });
      expect(result.content).toBe('hello_world_test');
    });

    it('should handle currentDate helper', () => {
      template.content = '{{currentDate}}';
      const result = processor.processTemplate(template, {});
      
      // Should be in YYYY-MM-DD format
      expect(result.content).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle conditional helpers', () => {
      template.content = '{{#if (eq status "active")}}Active{{else}}Inactive{{/if}}';
      
      let result = processor.processTemplate(template, { status: 'active' });
      expect(result.content).toBe('Active');

      result = processor.processTemplate(template, { status: 'inactive' });
      expect(result.content).toBe('Inactive');
    });

    it('should handle ne (not equal) helper', () => {
      template.content = '{{#if (ne status "active")}}Not Active{{else}}Active{{/if}}';
      
      let result = processor.processTemplate(template, { status: 'inactive' });
      expect(result.content).toBe('Not Active');

      result = processor.processTemplate(template, { status: 'active' });
      expect(result.content).toBe('Active');
    });

    it('should handle gt (greater than) helper', () => {
      template.content = '{{#if (gt count 5)}}Many{{else}}Few{{/if}}';
      
      let result = processor.processTemplate(template, { count: 10 });
      expect(result.content).toBe('Many');

      result = processor.processTemplate(template, { count: 3 });
      expect(result.content).toBe('Few');
    });

    it('should handle lt (less than) helper', () => {
      template.content = '{{#if (lt count 5)}}Few{{else}}Many{{/if}}';
      
      let result = processor.processTemplate(template, { count: 3 });
      expect(result.content).toBe('Few');

      result = processor.processTemplate(template, { count: 10 });
      expect(result.content).toBe('Many');
    });

    it('should handle empty or undefined values gracefully', () => {
      template.content = '{{uppercase name}} {{kebabCase name}}';
      const result = processor.processTemplate(template, { name: '' });
      expect(result.content).toBe(' ');
    });

    it('should handle undefined values gracefully', () => {
      template.content = '{{uppercase name}} {{kebabCase name}}';
      const result = processor.processTemplate(template, {});
      expect(result.content).toBe(' ');
    });
  });

  describe('registerHelper', () => {
    it('should allow registering custom helpers', () => {
      processor.registerHelper('reverse', (str: string) => {
        return str ? str.split('').reverse().join('') : '';
      });

      const template: TemplateFile = {
        name: 'test.txt',
        content: '{{reverse name}}',
        path: '/test.txt',
      };

      const result = processor.processTemplate(template, { name: 'hello' });
      expect(result.content).toBe('olleh');
    });
  });

  describe('registerPartial', () => {
    it('should allow registering partials', () => {
      processor.registerPartial('header', '<h1>{{title}}</h1>');

      const template: TemplateFile = {
        name: 'test.html',
        content: '{{> header}}<p>{{content}}</p>',
        path: '/test.html',
      };

      const result = processor.processTemplate(template, {
        title: 'Welcome',
        content: 'Hello World',
      });

      expect(result.content).toBe('<h1>Welcome</h1><p>Hello World</p>');
    });
  });
});