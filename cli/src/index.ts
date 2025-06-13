#!/usr/bin/env node

import { Command } from "commander";
import { addAgent } from "./commands/add-agent";
import { addTool } from "./commands/add-tool";
import { create } from "./commands/create";
import { startMcp } from "./commands/mcp";
import { HATCHET_VERSION } from "./version";

const program = new Command();

program
  .name("pickaxe")
  .description("CLI tool for managing components, agents, and tools")
  .version(HATCHET_VERSION);

const addCommand = program.command("add").description("Add various resources");

addCommand
  .command("agent")
  .description("Add a new agent")
  .argument("<name>", "Agent name")
  .option("-m, --model <model>", "AI model to use", "gpt-4")
  .action(addAgent);

addCommand
  .command("tool")
  .description("Add a new tool")
  .argument("<name>", "Tool name")
  .option("-c, --category <category>", "Tool category", "utility")
  .action(addTool);

program
  .command("create")
  .description("Create a new project")
  .argument("[name]", "Project name")
  .action(create);

program
  .command("mcp")
  .description("Start the Model Context Protocol server")
  .action(startMcp);

program
  .command("version")
  .description("Show version information")
  .action(() => {
    console.log(`Hatchet Pickaxe v${HATCHET_VERSION}`);
  });

program.parse();
