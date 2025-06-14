import prompts from 'prompts';
import * as path from 'path';
import { promises as fs } from 'fs';
import { processTemplate } from '../utils';

interface AgentConfig {
  name: string;
  description: string;
}

// Core logic for adding an agent
export async function createAgent(name: string, options: { model?: string; description?: string; silent?: boolean }) {
  try {
    if (!options.silent) {
      console.log(`🤖 Creating agent: ${name}`);
    }
    
    // Verify agents directory exists
    const agentsDir = path.join(process.cwd(), 'src', 'agents');
    await ensureAgentsDirectory(agentsDir, options.silent);
    
    // Get agent configuration - use provided description or prompt interactively
    const config = options.description 
      ? { name, description: options.description }
      : await getAgentConfig(name);
    
    // Process templates - use absolute path from CLI tool location
    const outputDir = path.join(agentsDir, config.name);
    const templatesDir = path.join(__dirname, '..', '..', 'templates', 'agent');
    
    await processTemplate(
      { type: 'local', path: templatesDir },
      config,
      { outputDir, force: false }
    );

    if (!options.silent) {
      console.log(`\n✅ Agent '${config.name}' created successfully!`);
      console.log(`📁 Files created in: ${outputDir}`);
      console.log('\n📝 Next steps:');
      console.log('1. Import your tools and add them to the toolbox');
      console.log('2. Implement tool result handling in the switch statement');
      console.log('3. Update the agent implementation as needed');
    }

    return {
      success: true,
      message: `Agent '${config.name}' created successfully`,
      outputDir,
      config
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (!options.silent) {
      console.error('❌ Failed to create agent:', errorMessage);
      process.exit(1);
    }
    throw new Error(`Failed to create agent: ${errorMessage}`);
  }
}

// CLI wrapper function that doesn't return a value
export async function addAgent(name: string, options: { model?: string }) {
  await createAgent(name, options);
}

async function ensureAgentsDirectory(agentsDir: string, silent?: boolean): Promise<void> {
  try {
    await fs.access(agentsDir);
  } catch {
    if (!silent) {
      console.log(`📁 Creating agents directory: ${agentsDir}`);
    }
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