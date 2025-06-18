#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { addAgent } from "./commands/add-agent";
import { addTool } from "./commands/add-tool";
import { create } from "./commands/create";
import { startMcp } from "./commands/mcp";
import { HATCHET_VERSION } from "./version";

const program = new Command();

program
  .name("pickaxe")
  .description("CLI tool for managing components, agents, and tools")
  .version(HATCHET_VERSION)
  .option("-C, --cwd <path>", "Change working directory before running command");

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

// Handle working directory change
program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.cwd) {
    const targetDir = path.resolve(options.cwd);
    
    // Verify the directory exists
    if (!fs.existsSync(targetDir)) {
      console.error(`Error: Directory '${targetDir}' does not exist`);
      process.exit(1);
    }
    
    // Verify it's actually a directory
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      console.error(`Error: '${targetDir}' is not a directory`);
      process.exit(1);
    }
    
    // Security check: warn about potentially sensitive directories
    const resolvedPath = fs.realpathSync(targetDir); // Resolve symlinks
    const sensitivePatterns = [
      /^\/$/,                    // Root directory
      /^\/usr/,                  // System directories
      /^\/etc/,                  // Configuration directories
      /^\/var/,                  // System variable directories
      /^\/bin/,                  // Binary directories
      /^\/sbin/,                 // System binary directories
      /^\/lib/,                  // Library directories
      /^\/opt/,                  // Optional software directories
      /^\/proc/,                 // Process information
      /^\/sys/,                  // System information
      /^\/dev/,                  // Device files
      /^\/tmp/,                  // Temporary files (could be risky)
    ];
    
    // Check for sensitive directories on Unix-like systems
    if (process.platform !== 'win32') {
      const homeDir = os.homedir();
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(resolvedPath));
      const isHomeDirectory = resolvedPath === homeDir;
      
      if (isSensitive) {
        console.warn(`⚠️  Warning: You are about to run pickaxe in a system directory: ${resolvedPath}`);
        console.warn(`   This could create project files in a system location.`);
        console.warn(`   Consider using a dedicated workspace directory instead.`);
      } else if (isHomeDirectory) {
        console.warn(`⚠️  Warning: You are about to run pickaxe in your home directory: ${resolvedPath}`);
        console.warn(`   This will create project files directly in your home directory.`);
        console.warn(`   Consider using a dedicated workspace directory like ~/workspace or ~/projects.`);
      }
    }
    
    // Change the working directory
    process.chdir(targetDir);
  }
});

program.parse();
