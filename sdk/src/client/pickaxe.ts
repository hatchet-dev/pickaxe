import Hatchet, { CreateDurableTaskWorkflow, CreateDurableTaskWorkflowOpts, CreateTaskWorkflow, CreateTaskWorkflowOpts, CreateWorkerOpts, InputType, OutputType, TaskWorkflowDeclaration, UnknownInputType, V0DurableContext } from "@hatchet-dev/typescript-sdk";
import { HatchetClientOptions, ClientConfig as HatchetClientConfig } from "@hatchet-dev/typescript-sdk/clients/hatchet-client";
import { LanguageModelV1 } from "ai";
import { AxiosRequestConfig } from "axios";
import { z } from "zod";

export interface ToolDeclaration<
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

  async start(options?: CreateWorkerOpts) {
    const worker = await this.worker('pickaxe-worker', options);
    return worker.start();
  }

  
  /**
   * Creates a new agent.
   * Types can be explicitly specified as generics or inferred from the function signature.
   * @template I The input type for the durable task
   * @template O The output type of the durable task
   * @param options Durable task configuration options
   * @returns A TaskWorkflowDeclaration instance for a durable task
   */
  agent<I extends InputType, O extends OutputType>(
    options: CreateDurableTaskWorkflowOpts<I, O>
  ): TaskWorkflowDeclaration<I, O>;

  /**
   * Creates a new durable task workflow with types inferred from the function parameter.
   * @template Fn The type of the durable task function with input and output extending JsonObject
   * @param options Durable task configuration options with function that defines types
   * @returns A TaskWorkflowDeclaration instance with inferred types
   */
  agent<
    Fn extends (input: I, ctx: V0DurableContext<I>) => O | Promise<O>,
    I extends InputType = Parameters<Fn>[0],
    O extends OutputType = ReturnType<Fn> extends Promise<infer P>
      ? P extends OutputType
        ? P
        : void
      : ReturnType<Fn> extends OutputType
        ? ReturnType<Fn>
        : void,
  >(
    options: {
      fn: Fn;
    } & Omit<CreateDurableTaskWorkflowOpts<I, O>, 'fn'>
  ): TaskWorkflowDeclaration<I, O>;

  /**
   * Implementation of the agent method.
   */
  agent(options: any): TaskWorkflowDeclaration<any, any> {
    return CreateDurableTaskWorkflow(options, this);
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
}

