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
  name?: string;
  register?: Array<BaseOrRegisterable> | Array<Array<BaseOrRegisterable>>;
}

export class Pickaxe extends Hatchet {
  defaultLanguageModel: LanguageModelV1;
  private toolboxes: Map<string, Toolbox<any>> = new Map();
  private workflowToFilePath: Map<string, string> = new Map();
  
  private registry: Map<string, BaseOrRegisterable> = new Map();

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

  
  async start(options: StartOptions = {}) {
    let { register, ...rest } = options;

    if (!register) {
      this.admin.logger.green("No register provided, using auto-discovery");
      register = Array.from(this.registry.values());
    }

    const workflows = register.flat().flatMap((registerable) => {
      if ('register' in registerable) {
        return registerable.register;
      }
      return registerable;
    });

    if (workflows.length === 0) {
      this.admin.logger.error("Nothing to register, create an agent or tool using the pickaxe.agent or pickaxe.tool methods");
      return;
    }

    // deduplicate workflows by name
    const dedupedWorkflows = workflows.filter((workflow, index, self) =>
      index === self.findIndex((t) => t.name && t.name === workflow.name)
    );

    if (workflows.length > 0) {
      this.admin.logger.green(`Registering:`);
    }

    for (const workflow of dedupedWorkflows) {
      const filePath = this.workflowToFilePath.get(workflow.name);
      const displayName = filePath ? `${workflow.name} (${filePath})` : workflow.name;
      this.admin.logger.green(`> ${displayName}`);
    }

    const worker = await this.worker(options.name || 'pickaxe-worker', {
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
    const agent = declaration as AgentDeclaration<any, any>;
    this.registry.set(agent.name, agent);
    return agent;
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
    const tool = declaration as typeof declaration & { name: typeof options.name };
    this.registry.set(tool.name, tool);
    return tool;
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
    this.registry.set(toolboxKey, toolbox);
    return toolbox;
  }

  /**
   * Gets a toolbox by its key (used internally)
   */
  _getToolbox(key: string): Toolbox<any> | undefined {
    return this.toolboxes.get(key);
  }
}

