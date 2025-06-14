import prompts from "prompts";
import * as path from "path";
import { promises as fs } from "fs";
import { processTemplate } from "../utils";

interface ProjectConfig {
  name: string;
  description: string;
  author: string;
  template: string;
}

export async function create(projectName?: string) {
  try {
    console.log("🚀 Creating new project...");

    const config = await getProjectConfig(projectName);

    const outputDir = path.join(process.cwd(), config.name);

    // Check if directory already exists
    try {
      await fs.access(outputDir);
      const overwrite = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `Directory '${config.name}' already exists. Overwrite?`,
        initial: false,
      });

      if (!overwrite.overwrite) {
        console.log("❌ Project creation cancelled");
        return;
      }
    } catch {
      // Directory doesn't exist, continue
    }

    // Process templates
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      config.template
    );

    await processTemplate({ type: "local", path: templatePath }, config, {
      outputDir,
      force: true,
    });

    console.log(`\n✅ Project '${config.name}' created successfully!`);
    console.log(`📁 Project created in: ${outputDir}`);
    console.log("\n📝 Next steps:");
    console.log(`1. cd ${config.name}`);
    console.log("2. npm install");
    console.log("3. Configure your environment variables");
    console.log("4. npm run dev");
  } catch (error) {
    console.error(
      "❌ Failed to create project:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}

async function getProjectConfig(initialName?: string): Promise<ProjectConfig> {
  const questions = [
    {
      type: "text" as const,
      name: "name",
      message: "Project name:",
      initial: initialName || "my-project",
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return "Project name is required";
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return "Project name must contain only lowercase letters, numbers, and hyphens";
        }
        return true;
      },
    },
    {
      type: "text" as const,
      name: "description",
      message: "Project description:",
      initial: (prev: string) => `A example Pickaxe project named ${prev}`,
    },
    {
      type: "text" as const,
      name: "author",
      message: "Author:",
      initial: "",
    },
    {
      type: "select" as const,
      name: "template",
      message: "Project template:",
      choices: [
        {
          title: "Geo Agent",
          value: "geo",
          description: "Geo agent has tools for weather, time, and holidays",
        },
      ],
      initial: 0,
    },
  ];

  const answers = await prompts(questions);

  // Handle user cancellation
  if (Object.keys(answers).length === 0 || !answers.name) {
    console.log("\n❌ Project creation cancelled");
    process.exit(0);
  }

  return {
    name: answers.name,
    description: answers.description,
    author: answers.author,
    template: answers.template,
  };
}
