import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { generateText } from "ai";

export const oneTool = pickaxe.tool({
  name: "one-tool",
  description: "A tool that returns 1",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    oneOutput: z.boolean(),
  }),
  fn: async (input) => {

    // Make an LLM call to get the oneOutput
    const oneOutput = await generateText({
      model: pickaxe.defaultLanguageModel,
      prompt: `Is the following text about an animal? If so, return "yes", otherwise return "no": ${input.message}`,
    });

    return {
      oneOutput: oneOutput.text === "yes",
    };
  },
});