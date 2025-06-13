
import Hatchet, { CreateDurableTaskWorkflow, CreateDurableTaskWorkflowOpts, CreateTaskWorkflow, CreateTaskWorkflowOpts, CreateWorkerOpts, InputType, OutputType, TaskWorkflowDeclaration, UnknownInputType, V0DurableContext } from "@hatchet-dev/typescript-sdk";
import { HatchetClientOptions, ClientConfig } from "@hatchet-dev/typescript-sdk/clients/hatchet-client";
import { AxiosRequestConfig } from "axios";

export class Pickaxe extends Hatchet {
  static init(config?: Partial<ClientConfig>, options?: HatchetClientOptions, axiosConfig?: AxiosRequestConfig) {
    return new Pickaxe(config, options, axiosConfig);
  }

  constructor(config?: Partial<ClientConfig>, options?: HatchetClientOptions, axiosConfig?: AxiosRequestConfig) {
    super(config, options, axiosConfig);
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
   * Creates a new tool.
   * Types can be explicitly specified as generics or inferred from the function signature.
   * @template I The input type for the tool
   * @template O The output type of the tool
   * @param options Task configuration options
   * @returns A TaskWorkflowDeclaration instance
   */
  tool<I extends InputType = UnknownInputType, O extends OutputType = void>(
    options: CreateTaskWorkflowOpts<I, O>
  ): TaskWorkflowDeclaration<I, O>;

  /**
   * Creates a new tool workflow with types inferred from the function parameter.
   * @template Fn The type of the task function with input and output extending JsonObject
   * @param options Task configuration options with function that defines types
   * @returns A TaskWorkflowDeclaration instance with inferred types
   */
  tool<
    Fn extends (input: I, ctx?: any) => O | Promise<O>,
    I extends InputType = Parameters<Fn>[0] | UnknownInputType,
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
    } & Omit<CreateTaskWorkflowOpts<I, O>, 'fn'>
  ): TaskWorkflowDeclaration<I, O>;

  /**
   * Implementation of the tool method.
   */
  tool(options: any): TaskWorkflowDeclaration<any, any> {
    return CreateTaskWorkflow(options, this);
  }
}

