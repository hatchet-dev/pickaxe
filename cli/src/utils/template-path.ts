import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Securely resolves template paths within the CLI package only
 * @param templateName - The name of the template (e.g., 'geo', 'agent', 'tool')
 * @param callerDir - The __dirname of the calling module
 * @returns The resolved template path
 * @throws Error if template is not found in any location
 */
export function getTemplatePath(templateName: string, callerDir: string): string {
  // Security: Find the CLI package root instead of using relative paths
  // This prevents accidentally accessing templates from untrusted packages
  const cliPackageRoot = findCliPackageRoot(callerDir);
  
  if (!cliPackageRoot) {
    throw new Error(
      `Could not locate @hatchet-dev/pickaxe-cli package root from ${callerDir}. ` +
      `This is required for secure template resolution.`
    );
  }
  
  // Template path is always relative to the CLI package root
  const templatePath = path.join(cliPackageRoot, 'templates', templateName);
  
  // Verify the template exists
  try {
    require('fs').accessSync(templatePath);
    return templatePath;
  } catch {
    throw new Error(
      `Template '${templateName}' not found at ${templatePath}. ` +
      `Please ensure the CLI was built correctly or the template exists.`
    );
  }
}

/**
 * Finds the CLI package root by looking for package.json with correct name
 * @param startDir - Directory to start searching from
 * @returns The CLI package root directory or null if not found
 */
function findCliPackageRoot(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  const maxAttempts = 10; // Prevent infinite loops
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      
      // Check if package.json exists
      require('fs').accessSync(packageJsonPath);
      
      // Read and verify it's the CLI package
      const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.name === '@hatchet-dev/pickaxe-cli') {
        return currentDir;
      }
    } catch {
      // package.json doesn't exist or isn't readable, continue searching
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    
    currentDir = parentDir;
    attempts++;
  }
  
  return null;
}

/**
 * Async version of getTemplatePath for better error handling
 * @param templateName - The name of the template (e.g., 'geo', 'agent', 'tool')
 * @param callerDir - The __dirname of the calling module
 * @returns Promise that resolves to the template path
 * @throws Error if template is not found in any location
 */
export async function getTemplatePathAsync(templateName: string, callerDir: string): Promise<string> {
  // Security: Find the CLI package root instead of using relative paths
  // This prevents accidentally accessing templates from untrusted packages
  const cliPackageRoot = await findCliPackageRootAsync(callerDir);
  
  if (!cliPackageRoot) {
    throw new Error(
      `Could not locate @hatchet-dev/pickaxe-cli package root from ${callerDir}. ` +
      `This is required for secure template resolution.`
    );
  }
  
  // Template path is always relative to the CLI package root
  const templatePath = path.join(cliPackageRoot, 'templates', templateName);
  
  // Verify the template exists
  try {
    await fs.access(templatePath);
    return templatePath;
  } catch {
    throw new Error(
      `Template '${templateName}' not found at ${templatePath}. ` +
      `Please ensure the CLI was built correctly or the template exists.`
    );
  }
}

/**
 * Async version of findCliPackageRoot
 * @param startDir - Directory to start searching from
 * @returns Promise that resolves to the CLI package root directory or null if not found
 */
async function findCliPackageRootAsync(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir);
  const maxAttempts = 10; // Prevent infinite loops
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      
      // Check if package.json exists
      await fs.access(packageJsonPath);
      
      // Read and verify it's the CLI package
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      
      if (packageJson.name === '@hatchet-dev/pickaxe-cli') {
        return currentDir;
      }
    } catch {
      // package.json doesn't exist or isn't readable, continue searching
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    
    currentDir = parentDir;
    attempts++;
  }
  
  return null;
}