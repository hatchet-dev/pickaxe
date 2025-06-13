import prompts from 'prompts';
import * as path from 'path';
import { promises as fs } from 'fs';
import { processTemplate } from '../utils';

interface AgentConfig {
  name: string;
  description: string;
}

export async function addAgent(name: string, options: { model?: string }) {
  try {
    console.log(`🤖 Creating agent: ${name}`);
    
    // Verify agents directory exists
    const agentsDir = path.join(process.cwd(), 'agents');
    await ensureAgentsDirectory(agentsDir);
    
    // Get agent configuration through interactive prompts
    const config = await getAgentConfig(name);
    
    // Process templates - use absolute path from CLI tool location
    const outputDir = path.join(agentsDir, config.name);
    const templatesDir = path.join(__dirname, '..', '..', 'templates', 'agent');
    
    await processTemplate(
      { type: 'local', path: templatesDir },
      config,
      { outputDir, force: false }
    );

    console.log(`\n✅ Agent '${config.name}' created successfully!`);
    console.log(`📁 Files created in: ${outputDir}`);
    console.log('\n📝 Next steps:');
    console.log('1. Implement the agent logic in the execute method');
    console.log('2. Run the tests to verify functionality');
    console.log('3. Update the agent implementation as needed');
    
  } catch (error) {
    console.error('❌ Failed to create agent:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function ensureAgentsDirectory(agentsDir: string): Promise<void> {
  try {
    await fs.access(agentsDir);
  } catch {
    console.log(`📁 Creating agents directory: ${agentsDir}`);
    await fs.mkdir(agentsDir, { recursive: true });
  }
}

async function getAgentConfig(name: string): Promise<AgentConfig> {
  const answers = await prompts({
    type: 'text',
    name: 'description',
    message: 'Agent description:',
    initial: `AI agent for ${name} tasks`
  });
  
  // Handle user cancellation
  if (!answers.description) {
    console.log('\n❌ Agent creation cancelled');
    process.exit(0);
  }

  return {
    name,
    description: answers.description
  };
}