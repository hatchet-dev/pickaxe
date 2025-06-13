import Hatchet, { BaseWorkflowDeclaration, CreateDurableTaskWorkflow, CreateDurableTaskWorkflowOpts, CreateTaskWorkflow, CreateTaskWorkflowOpts, CreateWorkerOpts, DurableContext, InputType, OutputType, TaskWorkflowDeclaration, UnknownInputType, V0DurableContext } from "@hatchet-dev/typescript-sdk";
import { HatchetClientOptions, ClientConfig as HatchetClientConfig } from "@hatchet-dev/typescript-sdk/clients/hatchet-client";
import { LanguageModelV1 } from "ai";
import { AxiosRequestConfig } from "axios";
import { z } from "zod";
import { CreateToolboxProps, Toolbox, ToolDeclaration } from "./toolbox";


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
  register: Array<BaseOrRegisterable> | Array<Array<BaseOrRegisterable>>;
}

export class Pickaxe extends Hatchet {
  defaultLanguageModel: LanguageModelV1;
  
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

  async start(options: StartOptions) {
    const { register = [], ...rest } = options;

    const workflows = register.flat().flatMap((registerable) => {
      if ('register' in registerable) {
        return registerable.register;
      }
      return registerable;
    });

    const worker = await this.worker('pickaxe-worker', {
      ...rest,
      workflows,
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
   * @template InputSchema The Zod schema for input validation
   * @template OutputSchema The Zod schema for output validation
   * @param options Tool configuration options including input and output schemas
   * @returns A ToolDeclaration instance
   */
  tool<
    InputSchema extends z.ZodType,
    OutputSchema extends z.ZodType
  >(
    options: {
      name: string;
      description: string;
      inputSchema: InputSchema;
      outputSchema: OutputSchema;
      fn: (input: z.infer<InputSchema>, ctx?: any) => Promise<z.infer<OutputSchema>>;
    } & Omit<CreateTaskWorkflowOpts<z.infer<InputSchema>, z.infer<OutputSchema>>, 'fn'>
  ): ToolDeclaration<InputSchema, OutputSchema>;

  /**
   * Implementation of the tool method.
   */
  tool(options: any): ToolDeclaration<any, any> {
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

    return declaration;
  }


  toolbox(props: CreateToolboxProps) {
    return new Toolbox(props, this);
  }
}

