import { promises as fs } from 'fs';
import * as path from 'path';

export async function listAgents(): Promise<string[]> {
  const agentsDir = path.join(process.cwd(), 'src', 'agents');
  
  try {
    await fs.access(agentsDir);
  } catch {
    return [];
  }

  const entries = await fs.readdir(agentsDir, { withFileTypes: true });
  return entries
    .filter((entry: any) => entry.isDirectory())
    .map((entry: any) => entry.name);
}

export async function getAgentInfo(name: string): Promise<{ name: string; description: string; location: string } | null> {
  const agentDir = path.join(process.cwd(), 'src', 'agents', name);
  const agentFile = path.join(agentDir, `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.agent.ts`);
  
  try {
    await fs.access(agentFile);
  } catch {
    return null;
  }

  const agentContent = await fs.readFile(agentFile, 'utf-8');
  
  // Extract description from the file content
  const descriptionMatch = agentContent.match(/description: '([^']+)'/);
  const description = descriptionMatch ? descriptionMatch[1] : 'No description available';

  return {
    name,
    description,
    location: agentFile
  };
}