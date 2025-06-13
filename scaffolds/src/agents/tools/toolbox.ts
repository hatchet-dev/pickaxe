import { z } from "zod";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { zodSchema } from "ai";
import { pickaxe } from "@/client";
import { ToolDeclaration } from "@hatchet-dev/pickaxe/src";

export interface ToolboxProps {
  tools: ToolDeclaration<any, any>[];
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
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: any; // TODO ReturnType<typeof zodToJsonSchema>;
  };
};

class Toolbox {
  toolset: SerializedToolSet;

  constructor(private props: ToolboxProps) {
    this.toolset = this.props.tools.reduce<SerializedToolSet>(
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

  get register() {
    return [...this.props.tools.map(({ name }) => name), pick];
  }

  async pick(prompt: string) {
    return pick.run({ prompt, toolset: this.toolset });
  }
}

type PickInput = {
  prompt: string;
  toolset: SerializedToolSet;
};

const pick = pickaxe.task({
  name: "pick",
  executionTimeout: "5m",
  fn: async (input: PickInput) => {
    console.log(JSON.stringify(input.toolset, null, 2));
    const { steps } = await generateText({
      model: openai("gpt-4o-mini"),
      tools: input.toolset,
      maxSteps: 5, // allow up to 5 steps
      prompt: input.prompt,
    });

    return { steps: steps.map((step) => step.toolCalls) };
  },
});

export const toolbox = (props: ToolboxProps) => {
  return new Toolbox(props);
};
