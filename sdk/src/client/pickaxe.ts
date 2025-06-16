import Hatchet, { BaseWorkflowDeclaration, CreateDurableTaskWorkflow, CreateDurableTaskWorkflowOpts, CreateTaskWorkflow, CreateTaskWorkflowOpts, CreateWorkerOpts, DurableContext, InputType, OutputType, TaskWorkflowDeclaration, UnknownInputType, V0DurableContext } from "@hatchet-dev/typescript-sdk";
import { HatchetClientOptions, ClientConfig as HatchetClientConfig } from "@hatchet-dev/typescript-sdk/clients/hatchet-client";
import { LanguageModelV1 } from "ai";
import { AxiosRequestConfig } from "axios";
import { z } from "zod";
import { CreateToolboxOpts, Toolbox, ToolDeclaration } from "./toolbox";


export interface AgentDeclaration<
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType
> extends TaskWorkflowDeclaration<z.infer<InputSchema>, z.infer<OutputSchema>> {
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  description: string;
}

export interface ClientConfig extends HatchetClientConfig {
  defaultLanguageModel: LanguageModelV1;
}

export abstract class Registerable {
  abstract get register(): BaseWorkflowDeclaration<any, any>[];
}


type BaseOrRegisterable = BaseWorkflowDeclaration<any, any> | Registerable;

interface StartOptions extends CreateWorkerOpts {
  register?: Array<BaseOrRegisterable> | Array<Array<BaseOrRegisterable>>;
}

export class Pickaxe extends Hatchet {
  defaultLanguageModel: LanguageModelV1;
  private toolboxes: Map<string, Toolbox<any>> = new Map();
  private workflowToFilePath: Map<string, string> = new Map();
  
  static init(config?: Partial<ClientConfig>, options?: HatchetClientOptions, axiosConfig?: AxiosRequestConfig) {
    return new Pickaxe(config, options, axiosConfig);
  }

  constructor(config?: Partial<ClientConfig>, options?: HatchetClientOptions, axiosConfig?: AxiosRequestConfig) {
    if (!config?.defaultLanguageModel) {
      throw new Error("defaultLanguageModel is required");  
    }
    super(config, options, axiosConfig);
    this.defaultLanguageModel = config.defaultLanguageModel;
  }

  /**
   * Discover all the agents and tools relative to the current file
   * and return them as a list of BaseOrRegisterable
   * 
   * @returns a list of BaseOrRegisterable
   */
  private discover(): BaseOrRegisterable[] | BaseOrRegisterable[][] {
    this.admin.logger.green("Discovering agents and tools relative to the current file");
    const fs = require("fs");
    const path = require("path");

    // Helper: recursively walk a directory and collect files that match the given predicate
    function walk(dir: string, predicate: (file: string) => boolean, collected: string[]) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip common build/output folders
        if (entry.name === "node_modules") continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, predicate, collected);
        } else if (entry.isFile() && predicate(fullPath)) {
          collected.push(fullPath);
        }
      }
    }

    // Match files that look like agents or tools (either TS or JS, commonjs build)
    const AGENT_TOOL_TOOLBOX_REGEX = /\.(agent|tool|toolbox)\.[cm]?[tj]s$/;

    // Search roots – prefer dist if it exists (when running compiled code), otherwise src
    const cwd = process.cwd();
    const searchRoots = [path.join(cwd, "dist"), path.join(cwd, "src")].filter((p) => fs.existsSync(p));

    const matchedFiles: string[] = [];
    for (const root of searchRoots) {
      walk(root, (file) => AGENT_TOOL_TOOLBOX_REGEX.test(file), matchedFiles);
    }

    const discoveredArr: Array<BaseOrRegisterable | BaseOrRegisterable[]> = [];

    for (const filePath of matchedFiles) {
      try {
        // Resolve to absolute path and require synchronously
        const requiredModule = require(filePath);

        const exportsArray = Object.values(requiredModule);

        // If the module has a default export, include it as well (avoid duplicates)
        if (requiredModule.default) {
          exportsArray.push(requiredModule.default);
        }

        // Deduplicate within this file by tracking names
        const seenNames = new Set<string>();
        const fileDiscovered: Array<BaseOrRegisterable | BaseOrRegisterable[]> = [];
        const relativePath = path.relative(cwd, filePath);

        for (const exp of exportsArray) {
          if (!exp) continue;

          // For arrays, check each item and dedupe
          if (Array.isArray(exp)) {
            const deduped = exp.filter((item: any) => {
              if (!item || !item.name) return true; // Keep items without names
              if (seenNames.has(item.name)) return false;
              seenNames.add(item.name);
              // Track file path for this workflow
              if (item.name) {
                this.workflowToFilePath.set(item.name, relativePath);
              }
              return true;
            });
            if (deduped.length > 0) {
              fileDiscovered.push(deduped as BaseOrRegisterable[]);
            }
          } else {
            // For single items, check if it's a workflow, toolbox, or other registerable
            const name = (exp as any).name || ((exp as any).register ? 'toolbox' : 'unknown');
            if (!seenNames.has(name)) {
              seenNames.add(name);
              fileDiscovered.push(exp as BaseOrRegisterable);
              // Track file path for this workflow
              if ((exp as any).name) {
                this.workflowToFilePath.set((exp as any).name, relativePath);
              }
            }
          }
        }

        // Add all discovered items from this file
        discoveredArr.push(...fileDiscovered);

        // Logging for visibility
        const names = fileDiscovered
          .flatMap((e: any) => (Array.isArray(e) ? e : [e]))
          .map((e: any) => (e && e.name ? e.name : "<unknown>"))
          .join(", ");
      } catch (err) {
        this.admin.logger.error(`Failed to import ${filePath}: ${(err as Error).message}`);
      }
    }

    return discoveredArr as unknown as BaseOrRegisterable[] | BaseOrRegisterable[][];
  }
  
  async start(options: StartOptions = {}) {
    let { register, ...rest } = options;

    if (!register) {
      register = this.discover();
    }

    const workflows = register.flat().flatMap((registerable) => {
      if ('register' in registerable) {
        return registerable.register;
      }
      return registerable;
    });

    if (workflows.length === 0) {
      this.admin.logger.error("Nothing to register, create agent and tools relative to the current file or import and `register` them directly");
      return;
    }

    // deduplicate workflows by name
    const dedupedWorkflows = workflows.filter((workflow, index, self) =>
      index === self.findIndex((t) => t.name === workflow.name)
    );

    if (workflows.length > 0) {
      this.admin.logger.green(`Registering:`);
    }

    for (const workflow of dedupedWorkflows) {
      const filePath = this.workflowToFilePath.get(workflow.name);
      const displayName = filePath ? `${workflow.name} (${filePath})` : workflow.name;
      this.admin.logger.green(`> ${displayName}`);
    }

    const worker = await this.worker('pickaxe-worker', {
      ...rest,
      workflows: dedupedWorkflows,
    });

    return worker.start();
  }

  
  /**
   * Creates a new agent with Zod schema validation.
   * @template InputSchema The Zod schema for input validation
   * @template OutputSchema The Zod schema for output validation
   * @param options Agent configuration options including input and output schemas
   * @returns An AgentDeclaration instance
   */
  agent<
    InputSchema extends z.ZodType,
    OutputSchema extends z.ZodType
  >(
    options: {
      name: string;
      description: string;
      inputSchema: InputSchema;
      outputSchema: OutputSchema;
      fn: (input: z.infer<InputSchema>, ctx: DurableContext<z.infer<InputSchema>>) => Promise<z.infer<OutputSchema>>;
    } & Omit<CreateDurableTaskWorkflowOpts<z.infer<InputSchema>, z.infer<OutputSchema>>, 'fn'>
  ): AgentDeclaration<InputSchema, OutputSchema>;

  /**
   * Implementation of the agent method.
   */
  agent(options: any): AgentDeclaration<any, any> {
    const { inputSchema, outputSchema, fn, description, ...rest } = options;

    const wrappedFn = async (input: any, ctx?: any) => {
      const validatedInput = inputSchema.parse(input);
      const result = await fn(validatedInput, ctx);
      return outputSchema.parse(result);
    };

    const declaration = CreateDurableTaskWorkflow({ ...rest, fn: wrappedFn }, this) as AgentDeclaration<any, any>;
    declaration.inputSchema = inputSchema;
    declaration.outputSchema = outputSchema;
    declaration.description = description;
    return declaration as AgentDeclaration<any, any>;
  }


  /**
   * Creates a new tool with Zod schema validation.
   * @template Name The literal type of the tool name
   * @template InputSchema The Zod schema for input validation
   * @template OutputSchema The Zod schema for output validation
   * @param options Tool configuration options including input and output schemas
   * @returns A ToolDeclaration instance
   */
  tool<
    Name extends string,
    InputSchema extends z.ZodType,
    OutputSchema extends z.ZodType
  >(
    options: {
      name: Name;
      description: string;
      inputSchema: InputSchema;
      outputSchema: OutputSchema;
      fn: (input: z.infer<InputSchema>, ctx?: any) => Promise<z.infer<OutputSchema>>;
    } & Omit<CreateTaskWorkflowOpts<z.infer<InputSchema>, z.infer<OutputSchema>>, 'fn'>
  ): ToolDeclaration<InputSchema, OutputSchema> & { name: Name };

  /**
   * Implementation of the tool method.
   */
  tool(options: any): ToolDeclaration<any, any> & { name: string } {
    const { inputSchema, outputSchema, fn, description, ...rest } = options;
    
    // Wrap the function to validate input and output
    const wrappedFn = async (input: any, ctx?: any) => {
      const validatedInput = inputSchema.parse(input);
      const result = await fn(validatedInput, ctx);
      return outputSchema.parse(result);
    };

    const declaration = CreateTaskWorkflow({ ...rest, fn: wrappedFn }, this) as ToolDeclaration<any, any>;
    
    // Add schema information to the declaration
    declaration.inputSchema = inputSchema;
    declaration.outputSchema = outputSchema;
    declaration.description = description;

    // Preserve the literal type of the `name` field through a cast so callers
    // can discriminate on `name` later.
    return declaration as typeof declaration & { name: typeof options.name };
  }


  /**
   * Creates a new toolbox.
   * @param options The toolbox configuration options
   * @returns A Toolbox instance
   */
  toolbox<T extends ReadonlyArray<ToolDeclaration<any, any>>>(options: CreateToolboxOpts<T>): Toolbox<T> {
    const toolbox = new Toolbox(options, this);
    // Store the toolbox with a generated key based on tool names
    const toolboxKey = Array.from(options.tools).map(t => t.name).sort().join(':');
    this.toolboxes.set(toolboxKey, toolbox);
    return toolbox;
  }

  /**
   * Gets a toolbox by its key (used internally)
   */
  _getToolbox(key: string): Toolbox<any> | undefined {
    return this.toolboxes.get(key);
  }
}

