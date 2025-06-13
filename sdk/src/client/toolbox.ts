import { z } from "zod";
import { generateText, jsonSchema, zodSchema } from "ai";
import { DurableContext, TaskWorkflowDeclaration } from "@hatchet-dev/typescript-sdk";
import { Pickaxe, Registerable } from "./pickaxe";
import jsonSchemaToZod from "json-schema-to-zod";

export interface ToolDeclaration<
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType
> extends TaskWorkflowDeclaration<z.infer<InputSchema>, z.infer<OutputSchema>> {
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  description: string;
}

// Helper to pull the right ToolDeclaration from T by its `name`
type ToolByName<
  T extends readonly ToolDeclaration<any, any>[],
  N extends T[number]['name']
> = Extract<T[number], { name: N }>;

// Map over each name and give it the correct input/output
type TransformersFor<
  T extends readonly ToolDeclaration<any, any>[]
> = {
  [N in T[number]['name']]: (
    output: z.infer<ToolByName<T, N>['outputSchema']>,
    args: z.infer<ToolByName<T, N>['inputSchema']>
  ) => Promise<any>;
};

type ToolResultMap<T extends readonly ToolDeclaration<any,any>[]> = {
  [N in T[number]['name']]: {
    name: N;
    output: z.infer<Extract<T[number], {name: N}>['outputSchema']>;
    args:   z.infer<Extract<T[number], {name: N}>['inputSchema']>;
  }
}[T[number]['name']];

export interface CreateToolboxOpts<T extends ReadonlyArray<ToolDeclaration<any, any>>> {
  tools: T;
}

export type ToolSet = {
  [key: string]: {
    /**
  The schema of the input that the tool expects. The language model will use this to generate the input.
  It is also used to validate the output of the language model.
  Use descriptions to make the input understandable for the language model.
     */
    parameters: any;
    /**
An optional description of what the tool does.
Will be used by the language model to decide whether to use the tool.
Not used for provider-defined tools.
   */
    description?: string;
  };
};

/**
 * Input for the pick workflow.
 */
type PickInput = {
  /**
   * The prompt to use for the pick workflow.
   */
  prompt: string;

  /**
   * The maximum number of tools to allow the pick workflow to take.
   */
  maxTools?: number;
};

export class Toolbox<T extends ReadonlyArray<ToolDeclaration<any, any>>> implements Registerable {
  private toolboxKey: string;
  toolSetForAI: ToolSet;

  constructor(private props: CreateToolboxOpts<T>, private client: Pickaxe) {
    // Generate a key for this toolbox based on tool names
    this.toolboxKey = Array.from(this.props.tools).map(t => t.name).sort().join(':');

    // Create toolset for AI SDK using the actual Zod schemas
    this.toolSetForAI = Array.from(this.props.tools).reduce<ToolSet>(
      (acc, tool) => {
        if (!tool.name || !tool.inputSchema) {
          throw new Error(`Tool must have a name and inputSchema`);
        }

        return {
          ...acc,
          [tool.name]: {
            parameters: zodSchema(tool.inputSchema),
            description: tool.description,
          },
        };
      },
      {}
    );
  }

  get register(): TaskWorkflowDeclaration<any, any>[] {
    return [...this.props.tools, pickToolFactory(this.client)];
  }


  async pick(ctx: DurableContext<any>, {prompt, maxTools}: PickInput) {
    const result = await ctx.runChild(pickToolFactory(this.client), { 
      prompt, 
      toolboxKey: this.toolboxKey,
      maxTools 
    });

    return result.steps.flatMap((step) => step.map((toolCall) => ({
      name: toolCall.toolName,
      input: toolCall.args,
    })));  
  }

  async pickAndRun<
    R extends TransformersFor<T>
  >(
    ctx: DurableContext<any>,
    opts: PickInput,
  ): Promise<ToolResultMap<T>[]> {
    // 1) pick tools
    const picked = await this.pick(ctx, opts);

    // 2) run them
    const results = await ctx.bulkRunChildren(
      picked.map(({ name, input }) => ({ workflow: name, input }))
    );

    // 4) zip back into the correctly typed union
    return picked.map(({ name, input }, i) => ({
      name,
      output: results[i][name][name], // FIXME: this is a hack to get the output of the tool
      args: input,
    })) as ToolResultMap<T>[];
  }

  /**
   * Gets the original tool declarations (used internally by pick-tool)
   */
  getTools(): T {
    return this.props.tools;
  }
}

type PickInputWithToolboxKey = PickInput & {
  toolboxKey: string;
};

const pickToolFactory = (pickaxe: Pickaxe) => pickaxe.task({
  name: "pick-tool",
  executionTimeout: "5m",
  fn: async (input: PickInputWithToolboxKey) => {
    // Get the toolbox from the client using the key
    const toolbox = pickaxe._getToolbox(input.toolboxKey);
    if (!toolbox) {
      throw new Error(`Toolbox not found for key: ${input.toolboxKey}`);
    }

    // Use the toolbox's AI-ready toolset
    const { steps } = await generateText({
      model: pickaxe.defaultLanguageModel,
      tools: toolbox.toolSetForAI,
      maxSteps: input.maxTools ?? 1,
      prompt: input.prompt,
    });

    return { steps: steps.map((step) => step.toolCalls) };
  },
});