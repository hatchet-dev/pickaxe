import { z } from "zod";
import { generateText, jsonSchema, zodSchema } from "ai";
// import { zodSchema } from "ai";
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

export interface CreateToolboxOpts {
  tools: ReadonlyArray<ToolDeclaration<any, any>> | ToolDeclaration<any, any>[];
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

export class Toolbox implements Registerable {
  private toolboxKey: string;
  toolSetForAI: ToolSet;

  constructor(private props: CreateToolboxOpts, private client: Pickaxe) {
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

  async pickAndRun(ctx: DurableContext<any>, {prompt, maxTools}: PickInput) {
    const result = await this.pick(ctx, {prompt, maxTools});

    const results = await ctx.bulkRunChildren(result.map((step) => ({
      workflow: step.name,
      input: step.input,
    })));


    //

    return results.map((result) => result);
  }

  /**
   * Gets the original tool declarations (used internally by pick-tool)
   */
  getTools(): ReadonlyArray<ToolDeclaration<any, any>> {
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
