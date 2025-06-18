import * as path from 'path';
import { promises as fs } from 'fs';

export async function updateBarrelFile(outputDir: string, name: string, type: 'agent' | 'tool', silent?: boolean): Promise<void> {
  const barrelPath = path.join(outputDir, 'index.ts');
  
  try {
    // Check if barrel file exists
    await fs.access(barrelPath);
    
    // Read current content
    const currentContent = await fs.readFile(barrelPath, 'utf8');
    
    // Generate export statement
    const exportStatement = type === 'agent' 
      ? `export * from './${name}.agent';`
      : `export * from './${name}.tool';`;
    
    // Check if export already exists
    if (currentContent.includes(exportStatement)) {
      return; // Already exported
    }
    
    // Add export to barrel file
    const newContent = currentContent.trim() + '\n' + exportStatement + '\n';
    await fs.writeFile(barrelPath, newContent);
    
    if (!silent) {
      console.log(`📦 Updated barrel file: ${barrelPath}`);
    }
    
  } catch (error) {
    // Barrel file doesn't exist, which is fine
    return;
  }
}