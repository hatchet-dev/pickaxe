import { z } from "zod";
import { generateText } from "ai";
import { zodSchema } from "ai";
import { DurableContext, TaskWorkflowDeclaration } from "@hatchet-dev/typescript-sdk";
import { Pickaxe, Registerable } from "./pickaxe";

export interface ToolDeclaration<
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType
> extends TaskWorkflowDeclaration<z.infer<InputSchema>, z.infer<OutputSchema>> {
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  description: string;
}

export interface CreateToolboxProps {
  tools: ReadonlyArray<ToolDeclaration<any, any>> | ToolDeclaration<any, any>[];
}

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

export class Toolbox implements Registerable {
  toolset: SerializedToolSet;

  constructor(private props: CreateToolboxProps, private client: Pickaxe) {
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

  get register(): TaskWorkflowDeclaration<any, any>[] {
    return [...this.props.tools, pickToolFactory(this.client)];
  }

  async pick(ctx: DurableContext<any>, {prompt, maxTools}: PickInput) {
    const result = await ctx.runChild(pickToolFactory(this.client), { prompt, toolset: this.toolset, maxTools });
    return result.steps;
  }

  // async pickRun(
  //   ctx: DurableContext<any>, 
  //   {prompt, maxTools}: PickInput
  // ): Promise<any> {

  //   return resultMap;
  // }
}


type PickInputWithToolset = PickInput & {
  toolset: SerializedToolSet;
};

type PickOutput = {
  toolset: SerializedToolSet;
};

const pickToolFactory = (pickaxe: Pickaxe) => pickaxe.task({
  name: "pick-tool",
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
