import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Resolves template paths for both development and bundled environments
 * @param templateName - The name of the template (e.g., 'geo', 'agent', 'tool')
 * @param callerDir - The __dirname of the calling module
 * @returns The resolved template path
 * @throws Error if template is not found in any location
 */
export function getTemplatePath(templateName: string, callerDir: string): string {
  // In development: callerDir is dist/commands, templates are at ../../templates
  // In bundled: callerDir is dist, templates are at ./templates
  
  // Try bundled path first (dist/templates)
  const bundledPath = path.join(callerDir, 'templates', templateName);
  
  // Try development path (../../templates from dist/commands)
  const devPath = path.join(callerDir, '..', '..', 'templates', templateName);
  
  // Check if templates exist in bundled location
  try {
    require('fs').accessSync(bundledPath);
    return bundledPath;
  } catch {
    // Check development path
    try {
      require('fs').accessSync(devPath);
      return devPath;
    } catch {
      // Neither path exists, throw helpful error
      throw new Error(
        `Template '${templateName}' not found. Searched in:\n` +
        `  - ${bundledPath}\n` +
        `  - ${devPath}\n` +
        `Please ensure the CLI was built correctly or the template exists.`
      );
    }
  }
}

/**
 * Async version of getTemplatePath for better error handling
 * @param templateName - The name of the template (e.g., 'geo', 'agent', 'tool')
 * @param callerDir - The __dirname of the calling module
 * @returns Promise that resolves to the template path
 * @throws Error if template is not found in any location
 */
export async function getTemplatePathAsync(templateName: string, callerDir: string): Promise<string> {
  // In development: callerDir is dist/commands, templates are at ../../templates
  // In bundled: callerDir is dist, templates are at ./templates
  
  // Try bundled path first (dist/templates)
  const bundledPath = path.join(callerDir, 'templates', templateName);
  
  // Try development path (../../templates from dist/commands)
  const devPath = path.join(callerDir, '..', '..', 'templates', templateName);
  
  // Check if templates exist in bundled location
  try {
    await fs.access(bundledPath);
    return bundledPath;
  } catch {
    // Check development path
    try {
      await fs.access(devPath);
      return devPath;
    } catch {
      // Neither path exists, throw helpful error
      throw new Error(
        `Template '${templateName}' not found. Searched in:\n` +
        `  - ${bundledPath}\n` +
        `  - ${devPath}\n` +
        `Please ensure the CLI was built correctly or the template exists.`
      );
    }
  }
}