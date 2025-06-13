#!/usr/bin/env node

import { Command } from 'commander';
import { addComponent } from './commands/add-component';
import { addAgent } from './commands/add-agent';
import { addTool } from './commands/add-tool';
import { create } from './commands/create';

const program = new Command();

program
  .name('pickaxe')
  .description('CLI tool for managing components, agents, and tools')
  .version('1.0.0');

const addCommand = program
  .command('add')
  .description('Add various resources');

addCommand
  .command('component')
  .description('Add a new component')
  .argument('<name>', 'Component name')
  .option('-t, --type <type>', 'Component type', 'default')
  .action(addComponent);

addCommand
  .command('agent')
  .description('Add a new agent')
  .argument('<name>', 'Agent name')
  .option('-m, --model <model>', 'AI model to use', 'gpt-4')
  .action(addAgent);

addCommand
  .command('tool')
  .description('Add a new tool')
  .argument('<name>', 'Tool name')
  .option('-c, --category <category>', 'Tool category', 'utility')
  .action(addTool);

program
  .command('create')
  .description('Create a new project')
  .argument('[name]', 'Project name')
  .action(create);

program.parse();