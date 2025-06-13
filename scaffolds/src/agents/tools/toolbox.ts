import { z } from "zod";
import { generateText } from "ai";
import { zodSchema } from "ai";
import { pickaxe } from "@/client";
import { ToolDeclaration, DurableContext, Registerable, TaskWorkflowDeclaration } from "@hatchet-dev/pickaxe/src";

export interface ToolboxProps {
  tools: ReadonlyArray<ToolDeclaration<any, any>> | ToolDeclaration<any, any>[];
}

// Create a type helper to extract output types from declarations
type InferToolOutputs<T> = T extends ReadonlyArray<infer U> | Array<infer U> 
  ? U extends ToolDeclaration<any, any>
    ? {
      [K in U['name']]?: U extends { name: K, outputSchema: z.ZodType<infer R> }
        ? R
        : never;
    }
    : never
  : never;

export type ToolSet = {
  [key: string]: {
    /**
  The schema of the input that the tool expects. The language model will use this to generate the input.
  It is also used to validate the output of the language model.
  Use descriptions to make the input understandable for the language model.
     */
    parameters: z.ZodType;
    /**
An optional description of what the tool does.
Will be used by the language model to decide whether to use the tool.
Not used for provider-defined tools.
   */
    description?: string;
  };
};

type SerializedToolSet = {
  [key: string]: {
    typeName: string;
    description?: string;
    parameters: any;
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

class Toolbox implements Registerable {
  toolset: SerializedToolSet;

  constructor(private props: ToolboxProps) {
    this.toolset = Array.from(this.props.tools).reduce<SerializedToolSet>(
      (acc, { name, description, inputSchema }) => {
        return {
          ...acc,
          [name]: {
            typeName: name,
            description: description,
            parameters: zodSchema(inputSchema),
          },
        };
      },
      {}
    );
  }

  register(): TaskWorkflowDeclaration<any, any>[] {
    return [...this.props.tools, pick];
  }

  async pick(ctx: DurableContext<any>, {prompt, maxTools}: PickInput) {
    const result = await ctx.runChild(pick, { prompt, toolset: this.toolset, maxTools });
    return result.steps;
  }

  async pickRun(
    ctx: DurableContext<any>, 
    {prompt, maxTools}: PickInput
  ): Promise<InferToolOutputs<typeof this.props.tools>> {
    const result = await ctx.runChild(pick, { prompt, toolset: this.toolset, maxTools });

    const toolResults = await ctx.bulkRunChildren(result.steps.map((step) => {
      const toolCall = step[0];
      return {
        workflow: toolCall.toolName,
        input: toolCall.args,
      };
    }));

    // Create a map of tool names to their results
    const resultMap = {} as InferToolOutputs<typeof this.props.tools>;
    toolResults.forEach((result) => {
      const toolCall = result.steps[0][0];
      resultMap[toolCall.toolName as keyof InferToolOutputs<typeof this.props.tools>] = result;
    });

    return resultMap;
  }
}


type PickInputWithToolset = PickInput & {
  toolset: SerializedToolSet;
};

type PickOutput = {
  toolset: SerializedToolSet;
};

const pick = pickaxe.task({
  name: "pick",
  executionTimeout: "5m",
  fn: async (input: PickInputWithToolset) => {
    console.log(JSON.stringify(input.toolset, null, 2));
    const { steps } = await generateText({
      model: pickaxe.defaultLanguageModel,
      tools: input.toolset,
      maxSteps: input.maxTools ?? 1,
      prompt: input.prompt,
    });

    return { steps: steps.map((step) => step.toolCalls) };
  },
});

export const toolbox = (props: ToolboxProps) => {
  return new Toolbox(props);
};
