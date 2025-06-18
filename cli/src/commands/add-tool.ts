import prompts from "prompts";
import * as path from "path";
import { promises as fs } from "fs";
import { processTemplate, getTemplatePath, updateBarrelFile } from "../utils";

interface ToolConfig {
  name: string;
  description: string;
}

// Core logic for adding a tool
export async function createTool(
  name: string,
  options: { description?: string; silent?: boolean }
) {
  try {
    if (!options.silent) {
      console.log(`🛠️ Creating tool: ${name}`);
    }

    // Verify tools directory exists
    const toolsDir = path.join(process.cwd(), "src", "tools");
    await ensureToolsDirectory(toolsDir, options.silent);

    // Get tool configuration - use provided description or prompt interactively
    const config = options.description
      ? {
          name,
          description: options.description,
        }
      : await getToolConfig(name);

    // Process templates - resolve template path for both dev and bundled environments
    const outputDir = toolsDir;
    const templatesDir = getTemplatePath("tool", __dirname);

    await processTemplate({ type: "local", path: templatesDir }, config, {
      outputDir,
      force: false,
    });

    // Update barrel file if it exists
    const toolFileName = name
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    await updateBarrelFile(outputDir, toolFileName, "tool", options.silent);

    if (!options.silent) {
      console.log(`\n✅ Tool '${config.name}' created successfully!`);
      console.log(
        `📁 File created: ${path.join(outputDir, `${toolFileName}.tool.ts`)}`
      );
      console.log("\n📝 Next steps:");
      console.log("1. Define your input and output schemas in the tool file");
      console.log("2. Implement the tool logic in the fn function");
      console.log("3. Import and add the tool to your agent's toolbox");
    }

    return {
      success: true,
      message: `Tool '${config.name}' created successfully`,
      outputDir,
      config,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (!options.silent) {
      console.error("❌ Failed to create tool:", errorMessage);
      process.exit(1);
    }
    throw new Error(`Failed to create tool: ${errorMessage}`);
  }
}

// CLI wrapper function that doesn't return a value
export async function addTool(name: string) {
  await createTool(name, {});
}

async function ensureToolsDirectory(
  toolsDir: string,
  silent?: boolean
): Promise<void> {
  try {
    await fs.access(toolsDir);
  } catch {
    if (!silent) {
      console.log(`📁 Creating tools directory: ${toolsDir}`);
    }
    await fs.mkdir(toolsDir, { recursive: true });
  }
}

async function getToolConfig(name: string): Promise<ToolConfig> {
  const questions = [
    {
      type: "text" as const,
      name: "description",
      message: "Tool description:",
      initial: `A utility tool for ${name} functionality`,
    },
  ];

  const answers = await prompts(questions);

  // Handle user cancellation
  if (Object.keys(answers).length === 0 || !answers.description) {
    console.log("\n❌ Tool creation cancelled");
    process.exit(0);
  }

  return {
    name,
    description: answers.description,
  };
}
